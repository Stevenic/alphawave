import {
    ConversationHistory,
    FunctionRegistry,
    GPT3Tokenizer,
    GroupSection,
    Message,
    Prompt,
    PromptFunctions,
    PromptMemory,
    PromptSection,
    TemplateSection,
    TextSection,
    Tokenizer,
    Utilities,
    VolatileMemory
} from "promptrix";
import { AlphaWave, PromptCompletionModel, PromptResponse } from "alphawave";
import { StrictEventEmitter } from "strict-event-emitter-types";
import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { TaskResponse, AgentThought, Command } from "./types";
import { CommandSchema, SchemaBasedCommand } from "./SchemaBasedCommand";
import { AgentCommandSection } from "./AgentCommandSection";
import { AgentCommandValidator } from "./AgentCommandValidator";

export interface AgentOptions  {
    model: PromptCompletionModel;
    context_variable?: string;
    prompt: string|string[]|PromptSection;
    agent_variable?: string;
    functions?: PromptFunctions;
    history_variable?: string;
    initial_thought?: AgentThought;
    input_variable?: string;
    logRepairs?: boolean;
    max_history_messages?: number;
    max_repair_attempts?: number;
    max_steps?: number;
    memory?: PromptMemory;
    retry_invalid_responses?: boolean;
    step_delay?: number;
    tokenizer?: Tokenizer;
}

export interface ConfiguredAgentOptions {
    agent_variable: string;
    model: PromptCompletionModel;
    context_variable: string;
    functions: PromptFunctions;
    history_variable: string;
    initial_thought: AgentThought | undefined;
    input_variable: string;
    logRepairs: boolean;
    max_history_messages: number;
    max_repair_attempts: number;
    max_steps: number;
    memory: PromptMemory;
    prompt: string|string[]|PromptSection;
    retry_invalid_responses: boolean;
    step_delay: number;
    tokenizer: Tokenizer;
}

export interface AgentCommandInput {
    agentId: string;
    input: string;
}

export interface AgentState {
    totalSteps: number;
    context?: string;
    child?: {
        agentId: string;
        title: string;
    };
}


export interface AgentEvents {
    newThought: (thought: AgentThought) => void;
    beforeCommand: (command: Command, input: Record<string, any>) => void;
    afterCommand: (command: Command, input: Record<string, any>, response: any) => void;
}

export type AgentEmitter = StrictEventEmitter<EventEmitter, AgentEvents>;

export class Agent extends SchemaBasedCommand<AgentCommandInput> {
    private readonly _commands: Map<string, Command> = new Map();
    private readonly _options: ConfiguredAgentOptions;
    private readonly _events: AgentEmitter = new EventEmitter() as AgentEmitter;

    public constructor(options: AgentOptions, title?: string, description?: string) {
        super(AgentCommandSchema, title, description);
        this._options = Object.assign({
            agent_variable: 'agent',
            context_variable: 'context',
            functions: new FunctionRegistry(),
            history_variable: 'history',
            input_variable: 'input',
            logRepairs: false,
            max_history_messages: 10,
            max_repair_attempts: 3,
            max_steps: 5,
            memory: new VolatileMemory(),
            retry_invalid_responses: false,
            step_delay: 0,
            tokenizer: new GPT3Tokenizer(),
        }, options) as ConfiguredAgentOptions;
    }

    public get events(): AgentEmitter {
        return this._events;
    }

    public get functions(): PromptFunctions {
        return this._options.functions;
    }

    public get memory(): PromptMemory {
        return this._options.memory;
    }

    public get options(): ConfiguredAgentOptions {
        return this._options;
    }

    public get model(): PromptCompletionModel {
        return this._options.model;
    }

    public get tokenizer(): Tokenizer {
        return this._options.tokenizer;
    }

    // Command management

    public addCommand(command: Command): this {
        if (this._commands.has(command.title)) {
            throw new Error(`A command with the title "${command.title}" already exists.`);
        }
        this._commands.set(command.title, command);
        return this;
    }

    public getCommand(title: string): Command|undefined {
        return this._commands.get(title);
    }

    public hasCommand(title: string): boolean {
        return this._commands.has(title);
    }

    // Task execution

    public async completeTask(input?: string, agentId?: string, executeInitialThought: boolean = false): Promise<TaskResponse> {
        // Initialize the input to the next step
        let stepInput = input ?? this.memory.get(this.options.input_variable);

        // Dispatch to child agent if needed
        let step = 0;
        const state = this.getAgentState(agentId);
        if (state.child) {
            const childAgent = this.getCommand(state.child.title) as Agent;
            const response = await childAgent.completeTask(input, state.child.agentId);
            if (response.status !== 'success') {
                return response;
            }

            // Delete child and save state
            delete state.child;
            this.setAgentState(state, agentId);

            // Use agents response as input to the next step
            // We don't know how many steps the child agent took, so we'll just assume it took one
            stepInput = response.message;
            step = 1;
            executeInitialThought = false;
        }

        // Start main task loop
        while (step < this.options.max_steps) {
            // Wait for step delay
            if (step > 0 && this.options.step_delay > 0) {
                await new Promise(resolve => setTimeout(resolve, this.options.step_delay));
            }

            // Execute next step
            const result = await this.executeNextStep(stepInput, agentId, executeInitialThought);
            if (typeof result === 'string') {
                stepInput = result;
            } else {
                return result;
            }

            step++;
            executeInitialThought = false;
        }

        // Return too many steps
        return {
            type: "TaskResponse",
            status: "too_many_steps",
            message: "The current task has taken too many steps."
        };
    }

    // Agent as Commands

    public execute(input: AgentCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<TaskResponse> {
        // Initialize the agents state
        const agentId = input.agentId;
        const state = this.getAgentState(agentId);
        state.context = input.input;
        this.setAgentState(state, agentId);

        // Start the task
        return this.completeTask(undefined, agentId, true);
    }

    public getAgentState(agentId?: string): AgentState {
        const key = agentId ? `${this.options.agent_variable}-${agentId}` : this.options.agent_variable;
        const state = this.memory.get(key) ?? {};
        if (state.totalSteps === undefined) {
            state.totalSteps = 0;
        }
        return state;
    }

    public setAgentState(state: AgentState, agentId?: string): void {
        const key = agentId ? `${this.options.agent_variable}-${agentId}` : this.options.agent_variable;
        this.memory.set(key, state);
    }

    public getAgentHistoryVariable(agentId?: string): string {
        return agentId ? `${this.options.history_variable}-${agentId}` : this.options.history_variable;
    }

    private async executeNextStep(input?: string, agentId?: string, executeInitialThought: boolean = false): Promise<TaskResponse|string> {
        try {
            const state = this.getAgentState(agentId);

            // Create agents prompt section
            let agent_prompt: PromptSection;
            if (Array.isArray(this._options.prompt)) {
                agent_prompt = new TemplateSection(this._options.prompt.join('\n'), 'system');
            } else if (typeof this._options.prompt === 'object') {
                agent_prompt = this._options.prompt as PromptSection;
            } else {
                agent_prompt = new TemplateSection(this._options.prompt, 'system');
            }

            // Ensure the context variable is set
            this.memory.set(this.options.context_variable, state.context);

            // Create prompt
            const history_variable = this.getAgentHistoryVariable(agentId);
            const sections: PromptSection[] = [agent_prompt];
            sections.push(new AgentCommandSection(this._commands));
            sections.push(PromptInstructionSection);
            const prompt = new Prompt([
                new GroupSection(sections, 'system'),
                new ConversationHistory(history_variable, 1.0, true)
            ]);
            if (input) {
                prompt.sections.push(new TextSection(input, 'user', -1, true, '\n', 'user: '));

                // Ensure input variable is set otherwise the history will be wrong.
                this.memory.set(this.options.input_variable, input);
            }

            let response: PromptResponse;
            if (executeInitialThought && this._options.initial_thought) {
                // Just use initial thought as response
                // - This is used when agents are being called as commands.
                response = {
                    status: 'success',
                    message: { role: 'assistant', content: this._options.initial_thought } as Message<AgentThought>
                };
            } else {
                // Add initial thought to history
                if (state.totalSteps == 0 && this._options.initial_thought) {
                    const history: Message[] = this.memory.get(history_variable) ?? [];
                    history.push({ role: 'assistant', content: JSON.stringify(this._options.initial_thought) });
                    this.memory.set(history_variable, history);
                }

                // Create command validator
                const validator = new AgentCommandValidator(this._commands);

                // Create a wave for the prompt
                const wave = new AlphaWave({
                    model: this._options.model,
                    prompt: prompt,
                    functions: this._options.functions,
                    history_variable: history_variable,
                    input_variable: this._options.input_variable,
                    max_history_messages: this._options.max_history_messages,
                    max_repair_attempts: this._options.max_repair_attempts,
                    memory: this._options.memory,
                    tokenizer: this._options.tokenizer,
                    logRepairs: this._options.logRepairs,
                    validator: validator
                });

                // Complete the prompt
                let maxAttempts = this._options.retry_invalid_responses ? 2 : 1;
                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    response = await wave.completePrompt();
                    if (response.status != 'invalid_response') {
                        break;
                    }
                }

                // Ensure response succeeded
                if (response!.status !== 'success') {
                    return {
                        type: "TaskResponse",
                        status: response!.status,
                        message: response!.message as string
                    };
                }
            }

            // Get agents thought and execute command
            const message: Message<AgentThought> = response!.message as Message<AgentThought>;
            const thought = message.content!;
            this._events.emit('newThought', thought);
            const result = await this.executeCommand(state, thought);

            // Check for task result and error
            const taskResponse: TaskResponse|undefined = typeof result === 'object' && result.type == 'TaskResponse' ? result : undefined;
            if (taskResponse) {
                switch (taskResponse.status) {
                    case 'error':
                    case 'invalid_response':
                    case 'rate_limited':
                    case 'too_many_steps':
                    case 'too_long':
                        return taskResponse;
                }
            }

            // // Update history
            // const history: Message[] = this.memory.get(history_variable) ?? [];
            // if (input) {
            //     history.push({ role: 'user', content: input });
            // }
            // history.push({ role: 'assistant', content: JSON.stringify(thought) });
            // this.memory.set(history_variable, history);

            // Save the agents state
            state.totalSteps += 1;
            this.setAgentState(state, agentId);

            // Return result
            return taskResponse ? taskResponse : Utilities.toString(this.tokenizer, result);
        } catch (err: unknown) {
            return {
                type: "TaskResponse",
                status: "error",
                message: (err as any).toString()
            };
        }
    }

    private async executeCommand(state: AgentState, thought: AgentThought): Promise<any> {
        // Get command
        const command = this._commands.get(thought.command.name) as Command;
        const input = thought.command.input ?? {};
        if (command instanceof Agent) {
            // Pass control to child agent
            const agentId = uuidv4();
            const childAgent = command as Agent;
            this.events.emit('beforeCommand', childAgent, input['input']);
            const response = await childAgent.execute(input['input'], this.memory, this.functions, this.tokenizer);
            this.events.emit('afterCommand', childAgent, input['input'], response);
            switch (response.status) {
                case 'success':
                    // Just return the response message since agent completed without additional input
                    return response.message;
                case 'input_needed':
                    // Remember that we're talking to the agent
                    state.child = {
                        title: thought.command.name,
                        agentId: agentId
                    };
                    return response;
                default:
                    // Return the response since the agent failed
                    return response;
            }
        } else {
            // Execute command and return result
            this.events.emit('beforeCommand', command, input);
            const response = await command.execute(input, this.memory, this.functions, this.tokenizer);
            this.events.emit('afterCommand', command, input, response);
            return response;
        }
    }
}

const AgentCommandSchema: CommandSchema = {
    type: "object",
    title: "Agent",
    description: "an agent that can perform a task",
    properties: {
        input: {
            type: "string",
            description: "input for command",
        }
    },
    required: ["input"]
};

const PromptInstructionSection = new TextSection([
    `Return a JSON object with your thoughts and the next command to perform`,
    `Only respond with the JSON format below and based your plan on the commands above`,
    `Response Format:`,
    `{"thoughts":{"thought":"<your current thought>","reasoning":"<self reflect on why you made this decision>","plan":"- short bulleted\\n- list that conveys\\n- long-term plan"},"command":{"name":"<command name>","input":{"<name>":"<value>"}}}`
].join('\n'), 'system');
import { FunctionRegistry, GPT3Tokenizer, PromptFunctions, PromptMemory, PromptSection, Tokenizer, VolatileMemory } from "promptrix";
import { AlphaWave, JSONResponseValidator, PromptCompletionClient, PromptCompletionOptions, PromptResponse, ResponseValidation, PromptResponseValidator } from "alphawave";
import { TaskResponse, AgentThoughts, Command } from "./types";
import { Schema } from "jsonschema";

export interface AgentOptions  {
    client: PromptCompletionClient;
    prompt: PromptSection;
    prompt_options: PromptCompletionOptions;
    functions?: PromptFunctions;
    history_variable?: string;
    input_variable?: string;
    max_history_messages?: number;
    max_repair_attempts?: number;
    max_steps?: number;
    memory?: PromptMemory;
    step_delay?: number;
    tokenizer?: Tokenizer;
}

export interface ConfiguredAgentOptions {
    client: PromptCompletionClient;
    history_variable: string;
    input_variable: string;
    functions: PromptFunctions;
    max_history_messages: number;
    max_repair_attempts: number;
    max_steps: number;
    memory: PromptMemory;
    prompt: PromptSection;
    prompt_options: PromptCompletionOptions;
    step_delay: number;
    tokenizer: Tokenizer;
}

/*
export class Agent implements PromptResponseValidator {
    private readonly _commands: Map<string, Command> = new Map();

    public readonly options: ConfiguredAgentOptions;

    public constructor(options: AgentOptions) {
        this.options = Object.assign({
            functions: new FunctionRegistry(),
            history_variable: 'history',
            input_variable: 'input',
            max_history_messages: 10,
            max_repair_attempts: 3,
            max_steps: 5,
            memory: new VolatileMemory(),
            step_delay: 0,
            tokenizer: new GPT3Tokenizer()
        }, options) as ConfiguredAgentOptions;
    }

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

    public async completeTask(input?: string): Promise<TaskResponse> {
        // Start main task loop
        let step = 0;
        while (step < this.options.max_steps) {
        }

        // Return too many steps
        return {
            type: "TaskResponse",
            status: "too_many_steps",
            message: "The current task has taken too many steps."
        };
    }
}

const agentThoughtsSchema: Schema = {
    type: "object",
    properties: {
        thoughts: {
            type: "object",
            properties: {
                thought: {
                    type: "string"
                },
                reasoning: {
                    type: "string"
                },
                plan: {
                    type: "string"
                }
            },
            required: ["thought", "reasoning", "plan"]
        },
        command: {
            type: "object",
            properties: {
                name: {
                    type: "string"
                },
                input: {
                    type: "object"
                }
            },
            required: ["name", "input"]
        }
    },
    required: ["thoughts", "command"]
};
*/
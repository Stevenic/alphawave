import { ConversationHistory, FunctionRegistry, GPT3Tokenizer, Message, Prompt, PromptFunctions, PromptMemory, PromptSection, Tokenizer, VolatileMemory } from "promptrix";
import { StrictEventEmitter } from "strict-event-emitter-types";
import { EventEmitter } from "events";
import { PromptCompletionClient, PromptCompletionOptions, PromptResponse, Validation, PromptResponseValidator } from "./types";
import { DefaultResponseValidator } from "./DefaultResponseValidator";
import { MemoryFork } from "./MemoryFork";
import { Colorize } from "./internals";


export interface AlphaWaveOptions {
    client: PromptCompletionClient;
    prompt: PromptSection;
    prompt_options: PromptCompletionOptions;
    functions?: PromptFunctions;
    history_variable?: string;
    input_variable?: string;
    max_history_messages?: number;
    max_repair_attempts?: number;
    memory?: PromptMemory;
    tokenizer?: Tokenizer;
    validator?: PromptResponseValidator;
    logRepairs?: boolean;
}

export interface ConfiguredAlphaWaveOptions {
    client: PromptCompletionClient;
    history_variable: string;
    input_variable: string;
    functions: PromptFunctions;
    max_history_messages: number;
    max_repair_attempts: number;
    memory: PromptMemory;
    prompt: PromptSection;
    prompt_options: PromptCompletionOptions;
    tokenizer: Tokenizer;
    validator: PromptResponseValidator;
    logRepairs: boolean;
}

export interface AlphaWaveEvents {
    beforePrompt: (memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, prompt: PromptSection, prompt_options: PromptCompletionOptions) => void;
    afterPrompt: (memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, prompt: PromptSection, prompt_options: PromptCompletionOptions, response: PromptResponse) => void;
    beforeValidation: (memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse, remaining_attempts: number) => void;
    afterValidation: (memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse, remaining_attempts: number, validation: Validation) => void;
    beforeRepair: (memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse, remaining_attempts: number, validation: Validation) => void;
    nextRepair: (memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse, remaining_attempts: number, validation: Validation) => void;
    afterRepair: (memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse, remaining_attempts: number, validation: Validation) => void;
}

export type AlphaWaveEmitter = StrictEventEmitter<EventEmitter, AlphaWaveEvents>;

export class AlphaWave extends (EventEmitter as { new(): AlphaWaveEmitter }) {
    public readonly options: ConfiguredAlphaWaveOptions;

    public constructor(options: AlphaWaveOptions) {
        super();
        this.options = Object.assign({
            functions: new FunctionRegistry(),
            history_variable: 'history',
            input_variable: 'input',
            max_history_messages: 10,
            max_repair_attempts: 3,
            memory: new VolatileMemory(),
            tokenizer: new GPT3Tokenizer(),
            validator: new DefaultResponseValidator(),
            logRepairs: false
        }, options) as ConfiguredAlphaWaveOptions;
    }

    public async completePrompt(input?: string): Promise<PromptResponse> {
        const { client, prompt, prompt_options, memory, functions, tokenizer, validator, max_repair_attempts, history_variable, input_variable } = this.options;

        // Update/get user input
        if (input_variable) {
            if (input) {
                memory.set(input_variable, input);
            } else {
                input = memory.has(input_variable) ? memory.get(input_variable) : ''
            }
        } else if (!input) {
            input = '';
        }

        try {
            // Ask client to complete prompt
            this.emit('beforePrompt', memory, functions, tokenizer, prompt, prompt_options);
            const response = await client.completePrompt(memory, functions, tokenizer, prompt, prompt_options);
            this.emit('afterPrompt', memory, functions, tokenizer, prompt, prompt_options, response);
            if (response.status !== 'success') {
                return response;
            }

            // Ensure response is a message
            if (typeof response.message !== 'object') {
                response.message = { role: 'assistant', content: response.message ?? '' };
            }

            // Validate response
            this.emit('beforeValidation', memory, functions, tokenizer, response, max_repair_attempts);
            const validation = await validator.validateResponse(memory, functions, tokenizer, response, max_repair_attempts);
            this.emit('afterValidation', memory, functions, tokenizer, response, max_repair_attempts, validation);
            if (validation.valid) {
                // Update content
                if (validation.hasOwnProperty('value')) {
                    response.message.content = validation.value;
                }

                // Update history and return
                this.addInputToHistory(memory, history_variable, input!);
                this.addResponseToHistory(memory, history_variable, response.message);
                return response;
            }

            // Fork the conversation history
            const fork = new MemoryFork(memory);

            // Log repair attempts
            if (this.options.logRepairs) {
                console.log(Colorize.title('REPAIRING RESPONSE:'));
                console.log(Colorize.output(response.message.content));
            }

            // Attempt to repair response
            this.emit('beforeRepair', fork, functions, tokenizer, response, max_repair_attempts, validation);
            const repair = await this.repairResponse(fork, functions, tokenizer, response, validation, max_repair_attempts);
            this.emit('afterRepair', fork, functions, tokenizer, response, max_repair_attempts, validation);

            // Log repair success
            if (this.options.logRepairs) {
                if (repair.status === 'success') {
                    console.log(Colorize.success('Response Repaired'));
                } else {
                    console.log(Colorize.error('Response Repair Failed'));
                }
            }

            // Update history with repaired response if successful.
            // - conversation history will be left unchanged if the repair failed.
            // - we never want to save an invalid response to conversation history.
            // - the caller can take further corrective action, including simply re-trying.
            if (repair.status === 'success') {
                this.addInputToHistory(memory, history_variable, input!);
                this.addResponseToHistory(memory, history_variable, repair.message as Message);
            }

            return repair;
        } catch (err: unknown) {
            return {
                status: 'error',
                message: err instanceof Error ? err.message : `${err}`
            };
        }
    }

    private addInputToHistory(memory: PromptMemory, variable: string, input: string): void {
        if (variable && input.length > 0) {
            const history: Message[] = memory.get(variable) ?? [];
            history.push({ role: 'user', content: input });
            if (history.length > this.options.max_history_messages) {
                history.splice(0, history.length - this.options.max_history_messages);
            }
            memory.set(variable, history);
        }
    }

    private addResponseToHistory(memory: PromptMemory, variable: string, message: Message): void {
        if (variable) {
            const history: Message[] = memory.get(variable) ?? [];
            history.push(message);
            if (history.length > this.options.max_history_messages) {
                history.splice(0, history.length - this.options.max_history_messages);
            }
            memory.set(variable, history);
        }
    }

    private async repairResponse(fork: MemoryFork, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse, validation: Validation, remaining_attempts: number): Promise<PromptResponse> {
        const { client, prompt, prompt_options, input_variable, validator } = this.options;

        // Are we out of attempts?
        const feedback = validation.feedback ?? 'The response was invalid. Try another strategy.';
        if (remaining_attempts <= 0) {
            return {
                status: 'invalid_response',
                message: feedback
            };
        }

        // Add response and feedback to repair history
        this.addResponseToHistory(fork, `${this.options.history_variable}-repair`, response.message as Message);
        this.addInputToHistory(fork, `${this.options.history_variable}-repair`, feedback);

        // Append repair history to prompt
        const repairPrompt = new Prompt([
            prompt,
            new ConversationHistory(`${this.options.history_variable}-repair`)
        ]);

        // Log the repair
        if (this.options.logRepairs) {
            console.log(Colorize.value('feedback', feedback));
        }

        // Ask client to complete prompt
        this.emit('beforePrompt', fork, functions, tokenizer, prompt, prompt_options);
        const repairResponse = await client.completePrompt(fork, functions, tokenizer, repairPrompt, prompt_options);
        this.emit('afterPrompt', fork, functions, tokenizer, prompt, prompt_options, repairResponse);
        if (repairResponse.status !== 'success') {
            return repairResponse;
        }

        // Ensure response is a message
        if (typeof repairResponse.message !== 'object') {
            repairResponse.message = { role: 'assistant', content: repairResponse.message ?? '' };
        }

        // Validate response
        this.emit('beforeValidation', fork, functions, tokenizer, repairResponse, remaining_attempts);
        validation = await validator.validateResponse(fork, functions, tokenizer, repairResponse, remaining_attempts);
        this.emit('afterValidation', fork, functions, tokenizer, repairResponse, remaining_attempts, validation);
        if (validation.valid) {
            // Update content
            if (validation.hasOwnProperty('value')) {
                repairResponse.message.content = validation.value;
            }

            return repairResponse;
        }

        // Try next attempt
        remaining_attempts--;
        this.emit('nextRepair', fork, functions, tokenizer, repairResponse, remaining_attempts, validation);
        return await this.repairResponse(fork, functions, tokenizer, repairResponse, validation, remaining_attempts);
    }
}
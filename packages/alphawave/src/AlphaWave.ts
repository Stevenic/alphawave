import { FunctionRegistry, GPT3Tokenizer, Message, PromptFunctions, PromptMemory, PromptSection, Tokenizer, VolatileMemory, Utilities } from "promptrix";
import { PromptCompletionClient, PromptCompletionOptions, PromptResponse, ResponseValidation, PromptResponseValidator } from "./types";
import { DefaultResponseValidator } from "./DefaultResponseValidator";
import { ConversationHistoryFork } from "./ConversationHistoryFork";


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
}

export class AlphaWave {
    public readonly options: ConfiguredAlphaWaveOptions;

    public constructor(options: AlphaWaveOptions) {
        this.options = Object.assign({
            functions: new FunctionRegistry(),
            history_variable: 'history',
            input_variable: 'input',
            max_history_messages: 10,
            max_repair_attempts: 3,
            memory: new VolatileMemory(),
            tokenizer: new GPT3Tokenizer(),
            validator: new DefaultResponseValidator()
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
            const response = await client.completePrompt(memory, functions, tokenizer, prompt, prompt_options);
            if (response.status !== 'success') {
                return response;
            }

            // Ensure response is a message
            if (typeof response.message !== 'object') {
                response.message = { role: 'assistant', content: response.message ?? '' };
            }

            // Validate response
            const validation = await validator.validateResponse(memory, functions, tokenizer, response);
            if (validation.valid) {
                // Update content
                if (validation.hasOwnProperty('content')) {
                    // TODO: Promptrix has an issue to change the content type to any
                    response.message.content = Utilities.toString(tokenizer, validation.content);
                }

                // Update history and return
                this.addInputToHistory(memory, history_variable, input!);
                this.addResponseToHistory(memory, history_variable, response.message);
                return response;
            }

            // Fork the conversation history and update the fork with the invalid response.
            const fork = new ConversationHistoryFork(memory, history_variable, input_variable);
            this.addInputToHistory(fork, history_variable, input!);
            this.addResponseToHistory(fork, history_variable, response.message);

            // Attempt to repair response
            const repair = await this.repairResponse(fork, functions, tokenizer, validation, max_repair_attempts);

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

    private async repairResponse(fork: ConversationHistoryFork, functions: PromptFunctions, tokenizer: Tokenizer, validation: ResponseValidation, remaining_attempts: number): Promise<PromptResponse> {
        const { client, prompt, prompt_options, input_variable, validator } = this.options;

        // Are we out of attempts?
        const feedback = validation.feedback ?? 'The response was invalid. Try another strategy.';
        if (remaining_attempts <= 0) {
            return {
                status: 'invalid_response',
                message: feedback
            };
        }

        // Update the input with the feedback message
        if (remaining_attempts == 1) {
            // Tell the model it's the last try so think in steps.
            fork.set(input_variable, `${feedback} Last try so think step by step.`);
        } else {
            fork.set(input_variable, feedback);
        }

        // Ask client to complete prompt
        const response = await client.completePrompt(fork, functions, tokenizer, prompt, prompt_options);
        if (response.status !== 'success') {
            return response;
        }

        // Ensure response is a message
        if (typeof response.message !== 'object') {
            response.message = { role: 'assistant', content: response.message ?? '' };
        }

        // Validate response
        validation = await validator.validateResponse(fork, functions, tokenizer, response);
        if (validation.valid) {
            // Update content
            if (validation.hasOwnProperty('content')) {
                // TODO: Promptrix has an issue to change the content type to any
                response.message.content = Utilities.toString(tokenizer, validation.content);
            }

            return response;
        }

        // Try next attempt
        return await this.repairResponse(fork, functions, tokenizer, validation, remaining_attempts - 1);
    }
}
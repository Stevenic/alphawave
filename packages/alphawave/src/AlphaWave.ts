import { FunctionRegistry, GPT3Tokenizer, Message, PromptFunctions, PromptMemory, PromptSection, Tokenizer, VolatileMemory } from "promptrix";
import { PromptCompletionClient, PromptCompletionOptions, PromptResponse, PromptResponseValidation, PromptResponseValidator } from "./types";
import { DefaultResponseValidator } from "./DefaultResponseValidator";
import { ConversationHistoryMemoryFork } from "./ConversationHistoryMemoryFork";


export interface AlphaWaveOptions {
    client: PromptCompletionClient;
    prompt: PromptSection;
    prompt_options: PromptCompletionOptions;
    functions?: PromptFunctions;
    memory?: PromptMemory;
    tokenizer?: Tokenizer;
    validator?: PromptResponseValidator;
    max_repair_attempts?: number;
    history_variable?: string;
    input_variable?: string;
}

export interface ConfiguredAlphaWaveOptions {
    client: PromptCompletionClient;
    prompt: PromptSection;
    prompt_options: PromptCompletionOptions;
    functions: PromptFunctions;
    memory: PromptMemory;
    tokenizer: Tokenizer;
    validator: PromptResponseValidator;
    max_repair_attempts: number;
    history_variable: string;
    input_variable: string;
}

export class AlphaWave {
    public readonly options: ConfiguredAlphaWaveOptions;

    public constructor(options: AlphaWaveOptions) {
        this.options = Object.assign({
            functions: new FunctionRegistry(),
            memory: new VolatileMemory(),
            tokenizer: new GPT3Tokenizer(),
            validator: new DefaultResponseValidator(),
            max_repair_attempts: 3,
            history_variable: 'history',
            input_variable: 'input'
        }, options) as ConfiguredAlphaWaveOptions;
    }

    public async completePrompt(): Promise<PromptResponse> {
        const { client, prompt, prompt_options, functions, memory, tokenizer, validator, max_repair_attempts, history_variable, input_variable } = this.options;

        try {
            // Get user input
            const input: string = input_variable && memory.has(input_variable) ? memory.get(input_variable) : '';

            // Ask client to complete prompt
            const result = await client.completePrompt(prompt, prompt_options);
            if (result.status !== 'success') {
                return result;
            }

            // Ensure response is a message
            if (typeof result.response !== 'object') {
                result.response = { role: 'assistant', content: result.response ?? '' };
            }

            // Validate response
            const validation = await validator.validateResponse(memory, functions, tokenizer, result);
            if (validation.isValid) {
                // Update history and return
                this.addInputToHistory(memory, history_variable, input);
                this.addResponseToHistory(memory, history_variable, result.response);
                return result;
            }

            // Fork the conversation history and update the fork with the invalid response.
            const fork = new ConversationHistoryMemoryFork(memory, history_variable, input_variable);
            this.addInputToHistory(fork, history_variable, input);
            this.addResponseToHistory(fork, history_variable, result.response);

            // Attempt to repair response
            const repair = await this.repairResponse(fork, functions, tokenizer, validation, max_repair_attempts);

            // Update history with repaired response if successful.
            // - conversation history will be left unchanged if the repair failed.
            // - we never want to save an invalid response to conversation history.
            // - the caller can take further corrective action, including simply re-trying.
            if (repair.status === 'success') {
                this.addInputToHistory(memory, history_variable, input);
                this.addResponseToHistory(memory, history_variable, repair.response as Message);
            }

            return repair;
        } catch (err: unknown) {
            return {
                status: 'error',
                response: err instanceof Error ? err.message : `${err}`
            };
        }
    }

    private addInputToHistory(memory: PromptMemory, variable: string, input: string): void {
        if (variable && input.length > 0) {
            const history: Message[] = memory.get(variable) ?? [];
            history.push({ role: 'user', content: input });
            memory.set(variable, history);
        }
    }

    private addResponseToHistory(memory: PromptMemory, variable: string, message: Message): void {
        if (variable) {
            const history: Message[] = memory.get(variable) ?? [];
            history.push(message);
            memory.set(variable, history);
        }
    }

    private async repairResponse(fork: ConversationHistoryMemoryFork, functions: PromptFunctions, tokenizer: Tokenizer, validation: PromptResponseValidation, remaining_attempts: number): Promise<PromptResponse> {
        const { client, prompt, prompt_options, history_variable, input_variable, validator } = this.options;

        // Are we out of attempts?
        const feedback = validation.feedback ?? 'The response was invalid. Try another strategy.';
        if (remaining_attempts <= 0) {
            return {
                status: 'invalid_response',
                response: feedback
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
        const result = await client.completePrompt(prompt, prompt_options);
        if (result.status !== 'success') {
            return result;
        }

        // Ensure response is a message
        if (typeof result.response !== 'object') {
            result.response = { role: 'assistant', content: result.response ?? '' };
        }

        // Validate response
        validation = await validator.validateResponse(fork, functions, tokenizer, result);
        if (validation.isValid) {
            return result;
        }

        // Try next attempt
        return await this.repairResponse(fork, functions, tokenizer, validation, remaining_attempts - 1);
    }
}
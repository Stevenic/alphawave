import { FunctionRegistry, GPT3Tokenizer, Message, PromptFunctions, PromptMemory, PromptSection, Tokenizer, VolatileMemory } from "promptrix";
import { PromptCompletionClient, PromptCompletionOptions, PromptResponse, PromptResponseValidator } from "./types";
import { DefaultResponseValidator } from "./DefaultResponseValidator";


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
            // Get user input and add to history
            const input = memory.get(input_variable);
            this.addInputToHistory(input, history_variable);

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
                this.addResponseToHistory(result.response, history_variable);
                return result;
            }

            // Attempt to repair response
            return {
                status: 'invalid_response',
                response: result.response
            };
        } catch (err: unknown) {
            return {
                status: 'error',
                response: err instanceof Error ? err.message : `${err}`
            };
        }
    }

    private addInputToHistory(input: string, variable: string): void {
        if (input && variable) {
            const history: Message[] = this.options.memory.get(variable) ?? [];
            history.push({ role: 'user', content: input });
            this.options.memory.set(variable, history);
        }
    }

    private addResponseToHistory(response: Message, variable: string): void {

    }
}
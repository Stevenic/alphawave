import Anthropic from '@anthropic-ai/sdk';
import { PromptFunctions, PromptMemory, PromptSection, Tokenizer } from "promptrix";
import { PromptCompletionModel, PromptResponse, PromptResponseDetails, PromptResponseFinishReason } from "./types";

/**
 * Options to configure an `AnthropicModel`.
 */
export interface AnthropicModelOptions {
    /**
     * API key to use when calling the model.
     */
    apiKey: string;

    /**
     * Name of the model to use when completing prompts.
     */
    model: string;

    /**
     * Optional. Base URL to use when calling the API.
     */
    baseURL?: string;

    /**
     * Optional. Maximum number of tokens to let the prompt use when rendering.
     */
    max_input_tokens?: number;

    /**
     * Optional. Maximum number of tokens to generate for a completion.
     */
    max_tokens?: number;

    /**
     * Optional. Sampling temperature to use, between `0` and `1`.
     */
    temperature?: number;

    /**
     * Optional. The maximum cumulative probability of tokens to consider when sampling.
     */
    top_p?: number;

    /**
     * Optional. The maximum number of tokens to consider when sampling.
     */
    top_k?: number;

    /**
     * Optional. Stop sequences to use when generating completions.
     */
    stop_sequence?: Array<string>;

    /**
     * Optional. Maximum number of retries to attempt when a request fails.
     */
    maxRetries?: number;

    /**
     * Optional. Whether to log requests to the console.
     * @remarks
     * This is useful for debugging prompts and defaults to `false`.
     */
    logRequests?: boolean;
}

/**
 * A `PromptCompletionModel` that uses the Anthropic API to complete prompts.
 */
export class AnthropicModel implements PromptCompletionModel {
    private readonly anthropic: Anthropic;

    /**
     * Creates a new `AnthropicModel` instance.
     * @param options Options to configure the model with.
     */
    public constructor(options: AnthropicModelOptions) {
        this.options = Object.assign({
            retryPolicy: [2000, 5000],
            retryConnectionReset: true
        }, options);
        this.anthropic = new Anthropic({
            apiKey: this.options.apiKey,
            baseURL: this.options.baseURL,
            maxRetries: this.options.maxRetries
        });
    }

    /**
     * Options the model was configured with.
     */
    public readonly options: AnthropicModelOptions;

    /**
     * Completes a prompt.
     * @param memory Memory to use when rendering the prompt.
     * @param functions Functions to use when rendering the prompt.
     * @param tokenizer Tokenizer to use when rendering the prompt.
     * @param prompt Prompt to complete.
     * @returns A `PromptResponse` with the status and message.
     */
    public async completePrompt(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, prompt: PromptSection): Promise<PromptResponse> {
        const startTime = Date.now();
        const max_input_tokens = this.options.max_input_tokens ?? 1024;

        // Render prompt
        const result = await prompt.renderAsMessages(memory, functions, tokenizer, max_input_tokens);
        if (result.tooLong) {
            return {
                status: 'too_long',
                prompt: result.output,
                error: `The generated chat completion prompt had a length of ${result.length} tokens which exceeded the max_input_tokens of ${max_input_tokens}.`
            };
        }

        if (this.options.logRequests) {
            console.log('CHAT PROMPT:', result.output);
        }

        // Separate system and other messages
        const system_messages = result.output.filter(message => message.role === 'system');
        const messages = result.output.filter(message => message.role !== 'system').map(message => {
            return { content: message.content ?? '', role: message.role } as Anthropic.MessageParam;
        });

        // Call chat completion API
        try {
            const response = await this.anthropic.messages.create({
                max_tokens: this.options.max_tokens ?? 1000,
                messages,
                system: system_messages.length > 0 ? system_messages[0].content ?? '' : undefined,
                model: this.options.model,
                temperature: this.options.temperature,
                top_p: this.options.top_p,
                top_k: this.options.top_k,
                stop_sequences: this.options.stop_sequence
            });

            const request_duration = Date.now() - startTime;
            if (this.options.logRequests) {
                console.log('CHAT RESPONSE:', response);
                console.log('duration:', request_duration, 'ms');
            }

            // Extract text output from response
            const content = response.content.filter((block) => block.type == 'text').map((block) => (block as Anthropic.TextBlock).text).join('\n\n');

            // Map finish reason
            let finish_reason: PromptResponseFinishReason;
            switch (response.stop_reason) {
                case 'stop_sequence':
                case 'end_turn':
                    finish_reason = 'stop';
                    break;
                case 'max_tokens':
                    finish_reason = 'length';
                    break;
                case 'tool_use':
                    finish_reason = 'function_call';
                    break;
                default:
                    finish_reason = 'other';
                    break;
            }

            // Process response
            const { input_tokens, output_tokens } = response.usage;
            const total_tokens = input_tokens + output_tokens;
            const details: PromptResponseDetails = {
                finish_reason,
                completion_tokens: output_tokens,
                prompt_tokens: input_tokens,
                total_tokens,
                tokens_per_second: total_tokens / (request_duration / 1000),
                request_duration,
            };

            return {
                status: 'success',
                prompt: result.output,
                message: { role: 'assistant', content },
                details
            };
        } catch (err: unknown) {
            if (err instanceof Anthropic.APIError) {
                if (err.status === 429) {
                    return {
                        status: 'rate_limited',
                        prompt: result.output,
                        error: `The chat completion API returned a rate limit error.`
                    };
                } else {
                    return {
                        status: 'error',
                        prompt: result.output,
                        error: `The chat completion API returned an error status of ${err.status}: ${err.message}`
                    };
                }
            } else {
                return {
                    status: 'error',
                    prompt: result.output,
                    error: `An unexpected error occurred while calling the chat completion API: ${err}`
                };
            }
        }
    }
}
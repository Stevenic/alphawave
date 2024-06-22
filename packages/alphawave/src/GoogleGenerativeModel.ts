import { PromptFunctions, PromptMemory, PromptSection, Tokenizer } from "promptrix";
import { PromptCompletionModel, PromptResponse, PromptResponseDetails, PromptResponseFinishReason } from "./types";
import { Content, FinishReason, GoogleGenerativeAI, GoogleGenerativeAIFetchError, RequestOptions } from "@google/generative-ai";
import { Colorize } from "./internals";

/**
 * Options to configure a `GoogleGenerativeModel`.
 */
export interface GoogleGenerativeModelOptions {
    /**
     * API key to use when calling the model.
     */
    apiKey: string;


    /**
     * Name of the model to use when completing prompts.
     */
    model: string;

    /**
     * Optional. Maximum number of tokens to let the prompt use when rendering.
     * @remarks
     * Defaults to `1024`.
     *
     * If the rendered prompt exceeds this limit, most `PromptCompletionClient` classes will return
     * a `response.status == 'too_long'`.
     */
    maxInputTokens?: number;

    /**
     * Optional. What sampling temperature to use, between `0` and `2`.
     * @remarks
     * Higher values like `0.8` will make the output more random, while lower values like `0.2` will
     * make it more focused and deterministic.
     *
     * It's generally recommended to use this or `top_p` but not both.
     */
    temperature?: number;

    /**
     * Optional. The maximum cumulative probability of tokens to consider when sampling.
     */
    topP?: number;

    /**
     * Optional. The maximum number of tokens to consider when sampling.
     */
    topK?: number;

    /**
     * Optional. The maximum number of tokens to generate for a completion.
     * @remarks
     * This value plus the `max_input_tokens` value cannot exceed the maximum number of tokens for
     * the models context window.
     */
    maxOuptputTokens?: number;

    /**
     * Optional. Up to 5 sequences where the API will stop generating further tokens.
     * @remarks
     * The returned text will not contain the stop sequence.
     */
    stopSequences?: Array<string> | string;

    /**
     * Optional. Additional options for each model request.
     */
    requestOptions?: RequestOptions;

    /**
     * Optional. Whether to log requests to the console.
     * @remarks
     * This is useful for debugging prompts and defaults to `false`.
     */
    logRequests?: boolean;
}

/**
 * A `PromptCompletionModel` for calling Google Generative AI models.
 * @remarks
 */
export class GoogleGenerativeModel implements PromptCompletionModel {
    private readonly _client: GoogleGenerativeAI;

    /**
     * Creates a new `GoogleGenerativeModel` instance.
     * @param options Options to configure the model with.
     */
    public constructor(options: GoogleGenerativeModelOptions) {
        this.options = options;
        this._client = new GoogleGenerativeAI(options.apiKey);
    }

    /**
     * Options the model was configured with.
     */
    public readonly options: GoogleGenerativeModelOptions;

    /**
     * Completes a prompt using the OpenAI API.
     * @remarks
     * The API used, Chat Completion or Text Completion, will be determined by the `this.options.completion_type` property.
     * @param memory Memory to use when rendering the prompt.
     * @param functions Functions to use when rendering the prompt.
     * @param tokenizer Tokenizer to use when rendering the prompt.
     * @param prompt Prompt to complete.
     * @returns A `PromptResponse` with the status and message.
     */
    public async completePrompt(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, prompt: PromptSection): Promise<PromptResponse> {
        const startTime = Date.now();
        const maxInputTokens = this.options.maxInputTokens ?? 1024;

        // Render prompt
        const result = await prompt.renderAsMessages(memory, functions, tokenizer, maxInputTokens);
        if (result.tooLong) {
            return { 
                status: 'too_long',
                prompt: result.output, 
                error: `The generated chat completion prompt had a length of ${result.length} tokens which exceeded the max_input_tokens of ${maxInputTokens}.` 
            };
        }
        if (this.options.logRequests) {
            console.log(Colorize.title('CHAT PROMPT:'));
            console.log(Colorize.output(result.output));
        }

        // Seperate messages from system instruction
        const systemInstruction = result.output.find(m => m.role == 'system');
        const contents: Content[] = result.output.filter(m => m.role != 'system').map(m => {
            // Convert role
            const role = m.role == 'user' ? 'user' : 'model';

            // Return content
            return {
                role,
                parts: [{ text: m.content! }]
            };
        });

        // Get model instance
        const model = this._client.getGenerativeModel({
            model: this.options.model,
            systemInstruction: systemInstruction?.content ?? undefined,
        }, this.options.requestOptions);

        // Call chat completion API
        try {
            const response = await model.generateContent({ contents });
            const request_duration = Date.now() - startTime;
            if (this.options.logRequests) {
                console.log(Colorize.title('CHAT RESPONSE:'));
                console.log(Colorize.value('duration', request_duration, 'ms'));
                console.log(Colorize.output(response.response));
            }

            // Process response
            const completion = response.response.text();
            let finish_reason: PromptResponseFinishReason =  'other';
            if (Array.isArray(response.response.candidates) && response.response.candidates.length > 0) {
                switch (response.response.candidates[0].finishReason) {
                    case FinishReason.STOP:
                        finish_reason = 'stop';
                        break;
                    case FinishReason.MAX_TOKENS:
                        finish_reason = 'length';
                        break;
                }
            }
            const usage = response.response.usageMetadata;
            let details: PromptResponseDetails  = {
                finish_reason,
                completion_tokens: usage?.candidatesTokenCount ?? -1,
                prompt_tokens: usage?.promptTokenCount ?? -1,
                total_tokens: usage?.totalTokenCount ?? -1,
                tokens_per_second: request_duration > 0 && usage?.totalTokenCount != undefined ? usage.totalTokenCount / (request_duration / 1000) : 0,
                request_duration,
            };
            return { 
                status: 'success',
                prompt: result.output, 
                message: { role: 'assistant', content: completion }, 
                details 
            };
        } catch (err: unknown) {
            if (err instanceof GoogleGenerativeAIFetchError) {
                if (err.status == 429) {
                    return { 
                        status: 'rate_limited',
                        prompt: result.output, 
                        error: `The chat completion API returned a rate limit error.` 
                    };
                } else {
                    return { 
                        status: 'error',
                        prompt: result.output, 
                        error: `The chat completion API returned an error: ${err.status} - ${err.statusText}` 
                    };
                }
            } else {
                return { 
                    status: 'error',
                    prompt: result.output, 
                    error: `An unknown error occurred: ${err}` 
                };
            }
        }
    }
}

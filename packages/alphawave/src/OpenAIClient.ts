import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { PromptFunctions, PromptMemory, PromptSection, Tokenizer } from "promptrix";
import { EmbeddingsClient, EmbeddingsResponse, PromptCompletionClient, PromptCompletionOptions, PromptResponse } from "./types";
import { ChatCompletionRequestMessage, CreateChatCompletionRequest, CreateChatCompletionResponse, CreateCompletionRequest, CreateCompletionResponse, CreateEmbeddingRequest, CreateEmbeddingResponse } from "./internals";
import { Colorize } from "./internals";

/**
 * Options for configuring an `OpenAIClient`.
 */
export interface OpenAIClientOptions {
    /**
     * API key to use when calling the OpenAI API.
     * @remarks
     * A new API key can be created at https://platform.openai.com/account/api-keys.
     */
    apiKey: string;

    /**
     * Optional. Organization to use when calling the OpenAI API.
     */
    organization?: string;

    /**
     * Optional. Endpoint to use when calling the OpenAI API.
     * @remarks
     * For Azure OpenAI this is the deployment endpoint.
     */
    endpoint?: string;

    /**
     * Optional. Whether to log requests to the console.
     * @remarks
     * This is useful for debugging prompts and defaults to `false`.
     */
    logRequests?: boolean;

    /**
     * Optional. Retry policy to use when calling the OpenAI API.
     * @remarks
     * The default retry policy is `[2000, 5000]` which means that the first retry will be after
     * 2 seconds and the second retry will be after 5 seconds.
     */
    retryPolicy?: number[];
}

/**
 * A `PromptCompletionClient` and `EmbeddingsClient` for calling OpenAI models.
 * @remarks
 * If you're wanting to call the Azure OpenAI service, you must use the
 * `AzureOpenAIClient` class instead.
 */
export class OpenAIClient<TOptions extends OpenAIClientOptions = OpenAIClientOptions> implements PromptCompletionClient, EmbeddingsClient {
    private _httpClient: AxiosInstance;

    private readonly DefaultEndpoint = 'https://api.openai.com';
    private readonly UserAgent = 'AlphaWave';

    /**
     * Options the client was configured with.
     */
    public readonly options: TOptions;

    /**
     * Creates a new `OpenAIClient` instance.
     * @param options Options for configuring an `OpenAIClient`.
     */
    public constructor(options: OpenAIClientOptions) {
        this.options = Object.assign({
            retryPolicy: [2000, 5000]
        }, options) as TOptions;

        // Cleanup and validate endpoint
        if (options.endpoint) {
            options.endpoint = options.endpoint.trim();
            if (options.endpoint.endsWith('/')) {
                options.endpoint = options.endpoint.substring(0, options.endpoint.length - 1);
            }

            if (!options.endpoint.toLowerCase().startsWith('https://')) {
                throw new Error(`Client created with an invalid endpoint of '${options.endpoint}'. The endpoint must be a valid HTTPS url.`);
            }
        }

        // Validate API key
        if (!options.apiKey) {
            throw new Error(`Client created without an 'apiKey'.`);
        }

        // Create client and set headers
        this._httpClient = axios.create({
            validateStatus: (status) => status < 400 || status == 429
        });
    }

    /**
     * Completes a prompt using the OpenAI API.
     * @remarks
     * The API used, Chat Completion or Text Completion, will be determined by the `prompt_options.completion_type` property.
     * @param memory Memory to use when rendering the prompt.
     * @param functions Functions to use when rendering the prompt.
     * @param tokenizer Tokenizer to use when rendering the prompt.
     * @param prompt Prompt to complete.
     * @param prompt_options Options for completing the prompt.
     * @returns A `PromptResponse` with the status and message.
     */
    public async completePrompt(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, prompt: PromptSection, prompt_options: PromptCompletionOptions): Promise<PromptResponse> {
        const startTime = Date.now();
        const max_input_tokens = prompt_options.max_input_tokens ?? 1024;
        if (prompt_options.completion_type == 'text') {
            // Render prompt
            const result = await prompt.renderAsText(memory, functions, tokenizer, max_input_tokens);
            if (result.tooLong) {
                return { status: 'too_long', message: `The generated text completion prompt had a length of ${result.length} tokens which exceeded the max_input_tokens of ${max_input_tokens}.` };
            }
            if (this.options.logRequests) {
                console.log(Colorize.title('PROMPT:'));
                console.log(Colorize.output(result.output));
            }

            // Call text completion API
            const request: CreateCompletionRequest = this.copyOptionsToRequest<CreateCompletionRequest>({
                model: prompt_options.model,
                prompt: result.output,
            }, prompt_options, ['max_tokens', 'temperature', 'top_p', 'n', 'stream', 'logprobs', 'echo', 'stop', 'presence_penalty', 'frequency_penalty', 'best_of', 'logit_bias', 'user']);
            const response = await this.createCompletion(request);
            if (this.options.logRequests) {
                console.log(Colorize.title('RESPONSE:'));
                console.log(Colorize.value('status', response.status));
                console.log(Colorize.value('duration', Date.now() - startTime, 'ms'));
                console.log(Colorize.output(response.data));
            }

            // Process response
            if (response.status < 300) {
                const completion = response.data.choices[0];
                return { status: 'success', message: { role: 'assistant', content: completion.text ?? '' } };
            } else if (response.status == 429) {
                if (this.options.logRequests) {
                    console.log(Colorize.title('HEADERS:'));
                    console.log(Colorize.output(response.headers));
                }
                return { status: 'rate_limited', message: `The text completion API returned a rate limit error.` }
            } else {
                return { status: 'error', message: `The text completion API returned an error status of ${response.status}: ${response.statusText}` };
            }
        } else {
            // Render prompt
            const result = await prompt.renderAsMessages(memory, functions, tokenizer, max_input_tokens);
            if (result.tooLong) {
                return { status: 'too_long', message: `The generated chat completion prompt had a length of ${result.length} tokens which exceeded the max_input_tokens of ${max_input_tokens}.` };
            }
            if (this.options.logRequests) {
                console.log(Colorize.title('CHAT PROMPT:'));
                console.log(Colorize.output(result.output));
            }

            // Call chat completion API
            const request: CreateChatCompletionRequest = this.copyOptionsToRequest<CreateChatCompletionRequest>({
                model: prompt_options.model,
                messages: result.output as ChatCompletionRequestMessage[],
            }, prompt_options, ['max_tokens', 'temperature', 'top_p', 'n', 'stream', 'logprobs', 'echo', 'stop', 'presence_penalty', 'frequency_penalty', 'best_of', 'logit_bias', 'user']);
            const response = await this.createChatCompletion(request);
            if (this.options.logRequests) {
                console.log(Colorize.title('CHAT RESPONSE:'));
                console.log(Colorize.value('status', response.status));
                console.log(Colorize.value('duration', Date.now() - startTime, 'ms'));
                console.log(Colorize.output(response.data));
            }

            // Process response
            if (response.status < 300) {
                const completion = response.data.choices[0];
                return { status: 'success', message: completion.message ?? { role: 'assistant', content: '' } };
            } else if (response.status == 429) {
                if (this.options.logRequests) {
                    console.log(Colorize.title('HEADERS:'));
                    console.log(Colorize.output(response.headers));
                }
                return { status: 'rate_limited', message: `The chat completion API returned a rate limit error.` }
            } else {
                return { status: 'error', message: `The chat completion API returned an error status of ${response.status}: ${response.statusText}` };
            }
        }
    }

    /**
     * Creates embeddings for the given inputs using the OpenAI API.
     * @param model Name of the model to use (or deployment for Azure).
     * @param inputs Text inputs to create embeddings for.
     * @returns A `EmbeddingsResponse` with a status and the generated embeddings or a message when an error occurs.
     */
    public async createEmbeddings(model: string, inputs: string | string[]): Promise<EmbeddingsResponse> {
        const response = await this.createEmbeddingRequest({
            model,
            input: inputs,
        });

        // Process response
        if (response.status < 300) {
            return { status: 'success', output: response.data.data.sort((a, b) => a.index - b.index).map((item) => item.embedding) };
        } else if (response.status == 429) {
            return { status: 'rate_limited', message: `The embeddings API returned a rate limit error.` }
        } else {
            return { status: 'error', message: `The embeddings API returned an error status of ${response.status}: ${response.statusText}` };
        }
    }

    /**
     * @private
     */
    protected addRequestHeaders(headers: Record<string, string>, options: OpenAIClientOptions): void {
        headers['Authorization'] = `Bearer ${options.apiKey}`;
        if (options.organization) {
            headers['OpenAI-Organization'] = options.organization;
        }
    }

    /**
     * @private
     */
    protected copyOptionsToRequest<TRequest>(target: Partial<TRequest>, src: any, fields: string[]): TRequest {
        for (const field of fields) {
            if (src[field] !== undefined) {
                (target as any)[field] = src[field];
            }
        }

        return target as TRequest;
    }

    /**
     * @private
     */
    protected createCompletion(request: CreateCompletionRequest): Promise<AxiosResponse<CreateCompletionResponse>> {
        const url = `${this.options.endpoint ?? this.DefaultEndpoint}/v1/completions`;
        return this.post(url, request);
    }

    /**
     * @private
     */
    protected createChatCompletion(request: CreateChatCompletionRequest): Promise<AxiosResponse<CreateChatCompletionResponse>> {
        const url = `${this.options.endpoint ?? this.DefaultEndpoint}/v1/chat/completions`;
        return this.post(url, request);
    }

    /**
     * @private
     */
    protected createEmbeddingRequest(request: CreateEmbeddingRequest): Promise<AxiosResponse<CreateEmbeddingResponse>> {
        const url = `${this.options.endpoint ?? this.DefaultEndpoint}/v1/embeddings`;
        return this.post(url, request);
    }

    /**
     * @private
     */
    protected async post<TData>(url: string, body: object, retryCount = 0): Promise<AxiosResponse<TData>> {
        // Initialize request headers
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': this.UserAgent
        };
        this.addRequestHeaders(requestHeaders, this.options);

        // Send request
        const response = await this._httpClient.post(url, body, {
            headers: requestHeaders
        });

        // Check for rate limit error
        if (response.status == 429 && Array.isArray(this.options.retryPolicy) && retryCount < this.options.retryPolicy.length) {
            const delay = this.options.retryPolicy[retryCount];
            await new Promise((resolve) => setTimeout(resolve, delay));
            return this.post(url, body, retryCount + 1);
        } else {
            return response;
        }
    }
}
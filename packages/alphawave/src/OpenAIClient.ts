import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { PromptFunctions, PromptMemory, PromptSection, Tokenizer } from "promptrix";
import { PromptCompletionClient, PromptCompletionOptions, PromptResponse } from "./types";
import { ChatCompletionRequestMessage, CreateChatCompletionRequest, CreateChatCompletionResponse, CreateCompletionRequest, CreateCompletionResponse } from "./internals";
import { Colorize } from "./internals";

export interface OpenAIClientOptions {
    apiKey: string;
    organization?: string;
    endpoint?: string;
    logRequests?: boolean;
}

/**
 * A client that calls various OpenAI API endpoints.
 */
export class OpenAIClient implements PromptCompletionClient {
    private _httpClient: AxiosInstance;

    private readonly DefaultEndpoint = 'https://api.openai.com';
    private readonly UserAgent = 'AlphaWave';

    public readonly options: OpenAIClientOptions;

    public constructor(options: OpenAIClientOptions) {
        this.options = Object.assign({}, options) as OpenAIClientOptions;

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

    public async completePrompt(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, prompt: PromptSection, options: PromptCompletionOptions): Promise<PromptResponse> {
        const startTime = Date.now();
        const max_input_tokens = options.max_input_tokens ?? 1024;
        if (options.completion_type == 'text') {
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
                model: options.model,
                prompt: result.output,
            }, options, ['max_tokens', 'temperature', 'top_p', 'n', 'stream', 'logprobs', 'echo', 'stop', 'presence_penalty', 'frequency_penalty', 'best_of', 'logit_bias', 'user']);
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
                model: options.model,
                messages: result.output as ChatCompletionRequestMessage[],
            }, options, ['max_tokens', 'temperature', 'top_p', 'n', 'stream', 'logprobs', 'echo', 'stop', 'presence_penalty', 'frequency_penalty', 'best_of', 'logit_bias', 'user']);
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

    protected addRequestHeaders(headers: Record<string, string>, options: OpenAIClientOptions): void {
        headers['Authorization'] = `Bearer ${options.apiKey}`;
        if (options.organization) {
            headers['OpenAI-Organization'] = options.organization;
        }
    }

    protected copyOptionsToRequest<TRequest>(target: Partial<TRequest>, src: any, fields: string[]): TRequest {
        for (const field of fields) {
            if (src[field] !== undefined) {
                (target as any)[field] = src[field];
            }
        }

        return target as TRequest;
    }

    protected createCompletion(request: CreateCompletionRequest): Promise<AxiosResponse<CreateCompletionResponse>> {
        const url = `${this.options.endpoint ?? this.DefaultEndpoint}/v1/completions`;
        return this.post(url, request);
    }

    protected createChatCompletion(request: CreateChatCompletionRequest): Promise<AxiosResponse<CreateChatCompletionResponse>> {
        const url = `${this.options.endpoint ?? this.DefaultEndpoint}/v1/chat/completions`;
        return this.post(url, request);
    }

    protected async post<TData>(url: string, body: object): Promise<AxiosResponse<TData>> {
        // Initialize request headers
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': this.UserAgent
        };
        this.addRequestHeaders(requestHeaders, this.options);

        // Send request
        return await this._httpClient.post(url, body, {
            headers: requestHeaders
        });
    }
}
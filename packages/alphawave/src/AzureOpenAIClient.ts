import { AxiosResponse } from "axios";
import { OpenAIClient, OpenAIClientOptions } from "./OpenAIClient";
import { CreateChatCompletionRequest, CreateChatCompletionResponse, CreateCompletionRequest, CreateCompletionResponse } from "./internals";

export interface AzureOpenAIClientOptions extends OpenAIClientOptions {
    endpoint: string;
    apiVersion?: string;
}

export class AzureOpenAIClient extends OpenAIClient {
    public constructor(options: AzureOpenAIClientOptions) {
        super(options);

        // Validate endpoint
        if (!options.endpoint) {
            throw new Error(`AzureOpenAIClient initialized without an 'endpoint'.`);
        }
    }

    public createCompletion(request: CreateCompletionRequest): Promise<AxiosResponse<CreateCompletionResponse>> {
        const clone = Object.assign({}, request);
        const deployment = this.removeModel(clone);
        const endpoint = (this.options as AzureOpenAIClientOptions).endpoint;
        const apiVersion = (this.options as AzureOpenAIClientOptions).apiVersion ?? '2022-12-01';
        const url = `${endpoint}/openai/deployments/${deployment}/completions?api-version=${apiVersion}`;
        return this.post(url, clone);
    }

    public createChatCompletion(request: CreateChatCompletionRequest): Promise<AxiosResponse<CreateChatCompletionResponse>> {
        const clone = Object.assign({}, request);
        const deployment = this.removeModel(clone);
        const endpoint = (this.options as AzureOpenAIClientOptions).endpoint;
        const apiVersion = (this.options as AzureOpenAIClientOptions).apiVersion ?? '2023-03-15-preview';
        const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
        return this.post(url, clone);
    }

    protected addRequestHeaders(headers: Record<string, string>, options: OpenAIClientOptions): void {
        headers['api-key'] = options.apiKey;
    }

    private removeModel(request: { model?: string }): string {
        const model = request.model;
        delete request.model;

        if (model) {
            return model;
        } else {
            return '';
        }
    }
}
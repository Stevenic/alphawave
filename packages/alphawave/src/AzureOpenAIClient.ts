import { AxiosResponse } from "axios";
import { OpenAIClient, OpenAIClientOptions } from "./OpenAIClient";
import { CreateChatCompletionRequest, CreateChatCompletionResponse, CreateCompletionRequest, CreateCompletionResponse, CreateEmbeddingRequest, CreateEmbeddingResponse } from "./internals";

/**
 * Additional configuration options specific to the `AzureOpenAI` client.
 */
export interface AzureOpenAIClientOptions extends OpenAIClientOptions {
    /**
     * Deployment endpoint to use.
     */
    endpoint: string;

    /**
     * Optional. Version of the API being called. Defaults to `2022-12-01`.
     */
    apiVersion?: string;
}

/**
 * A `PromptCompletionClient` and `EmbeddingsClient` for calling Azure OpenAI models.
 * @remarks
 * Use of this class is required when calling the Azure OpenAI service as the format
 * of the API endpoints is a little different.
 *
 * Also note that you should configure any `prompt_option.model` settings with the
 * name of your model deployment.
 */
export class AzureOpenAIClient extends OpenAIClient<AzureOpenAIClientOptions> {
    /**
     * Creates a new `AzureOpenAIClient` instance.
     * @param options Options to configure the client with.
     */
    public constructor(options: AzureOpenAIClientOptions) {
        super(options);

        // Validate endpoint
        if (!options.endpoint) {
            throw new Error(`AzureOpenAIClient initialized without an 'endpoint'.`);
        }
    }

    /**
     * @private
     */
    protected createCompletion(request: CreateCompletionRequest): Promise<AxiosResponse<CreateCompletionResponse>> {
        const clone = Object.assign({}, request);
        const deployment = this.removeModel(clone);
        const endpoint = (this.options as AzureOpenAIClientOptions).endpoint;
        const apiVersion = (this.options as AzureOpenAIClientOptions).apiVersion ?? '2022-12-01';
        const url = `${endpoint}/openai/deployments/${deployment}/completions?api-version=${apiVersion}`;
        return this.post(url, clone);
    }

    /**
     * @private
     */
    protected createChatCompletion(request: CreateChatCompletionRequest): Promise<AxiosResponse<CreateChatCompletionResponse>> {
        const clone = Object.assign({}, request);
        const deployment = this.removeModel(clone);
        const endpoint = (this.options as AzureOpenAIClientOptions).endpoint;
        const apiVersion = (this.options as AzureOpenAIClientOptions).apiVersion ?? '2023-03-15-preview';
        const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
        return this.post(url, clone);
    }

    /**
     * @private
     */
    protected createEmbeddingRequest(request: CreateEmbeddingRequest): Promise<AxiosResponse<CreateEmbeddingResponse>> {
        const clone = Object.assign({}, request);
        const deployment = this.removeModel(clone);
        const endpoint = (this.options as AzureOpenAIClientOptions).endpoint;
        const apiVersion = (this.options as AzureOpenAIClientOptions).apiVersion ?? '2022-12-01';
        const url = `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`;
        return this.post(url, clone);
    }

     /**
     * @private
     */
     protected addRequestHeaders(headers: Record<string, string>, options: OpenAIClientOptions): void {
        headers['api-key'] = options.apiKey;
    }

    /**
     * @private
     */
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
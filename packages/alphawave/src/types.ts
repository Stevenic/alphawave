import { Message, PromptFunctions, PromptMemory, PromptSection, Tokenizer } from "promptrix";

/**
 * A client that can be used to create embeddings.
 */
export interface EmbeddingsClient {
    /**
     * Creates embeddings for the given inputs.
     * @param model Name of the model to use.
     * @param inputs Text inputs to create embeddings for.
     * @returns A `EmbeddingsResponse` with a status and the generated embeddings or a message when an error occurs.
     */
    createEmbeddings(model: string, inputs: string|string[]): Promise<EmbeddingsResponse>;
}

/**
 * Status of the embeddings response.
 * @remarks
 * `success` - The embeddings were successfully created.
 * `error` - An error occurred while creating the embeddings.
 * `rate_limited` - The request was rate limited.
 */
export type EmbeddingsResponseStatus = 'success' | 'error' | 'rate_limited';

/**
 * Response returned by a `EmbeddingsClient`.
 */
export interface EmbeddingsResponse {
    /**
     * Status of the embeddings response.
     */
    status: EmbeddingsResponseStatus;

    /**
     * Optional. Embeddings for the given inputs.
     */
    output?: number[][];

    /**
     * Optional. Message when status is not equal to `success`.
     */
    message?: string;
}

/**
 * A client that can be used to complete prompts.
 */
export interface PromptCompletionClient {
    /**
     * Completes a prompt.
     * @param memory Memory to use when rendering the prompt.
     * @param functions Functions to use when rendering the prompt.
     * @param tokenizer Tokenizer to use when rendering the prompt.
     * @param prompt Prompt to complete.
     * @param prompt_options Options for completing the prompt.
     * @returns A `PromptResponse` with the status and message.
     */
    completePrompt(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, prompt: PromptSection, options: PromptCompletionOptions): Promise<PromptResponse>;
}

/**
 * A validator that can be used to validate prompt responses.
 */
export interface PromptResponseValidator<TContent = any> {
    /**
     * Validates the response.
     * @param memory Memory used to render the prompt.
     * @param functions Functions used to render the prompt.
     * @param tokenizer Tokenizer used to render the prompt.
     * @param response Response to validate.
     * @param remaining_attempts Number of remaining validation attempts.
     * @returns A `Validation` with the status and value. The validation is always valid.
     */
    validateResponse(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse<string>, remaining_attempts: number): Promise<Validation<TContent>>;
}

/**
 * Options for completing a prompt.
 */
export interface PromptCompletionOptions {
    /**
     * Type of completion API to call.
     */
    completion_type: 'text' | 'chat';

    /**
     * Model to use for completion.
     * @remarks
     * For Azure OpenAI this is the name of the deployment to use.
     */
    model: string;

    /**
     * Optional. Maximum number of tokens to let the prompt use when rendering.
     * @remarks
     * The default can vary by client but for the `OpenAIClient` and `AzureOpenAIClient` classes
     * this is `1024`.
     *
     * If the rendered prompt exceeds this limit, most `PromptCompletionClient` classes will return
     * a `response.status == 'too_long'`.
     */
    max_input_tokens?: number;

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
     * Optional. An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass.
     * @remarks
     * A value of `0.1` means only the tokens comprising the top 10% probability mass are considered.
     *
     * It's generally recommended to use this or `temperature` but not both.
     */
    top_p?: number;

    /**
     * Optional. The maximum number of tokens to generate for a completion.
     * @remarks
     * This value plus the `max_input_tokens` value cannot exceed the maximum number of tokens for
     * the models context window.
     */
    max_tokens?: number;

    /**
     * Optional. Up to 4 sequences where the API will stop generating further tokens.
     * @remarks
     * The returned text will not contain the stop sequence.
     */
    stop?: Array<string> | string;

    /**
     * Optional. Presence penalty value between `-2.0` and `2.0`.
     * @remarks
     * Positive values penalize new tokens based on whether they appear in the text so far,
     * increasing the model's likelihood to talk about new topics.
     */
    presence_penalty?: number;

    /**
     * Optional. Frequency penalty value between `-2.0` and `2.0`.
     * @remarks
     * Positive values penalize new tokens based on their existing frequency in the text so far,
     * decreasing the model's likelihood to repeat the same line verbatim.
     */
    frequency_penalty?: number;

    /**
     * Optional. Logit bias modifies the likelihood of specified tokens appearing in the completion.
     */
    logit_bias?: object;

    /**
     * Optional. Number of candidate completions to generate server side.
     */
    best_of?: number;
}

/**
 * Status of the prompt response.
 * @remarks
 * `success` - The prompt was successfully completed.
 * `error` - An error occurred while completing the prompt.
 * `rate_limited` - The request was rate limited.
 * `invalid_response` - The response was invalid.
 * `too_long` - The rendered prompt exceeded the `max_input_tokens` limit.
 */
export type PromptResponseStatus = 'success' | 'error' | 'rate_limited' | 'invalid_response' | 'too_long';

/**
 * Response returned by a `PromptCompletionClient`.
 * @template TContent Optional. Type of the content in the message. Defaults to `any`.
 */
export interface PromptResponse<TContent = any> {
    /**
     * Status of the prompt response.
     */
    status: PromptResponseStatus;

    /**
     * Message returned.
     * @remarks
     * This will be a `Message<TContent>` object if the status is `success`, otherwise it will be a `string`.
     */
    message: Message<TContent>|string;
}

/**
 * Response returned by a `PromptResponseValidator`.
 */
export interface Validation<TValue = any> {
    /**
     * Type of the validation object.
     * @remarks
     * This is used for type checking.
     */
    type: 'Validation';

    /**
     * Whether the validation is valid.
     * @remarks
     * If this is `false` the `feedback` property will be set, otherwise the `value` property
     * MAY be set.
     */
    valid: boolean;

    /**
     * Optional. Repair instructions to send to the model.
     * @remarks
     * Should be set if the validation fails.
     */
    feedback?: string;

    /**
     * Optional. Replacement value to use for the response.
     * @remarks
     * Can be set if the validation succeeds. If set, the value will replace the responses
     * `message.content` property.
     */
    value?: TValue;
}

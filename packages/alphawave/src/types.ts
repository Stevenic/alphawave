import { Schema } from "jsonschema";
import { Message, PromptFunctions, PromptMemory, PromptSection, Tokenizer } from "promptrix";

/**
 * An AI model that can be used to create embeddings.
 */
export interface EmbeddingsModel {
    /**
     * Creates embeddings for the given inputs.
     * @param inputs Text inputs to create embeddings for.
     * @returns A `EmbeddingsResponse` with a status and the generated embeddings or a message when an error occurs.
     */
    createEmbeddings(inputs: string|string[]): Promise<EmbeddingsResponse>;
}

/**
 * Status of the embeddings response.
 * @remarks
 * `success` - The embeddings were successfully created.
 * `error` - An error occurred while creating the embeddings.
 * `rate_limited` - The request was rate limited.
 * `cancelled` - The request was cancelled.
 */
export type EmbeddingsResponseStatus = 'success' | 'error' | 'rate_limited' | 'cancelled';

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
 * An AI model that can be used to complete prompts.
 */
export interface PromptCompletionModel {
    /**
     * Completes a prompt.
     * @param memory Memory to use when rendering the prompt.
     * @param functions Functions to use when rendering the prompt.
     * @param tokenizer Tokenizer to use when rendering the prompt.
     * @param prompt Prompt to complete.
     * @returns A `PromptResponse` with the status and message.
     */
    completePrompt(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, prompt: PromptSection): Promise<PromptResponse>;
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
 * Status of the prompt response.
 * @remarks
 * `success` - The prompt was successfully completed.
 * `error` - An error occurred while completing the prompt.
 * `rate_limited` - The request was rate limited.
 * `invalid_response` - The response was invalid.
 * `too_long` - The rendered prompt exceeded the `max_input_tokens` limit.
 * `cancelled` - The prompt was cancelled.
 */
export type PromptResponseStatus = 'success' | 'error' | 'rate_limited' | 'invalid_response' | 'too_long' | 'cancelled';

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
     * Message containing generated response.
     */
    message?: Message<TContent>;

    /**
     * Error message if any
     */
    error?: string;

    /**
     * Details about the prompts response.
     */
    details?: PromptResponseDetails;

    /**
     * The prompt that was generated.
     */
    prompt?: Message<TContent>[]|string;
}

/**
 * The reason the prompt finished.
 */
export type PromptResponseFinishReason = 'stop' | 'length' | 'function_call' | 'content_filter' | 'other';

/**
 * Details about the prompt response.
 */
export interface PromptResponseDetails {
    /**
     * Reason the prompt finished.
     */
    finish_reason: PromptResponseFinishReason;

    /**
     * Number of completion tokens.
     */
    completion_tokens: number;

    /**
     * Number of prompt tokens.
     */
    prompt_tokens: number;

    /**
     * Total number of prompt + completion tokens.
     */
    total_tokens: number;

    /**
     * Number of milliseconds the prompt took to complete.
     */
    request_duration: number;
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


/**
 * A function that can be called by a model.
 */
export interface ChatCompletionFunction {
    /**
     * Name of the function to be called.
     * @remarks
     * Must be a-z, A-Z, 0-9, or contain underscores and dashes, with a maximum length of 64.
     */
    name: string;

    /**
     * Optional. Description of what the function does.
     */
    description?: string;

    /**
     * Optional. Parameters the functions accepts, described as a JSON Schema object.
     * @remarks
     * See the [guide](/docs/guides/gpt/function-calling) for examples, and the
     * [JSON Schema reference](https://json-schema.org/understanding-json-schema/) for documentation
     * about the format.
     */
    parameters: Schema;
}

/**
 * JSON schema to specify the desired shape of a models output.
 */
export interface JsonSchema {
    /**
     * The name of the schema.
     */
    name: string;

    /**
     * The schema definition.
     */
    schema: Schema;

    /**
     * Optional. Description of when the schema should be used.
     */
    description?: string;

    /**
     * Optional. Indicates whether the schema should be strictly enforced.
     */
    strict?: boolean;
}
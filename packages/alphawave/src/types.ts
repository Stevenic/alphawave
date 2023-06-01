import { Message, PromptFunctions, PromptMemory, PromptSection, Tokenizer } from "promptrix";


export interface PromptCompletionClient {
    completePrompt(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, prompt: PromptSection, options: PromptCompletionOptions): Promise<PromptResponse>;
}

export interface PromptResponseValidator {
    validateResponse(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse): Promise<ResponseValidation>;
}

export interface PromptCompletionOptions {
    completion_type: 'text' | 'chat';
    model: string;
    max_input_tokens?: number;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    stop?: Array<string> | string;
    presence_penalty?: number;
    frequency_penalty?: number;
    logit_bias?: object;
    best_of?: number;
}

export type PromptResponseStatus = 'success' | 'error' | 'rate_limited' | 'invalid_response' | 'too_long';

export interface PromptResponse {
    status: PromptResponseStatus;
    message: Message<any>|string;
}

export interface ResponseValidation<TContent = any> {
    type: 'ResponseValidation';
    valid: boolean;
    feedback?: string;
    content?: TContent;
}

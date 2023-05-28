import { Message, PromptFunctions, PromptMemory, PromptSection, Tokenizer } from "promptrix";


export interface PromptCompletionClient {
    completePrompt(prompt: PromptSection, options: PromptCompletionOptions): Promise<PromptResponse>;
}

export interface PromptResponseValidator {
    validateResponse(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse): Promise<PromptResponseValidation>;
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

export interface PromptResponse {
    status: 'success' | 'error' | 'rate_limited' | 'invalid_response';
    response: Message|string;
}

export interface PromptResponseValidation {
    isValid: boolean;
    feedback?: string;
}

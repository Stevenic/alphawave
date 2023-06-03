import { PromptFunctions, PromptMemory, Tokenizer } from "promptrix";
import { PromptResponse, Validation, PromptResponseValidator } from "./types";

/**
 * Default response validator that always returns true.
 */
export class DefaultResponseValidator implements PromptResponseValidator {
    public validateResponse(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse): Promise<Validation> {
        return Promise.resolve({
            type: 'Validation',
            valid: true,
            value: typeof response.message == 'object' ? response.message.content : response.message
        });
    }
}
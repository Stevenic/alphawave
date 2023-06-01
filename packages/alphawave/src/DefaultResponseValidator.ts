import { PromptFunctions, PromptMemory, Tokenizer } from "promptrix";
import { PromptResponse, ResponseValidation, PromptResponseValidator } from "./types";

/**
 * Default response validator that always returns true.
 */
export class DefaultResponseValidator implements PromptResponseValidator {
    public validateResponse(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse): Promise<ResponseValidation> {
        return Promise.resolve({
            type: 'ResponseValidation',
            valid: true
        });
    }
}
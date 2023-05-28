import { PromptResponseValidator } from "./types";

/**
 * Default response validator that always returns true.
 */
export class DefaultResponseValidator implements PromptResponseValidator {
    public async validateResponse(response: any): Promise<any> {
        return {
            isValid: true
        };
    }
}
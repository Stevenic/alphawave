import { PromptResponseValidator } from "./types";

export class DefaultResponseValidator implements PromptResponseValidator {
    public async validateResponse(response: any): Promise<any> {
        return {
            isValid: true
        };
    }
}
import { Validator, Schema, ValidationError } from "jsonschema";
import { Message, PromptFunctions, PromptMemory, Tokenizer } from "promptrix";
import { PromptResponse, Validation, PromptResponseValidator } from "./types";
import { Response } from "./Response";

/**
 * Parses any JSON returned by the model and optionally verifies it against a JSON schema.
 */
export class JSONResponseValidator implements PromptResponseValidator {
    public constructor(private schema?: Schema) {
    }

    public validateResponse(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse, remaining_attempts: number): Promise<Validation> {
        const message = response.message;
        const text = typeof message === 'string' ? message : message.content ?? '';

        // Parse the response text
        const parsed = Response.parseAllObjects(text);
        if (parsed.length == 0) {
            return Promise.resolve({
                type: 'Validation',
                valid: false,
                feedback: 'No valid JSON objects were found in the response. Return a valid JSON object.'
            });
        }

        // Validate the response against the schema
        if (this.schema) {
            let errors: ValidationError[] | undefined;
            const validator = new Validator();
            for (let i = parsed.length - 1; i >= 0; i--) {
                const obj = parsed[i];
                const result = validator.validate(obj, this.schema);
                if (result.valid) {
                    return Promise.resolve({
                        type: 'Validation',
                        valid: true,
                        value: obj
                    });
                } else if (!errors) {
                    errors = result.errors
                }
            }

            return Promise.resolve({
                type: 'Validation',
                valid: false,
                feedback: `The JSON returned had the following errors:\n${errors!.map(e => `"${e.property}" ${e.message}`).join('\n')}\n\nReturn a JSON object that fixes these errors.`
            });
        } else {
            // Return the last object
            return Promise.resolve({
                type: 'Validation',
                valid: true,
                value: parsed[parsed.length - 1]
            });
        }
    }
}
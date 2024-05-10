import { Validator, Schema, ValidationError } from "jsonschema";
import { PromptFunctions, PromptMemory, Tokenizer } from "promptrix";
import { PromptResponse, Validation, PromptResponseValidator } from "./types";
import { Response } from "./Response";

/**
 * Parses any JSON returned by the model and optionally verifies it against a JSON schema.
 * @template TContent Optional. Type of the content of the message. Defaults to `Record<string, any>`.
 */
export class JSONResponseValidator implements PromptResponseValidator {

    /**
     * Creates a new `JSONResponseValidator` instance.
     * @param schema Optional. JSON schema to validate the response against.
     * @param missingJsonFeedback Optional. Custom feedback to give when no JSON is returned.
     * @param errorFeedback Optional. Custom feedback to give when an error is detected.
     */
    public constructor(schema?: Schema, missingJsonFeedback?: string, errorFeedback?: string, instanceName?: string) {
        this.schema = schema;
        this.missingJsonFeedback = missingJsonFeedback ?? 'No valid JSON objects were found in the response. Return a valid JSON object.';
        this.errorFeedback = errorFeedback ?? 'The JSON returned had errors. Apply these fixes:';
    }

    public readonly errorFeedback: string;
    public readonly instanceName?: string;
    public readonly missingJsonFeedback: string;
    public readonly schema?: Schema;

    /**
     * Validates the response.
     * @param memory Memory used to render the prompt.
     * @param functions Functions used to render the prompt.
     * @param tokenizer Tokenizer used to render the prompt.
     * @param response Response to validate.
     * @param remaining_attempts Number of remaining validation attempts.
     * @returns A `Validation` with the status and value.
     */
    public validateResponse(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse, remaining_attempts: number): Promise<Validation> {
        const message = response.message;
        const text = message?.content ?? '';

        // Parse the response text
        const parsed = Response.parseJSON(text);
        if (parsed == undefined) {
            if (typeof message === 'object' && message.content === null) {
                return Promise.resolve({
                    type: 'Validation',
                    valid: true,
                    value: null
                });
            } else {
                return Promise.resolve({
                    type: 'Validation',
                    valid: false,
                    feedback: this.missingJsonFeedback
                });
            }
        }

        // Validate the response against the schema
        const value = Response.removeEmptyValuesFromObject(parsed);
        if (this.schema) {
            const validator = new Validator();
            const result = validator.validate(value, this.schema);
            if (result.valid) {
                return Promise.resolve({
                    type: 'Validation',
                    valid: true,
                    value
                });
            } else {
                return Promise.resolve({
                    type: 'Validation',
                    valid: false,
                    feedback: `${this.errorFeedback}\n${result.errors!.map(e => this.getErrorFix(e)).join('\n')}`
                });
            }
        } else {
            // Return the last object
            return Promise.resolve({
                type: 'Validation',
                valid: true,
                value
            });
        }
    }

    private getErrorFix(error: ValidationError): string {
        // Get argument as a string
        let arg: string;
        if (Array.isArray(error.argument)) {
            arg = error.argument.join(',');
        } else if (typeof error.argument === 'object') {
            arg = JSON.stringify(error.argument);
        } else {
            arg = error.argument.toString();
        }

        switch (error.name) {
            case 'type':
                // field is of the wrong type
                return `convert "${error.property}" to a ${arg}`;
            case 'anyOf':
                // field is not one of the allowed types
                return `convert "${error.property}" to one of the allowed types in the provided schema.`;
            case 'additionalProperties':
                // field has an extra property
                return `remove the "${arg}" property from "${error.property}"`;
            case 'required':
                // field is missing a required property
                return `add the "${arg}" property to "${error.property}"`;
            case 'format':
                // field is not in the correct format
                return `change the "${error.property}" property to be a ${arg}`;
            case 'uniqueItems':
                // field has duplicate items
                return `remove all duplicate items from "${error.property}"`;
            case 'enum':
                // field is not one of the allowed values
                arg = error.message.split(':')[1].trim();
                return `change the "${error.property}" property to be one of these values: ${arg}`;
            case 'const':
                // field is not the correct value
                return `change the "${error.property}" property to be ${arg}`;
            default:
                return `"${error.property}" ${error.message}. Fix that`;
        }
    }
}

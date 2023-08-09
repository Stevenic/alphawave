import { PromptFunctions, PromptMemory, Tokenizer  } from "promptrix";
import { Validation } from "alphawave";
import { Validator, Schema  } from "jsonschema";
import { Command, TaskContext } from "./types";

export interface CommandSchema extends Schema {
    type: "object";
    title: string;
    description: string;
    returns?: string;
}

export abstract class SchemaBasedCommand<TInput = Record<string, any>> implements Command<TInput> {
    private readonly _schema: CommandSchema;
    private readonly _title?: string;
    private readonly _description?: string;

    public constructor(schema: CommandSchema, title?: string, description?: string) {
        this._schema = schema;
        this._title = title;
        this._description = description;
    }

    public get description(): string {
        return this._description ?? this._schema.description;
    }

    public get inputs(): string | undefined {
        if (this._schema.properties) {
            // Return a sketch of the inputs
            const properties = this._schema.properties ?? {};
            const keys = Object.keys(properties);
            const inputs = keys.map(key => {
                const property = properties[key];
                const type = property.type ?? "any";
                const description = property.description || `${type} value`;
                return `"${key}":"<${description}>"`;
            });
            return inputs.join(",");
        } else {
            return undefined;
        }
    }

    public get output(): string | undefined {
        return this._schema.returns;
    }

    public get schema(): CommandSchema {
        return this._schema;
    }

    public get title(): string {
        return this._title ?? this._schema.title;
    }

    public abstract execute(context: TaskContext, input: TInput): Promise<any>;

    public validate(input: TInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<Validation<TInput>> {
        // First clean the input
        const cleaned = this.cleanInput(input);

        // Validate the input
        const validator = new Validator();
        const result = validator.validate(cleaned, this._schema);
        if (result.valid) {
            return Promise.resolve({
                type: 'Validation',
                valid: true,
                value: cleaned
            });
        } else {
            const errors = result.errors.map(e => {
                const name = e.property.indexOf('.') == -1 ? 'input' : e.property.split('.').slice(1).join('.');
                return `"${name}": ${e.message}`;
            });
            const message = errors.join("\n");
            return Promise.resolve({
                type: 'Validation',
                valid: false,
                feedback: `The command.input has errors:\n${message}\n\nTry again.`
            });
        }
    }

    public cleanInput(input: TInput): TInput {
        const cleaned: Record<string,any> = {};
        const properties = this._schema.properties;
        if (!properties) {
            return cleaned as TInput;
        }

        // Clean each property
        // - Hallucinated properties are skipped
        const keys = Object.keys(properties);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const property = properties[key];
            const type = property.type ?? "any";
            let value = (input as any)[key];

            // Skip undefined or null values
            if (value === undefined || value === null) {
                continue;
            }

            // All values should be string
            const valueType = typeof value;
            if (valueType !== "string") {
                value = valueType == "object" ? JSON.stringify(value) : value.toString();
            }

            // Skip hallucinated parameters
            if (value.startsWith("<") && value.endsWith(">")) {
                continue;
            }

            // Clean the value
            try {
                switch (type) {
                    case "string":
                        cleaned[key] = value.toString();
                        break;
                    case "number":
                        cleaned[key] = Number(value);
                        break;
                    case "boolean":
                        cleaned[key] = Boolean(value);
                        break;
                    case "array":
                    case "object":
                        cleaned[key] = JSON.parse(value);
                        break;
                }
            } catch (error) {
                // Ignore errors
            }
        }

        return cleaned as TInput;
   }
}
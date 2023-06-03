import { PromptResponseValidator, Validation, JSONResponseValidator, PromptResponse } from "alphawave";
import { PromptMemory, PromptFunctions, Tokenizer} from "promptrix";
import { Plan, PredictedDoCommand, PredictedSayCommand } from "@microsoft/teams-ai";
import { Schema, Validator } from "jsonschema";

export class PlanValidator implements PromptResponseValidator {
    private readonly planSchemaValidator = new JSONResponseValidator(planSchema);
    private readonly _actions: Map<string, Schema|undefined> = new Map<string, Schema|undefined>();

    public action(name: string, schema?: Schema): this {
        if (this._actions.has(name)) {
            throw new Error(`PlanValidator already has an action named "${name}".`);
        }

        this._actions.set(name, schema);
        return this;
    }

    public async validateResponse(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse, remaining_attempts: number): Promise<Validation> {
        // Validate that the response contains a plan
        const validationResult = await this.planSchemaValidator.validateResponse(memory, functions, tokenizer, response, remaining_attempts);
        if (!validationResult.valid) {
            return validationResult;
        }

        // Validate that the plan is structurally correct
        const hasActions = this._actions.size > 0;
        const plan = validationResult.value as Plan;
        for (let i = 0; i < plan.commands.length; i++) {
            const command = plan.commands[i];
            if (command.type === "DO") {
                // Ensure that the model specified an action
                const doCommand = command as PredictedDoCommand;
                const action = doCommand.action;
                if (!action) {
                    return {
                        type: "Validation",
                        valid: false,
                        feedback: `The plan JSON is missing the DO "action" for command[${i}]. Return a JSON object that fixes these errors.`
                    };
                }

                // Ensure that the action is known and has valid entities
                if (hasActions) {
                    if (!this._actions.has(action)) {
                        return {
                            type: "Validation",
                            valid: false,
                            feedback: `The plan JSON is using an Unknown action "${action}" for command[${i}]. Return a JSON object that fixes these errors.`
                        };
                    }

                    const actionSchema = this._actions.get(action);
                    if (actionSchema) {
                        const validator = new Validator();
                        const validationResult = validator.validate(doCommand.entities ?? {}, actionSchema);
                        if (!validationResult.valid) {
                            const errors = validationResult.errors.map(e => {
                                const property = e.property.indexOf('.') >= 0 ? 'entities.' + e.property.split('.').slice(1).join('.') : 'entities';
                                return  `"${property}" ${e.message}`;
                            }).join('\n');
                            return {
                                type: "Validation",
                                valid: false,
                                feedback: `The plan JSON has invalid entities for action "${action}" for command[${i}]:\n${errors}\n\nReturn a JSON object that fixes these errors.`
                            };
                        }
                    }
                }
            } else {
                // Ensure that the model specified a response
                const sayCommand = command as PredictedSayCommand;
                const response = sayCommand.response;
                if (!response) {
                    return {
                        type: "Validation",
                        valid: false,
                        feedback: `The plan JSON is missing the SAY "response" for command[${i}]. Return a JSON object that fixes these errors.`
                    };
                }
            }
        }

        return {
            type: "Validation",
            valid: true,
            value: plan
        };
    }
}

const planSchema: Schema = {
    "type": "object",
    "properties": {
        "type": {
            "type": "string",
            "enum": ["plan"]
        },
        "commands": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["DO", "SAY"]
                    },
                    "action": {
                        "type": "string"
                    },
                    "entities": {
                        "type": "object"
                    },
                    "response": {
                        "type": "string"
                    }
                },
                "required": ["type"]
            },
            "minItems": 1
        }
    },
    "required": ["type", "commands"]
}

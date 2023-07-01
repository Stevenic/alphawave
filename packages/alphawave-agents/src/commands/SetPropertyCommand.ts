import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";
import { SchemaBasedCommand, CommandSchema } from "../SchemaBasedCommand";

const schema: CommandSchema = {
    type: "object",
    title: "setProperty",
    description: "writes a string value to short term memory",
    properties: {
        property: {
            type: "string",
            description: "name of the property to set"
        },
        value: {
            type: "string",
            description: "value to remember"
        }
    },
    required: ["property", "value"],
    returns: "confirmation of the assignment"
};

export interface SetPropertyCommandInput {
    property: string;
    value: string;
}

export class SetPropertyCommand extends SchemaBasedCommand<SetPropertyCommandInput> {
    public constructor(title?: string, description?: string) {
        super(schema, title, description);
    }

    public execute(input: SetPropertyCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<string> {
        memory.set(input.property, input.value);
        return Promise.resolve(`the "${input.property}" property was updated`);
    }
}
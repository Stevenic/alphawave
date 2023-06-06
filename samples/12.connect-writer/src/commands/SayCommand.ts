import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";
import { SchemaBasedCommand, CommandSchema } from "alphawave-agents";

const schema: CommandSchema = {
    type: "object",
    title: "say",
    description: "sends the user a message",
    properties: {
        message: {
            type: "string",
            description: "message to send to the user"
        }
    },
    required: ["message"],
    returns: "confirmation the message was sent"
};

export interface SayCommandInput {
    message: string;
}

export class SayCommand extends SchemaBasedCommand<SayCommandInput> {
    public constructor(title?: string, description?: string) {
        super(schema, title, description);
    }

    public execute(input: SayCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<string> {
        console.log(`\x1b[32m${input.message}\x1b[0m`);
        return Promise.resolve(`message was sent`);
    }
}
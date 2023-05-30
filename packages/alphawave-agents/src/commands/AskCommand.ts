import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";
import { SchemaBasedCommand, CommandSchema } from "../SchemaBasedCommand";
import { TaskResponse } from "../types";

const schema: CommandSchema = {
    type: "object",
    title: "ask",
    description: "ask the user a question and wait for their response",
    properties: {
        question: {
            type: "string",
            description: "question to ask"
        }
    },
    required: ["question"],
    returns: "users answer"
};

export interface AskCommandInput {
    question: string;
}

export class AskCommand extends SchemaBasedCommand<AskCommandInput> {
    public constructor(title?: string, description?: string) {
        super(schema, title, description);
    }

    public execute(input: AskCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<TaskResponse> {
        return Promise.resolve({
            type: "TaskResponse",
            status: "input_needed",
            message: input.question
        });
    }
}
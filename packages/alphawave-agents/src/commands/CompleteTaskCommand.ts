import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";
import { SchemaBasedCommand, CommandSchema } from "../SchemaBasedCommand";
import { TaskResponse } from "../types";

const schema: CommandSchema = {
    type: "object",
    title: "completeTask",
    description: "signals that the task is completed",
    properties: {
        status: {
            type: "string",
            description: "brief completion status"
        }
    },
    required: ["status"]
};

export interface CompleteTaskCommandInput {
    status: string;
}

export class CompleteTaskCommand extends SchemaBasedCommand<CompleteTaskCommandInput> {
    public constructor(title?: string, description?: string) {
        super(schema, title, description);
    }

    public execute(input: CompleteTaskCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<TaskResponse> {
        return Promise.resolve({
            type: "TaskResponse",
            status: "success",
            message: input.status
        });
    }
}
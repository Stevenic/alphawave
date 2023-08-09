import { SchemaBasedCommand, CommandSchema } from "../SchemaBasedCommand";
import { TaskContext, TaskResponse } from "../types";

const schema: CommandSchema = {
    type: "object",
    title: "confirmAnswer",
    description: "asks the user to confirm an answer before completing a task",
    properties: {
        answer: {
            type: "string",
            description: "answer to confirm"
        },
        confirmation: {
            type: "string",
            description: "confirmation question to ask the user"
        }
    },
    required: ["answer", "confirmation"],
    returns: "users confirmation or requested changes"
};

export interface ConfirmAnswerCommandInput {
    answer: string;
    confirmation: string;
}

export class ConfirmAnswerCommand extends SchemaBasedCommand<ConfirmAnswerCommandInput> {
    public constructor(title?: string, description?: string) {
        super(schema, title, description);
    }

    public execute(context: TaskContext, input: ConfirmAnswerCommandInput): Promise<TaskResponse> {
        return Promise.resolve({
            type: "TaskResponse",
            status: "input_needed",
            message: `${input.confirmation}\n\n${input.answer}`
        });
    }
}
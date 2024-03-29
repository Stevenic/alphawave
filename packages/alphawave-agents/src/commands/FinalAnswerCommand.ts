import { SchemaBasedCommand, CommandSchema } from "../SchemaBasedCommand";
import { TaskContext, TaskResponse } from "../types";

const schema: CommandSchema = {
    type: "object",
    title: "finalAnswer",
    description: "generate an answer for the user",
    properties: {
        answer: {
            type: "string",
            description: "final answer"
        }
    },
    required: ["answer"],
    returns: "a followup task or question"
};

export interface FinalAnswerCommandInput {
    answer: string;
}

export class FinalAnswerCommand extends SchemaBasedCommand<FinalAnswerCommandInput> {
    public constructor(title?: string, description?: string) {
        super(schema, title, description);
    }

    public execute(context: TaskContext, input: FinalAnswerCommandInput): Promise<TaskResponse> {
        return Promise.resolve({
            type: "TaskResponse",
            status: "success",
            message: input.answer
        });
    }
}
import { SchemaBasedCommand, CommandSchema } from "../SchemaBasedCommand";
import { TaskContext, TaskResponse } from "../types";

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
    public constructor(private response?: string, title?: string, description?: string) {
        super(schema, title, description);
    }

    public execute(context: TaskContext, input: CompleteTaskCommandInput): Promise<TaskResponse> {
        return Promise.resolve({
            type: "TaskResponse",
            status: "success",
            message: this.response ?? input.status
        });
    }
}
import { SchemaBasedCommand, CommandSchema, TaskResponse, TaskContext } from "alphawave-agents";

interface EndSceneCommandInput {
    question: string;
}

const EndSceneCommandSchema: CommandSchema = {
    type: "object",
    title: "endScene",
    description: "marks the end of a scene and lets the narrator ask the user for next scene",
    properties: {
        question: {
            type: "string",
            description: "question for user"
        }
    },
    required: ["question"],
    returns: "users next scene request"
};

export class EndSceneCommand extends SchemaBasedCommand<EndSceneCommandInput> {
    public constructor() {
        super(EndSceneCommandSchema);
    }

    public execute(context: TaskContext, input: EndSceneCommandInput): Promise<TaskResponse> {
        // Delete the dialog for the current scene
        context.memory.set('dialog', []);
        context.memory.set('performance', undefined);

        // Prompt user with questions
        return Promise.resolve({ type: 'TaskResponse', status: 'success', message: input.question });
    }
}


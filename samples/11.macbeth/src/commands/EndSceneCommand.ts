import { SchemaBasedCommand, CommandSchema, TaskResponse } from "alphawave-agents";
import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";

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

    public execute(input: EndSceneCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<TaskResponse> {
        // Delete the dialog for the current scene
        memory.set('dialog', []);
        memory.set('performance', undefined);

        // Prompt user with questions
        return Promise.resolve({ type: 'TaskResponse', status: 'success', message: input.question });
    }
}


import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";
import { SchemaBasedCommand, CommandSchema } from "../SchemaBasedCommand";
import { TaskResponse } from "../types";

const schema: CommandSchema = {
    type: "object",
    title: "math",
    description: "execute some javascript code to calculate a value",
    properties: {
        code: {
            type: "string",
            description: "javascript expression to evaluate"
        }
    },
    required: ["code"],
    returns: "the calculated value"
};

export interface MathCommandInput {
    code: string;
}

export class MathCommand extends SchemaBasedCommand<MathCommandInput> {
    public constructor(title?: string, description?: string) {
        super(schema, title, description);
    }

    public execute(input: MathCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<any> {
        try {
            return Promise.resolve(eval(input.code));
        } catch (err: unknown) {
            // Give feedback to the model that it wrote bad code
            const message = (err as any).toString();
            return Promise.resolve<TaskResponse>({ type: 'TaskResponse', status: 'error', message });
        }
    }
}
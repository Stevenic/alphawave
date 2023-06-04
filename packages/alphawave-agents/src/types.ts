import { PromptFunctions, PromptMemory, Tokenizer } from "promptrix";
import { PromptResponseStatus, Validation } from "alphawave";
import { Schema } from "jsonschema";

export interface Command<TInput = Record<string, any>> {
    readonly title: string;
    readonly description: string;
    readonly inputs: string|undefined;
    readonly output: string|undefined;
    execute(input: TInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<any>;
    validate(input: TInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<Validation>;
}

export type TaskResponseStatus = PromptResponseStatus | 'input_needed' | 'too_many_steps';

export interface TaskResponse {
    type: 'TaskResponse';
    status: TaskResponseStatus;
    message?: string;
}

export interface AgentThought {
    thoughts: {
        thought: string;
        reasoning: string;
        plan: string;
    };
    command: {
        name: string;
        input?: Record<string, any>;
    }
}

export const AgentThoughtSchema: Schema = {
    type: "object",
    properties: {
        thoughts: {
            type: "object",
            properties: {
                thought: { type: "string" },
                reasoning: { type: "string" },
                plan: { type: "string" }
            },
            required: ["thought", "reasoning", "plan"]
        },
        command: {
            type: "object",
            properties: {
                name: { type: "string" },
                input: { type: "object" }
            },
            required: ["name"]
        }
    },
    required: ["thoughts", "command"]
};

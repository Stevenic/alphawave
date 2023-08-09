import { PromptFunctions, PromptMemory, Tokenizer } from "promptrix";
import { PromptResponseStatus, Validation } from "alphawave";
import { Schema } from "jsonschema";

export interface Command<TInput = Record<string, any>> {
    readonly title: string;
    readonly description: string;
    readonly inputs: string|undefined;
    readonly output: string|undefined;
    execute(context: TaskContext, input: TInput): Promise<any>;
    validate(input: TInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<Validation>;
}

export interface TaskContext {
    readonly cancelled: boolean;
    readonly elapsed_time: number;
    readonly functions: PromptFunctions;
    readonly max_steps: number;
    readonly max_time: number;
    readonly memory: PromptMemory;
    readonly remaining_steps: number;
    readonly remaining_time: number;
    readonly step: number;
    readonly start_time: number;
    readonly status: TaskResponseStatus;
    readonly tokenizer: Tokenizer;
    cancel(): void;
    emitNewThought(thought: AgentThought): void;
    emitNewThought(thought: string, commandName: string, commandInput?: Record<string, any>): void;
    fork(): TaskContext;
    nextStep(): boolean;
    shouldContinue(): boolean;
}

export type TaskResponseStatus = PromptResponseStatus | 'input_needed' | 'too_many_steps' | 'too_much_time' | 'cancelled';

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

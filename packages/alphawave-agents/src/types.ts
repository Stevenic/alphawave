import { PromptFunctions, PromptMemory, Tokenizer } from "promptrix";
import { PromptResponseStatus, ResponseValidation } from "alphawave";

export interface Command<TInput = Record<string, any>> {
    readonly title: string;
    readonly description: string;
    readonly inputs: string|undefined;
    readonly output: string|undefined;
    execute(input: TInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<any>;
    validate(input: TInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<ResponseValidation>;
}

export type TaskResponseStatus = PromptResponseStatus | 'input_needed' | 'too_many_steps';

export interface TaskResponse {
    type: 'TaskResponse';
    status: TaskResponseStatus;
    message?: string;
}

export interface AgentThoughts {
    thoughts: {
        thought: string;
        reasoning: string;
        plan: string;
    };
    command: {
        name: string;
        input: Record<string, any>;
    }
}

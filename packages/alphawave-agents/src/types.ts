import { PromptMemory, PromptFunction, Tokenizer } from "promptrix";
import { PromptResponseValidation } from "alphawave";

export interface Command<TInput = Record<string, any>> {
    readonly title: string;
    readonly description: string;
    readonly inputs: string|undefined;
    readonly output: string|undefined;
    execute(input: TInput, memory: PromptMemory, functions: PromptFunction, tokenizer: Tokenizer): Promise<any>;
    validate(input: TInput, memory: PromptMemory, functions: PromptFunction, tokenizer: Tokenizer): Promise<PromptResponseValidation>;
}

export interface ValidatedCommandInput<TInput = Record<string, any>> extends PromptResponseValidation {
    /**
     * The cleaned and validated input.
     */
    input?: TInput;
}

import { PromptResponseValidator, ResponseValidation, PromptResponse } from "alphawave";
import { PromptFunctions, PromptMemory, Tokenizer } from "promptrix";
import { Command, AgentThoughts } from "./types";

export class AgentCommandValidator implements PromptResponseValidator {
    private readonly _commands: Map<string, Command>;
    public constructor(commands: Map<string, Command>) {
        this._commands = commands;
    }

    public async validateResponse(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse): Promise<ResponseValidation<AgentThoughts>> {
        return{} as any;
    }
}
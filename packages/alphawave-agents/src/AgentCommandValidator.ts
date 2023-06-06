import { PromptResponseValidator, Validation, PromptResponse, JSONResponseValidator } from "alphawave";
import { PromptFunctions, PromptMemory, Tokenizer } from "promptrix";
import { Command, AgentThought, AgentThoughtSchema } from "./types";

export class AgentCommandValidator implements PromptResponseValidator {
    private readonly _thoughtValidator = new JSONResponseValidator(AgentThoughtSchema, `No valid JSON objects were found in the response. Return a valid JSON object with your thoughts and the next command to perform.`);
    private readonly _commands: Map<string, Command>;

    public constructor(commands: Map<string, Command>) {
        this._commands = commands;
    }

    public async validateResponse(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse, remaining_attempts: number): Promise<Validation<AgentThought>> {
        // Validate that the response contains a thought
        const validationResult: Validation<AgentThought> = await this._thoughtValidator.validateResponse(memory, functions, tokenizer, response, remaining_attempts);
        if (!validationResult.valid) {
            return validationResult;
        }

        // Validate that the command exists
        const thought = validationResult.value as AgentThought;
        if (!this._commands.has(thought.command.name)) {
            return {
                type: 'Validation',
                valid: false,
                feedback: `The command "${thought.command.name}" does not exist. Try a different command.`
            };
        }

        // Validate that the command input is valid
        const command = this._commands.get(thought.command.name) as Command;
        const commandValidationResult = await command.validate(thought.command.input ?? {}, memory, functions, tokenizer);
        if (!commandValidationResult.valid) {
            return commandValidationResult;
        }

        // Return the validated thought
        return validationResult;
    }
}
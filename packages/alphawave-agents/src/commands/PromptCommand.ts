import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";
import { AlphaWave, AlphaWaveOptions, MemoryFork } from "alphawave";
import { SchemaBasedCommand, CommandSchema } from "../SchemaBasedCommand";
import { TaskResponse } from "../types";

export interface PromptCommandOptions extends AlphaWaveOptions {
    schema: CommandSchema;
}

export class PromptCommand extends SchemaBasedCommand {
    public readonly options: PromptCommandOptions;

    public constructor(options: PromptCommandOptions) {
        super(options.schema);
        this.options = options;
    }

    public async execute(input: Record<string, any>, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<TaskResponse|string> {
        // Fork memory and copy the input into the fork
        const fork = new MemoryFork(memory);
        const keys = Object.keys(input);
        for (const key of keys) {
            fork.set(key, input[key]);
        }

        // Create a wave and send it
        const options: AlphaWaveOptions = Object.assign({
            memory: fork,
            functions: functions,
            tokenizer: tokenizer
        }, this.options);
        const wave = new AlphaWave(options);
        const response = await wave.completePrompt();

        // Process the response
        const message = typeof response.message == "object" ? response.message.content : response.message;
        if (response.status === "success") {
            // Return the response
            return message
        } else {
            // Return the error
            return {
                type: "TaskResponse",
                status: response.status,
                message
            };
        }
    }
}
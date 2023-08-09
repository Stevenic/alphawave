import { AlphaWave, AlphaWaveOptions } from "alphawave";
import { SchemaBasedCommand, CommandSchema } from "../SchemaBasedCommand";
import { TaskContext, TaskResponse } from "../types";
import { Utilities } from "promptrix";

export interface PromptCommandOptions extends AlphaWaveOptions {
    schema: CommandSchema;
    parseResponse?: (context: TaskContext, response: string, input:Record<string, any>) => Promise<any>;
}

export class PromptCommand extends SchemaBasedCommand {
    public readonly options: PromptCommandOptions;

    public constructor(options: PromptCommandOptions, title?: string, description?: string) {
        super(options.schema, title, description);
        this.options = options;
    }

    public async execute(context: TaskContext, input: Record<string, any>): Promise<TaskResponse|string> {
        // Fork memory and copy the input into the fork
        const fork = context.fork();
        const keys = Object.keys(input);
        for (const key of keys) {
            fork.memory.set(key, input[key]);
        }

        // Create a wave and send it
        const options: AlphaWaveOptions = Object.assign({
            memory: fork.memory,
            functions: fork.functions,
            tokenizer: fork.tokenizer
        }, this.options);
        const wave = new AlphaWave(options);
        const response = await wave.completePrompt();

        // Process the response
        const message = typeof response.message == "object" ? response.message.content : response.message;
        if (response.status === "success") {
            // Return the response
            const parsed = this.options.parseResponse ? await this.options.parseResponse(fork, message, input) : message;
            return Utilities.toString(fork.tokenizer, parsed);
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
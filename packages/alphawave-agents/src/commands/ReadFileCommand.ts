import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";
import { SchemaBasedCommand } from "../SchemaBasedCommand";
import { ReadFileTool } from "langchain/tools";
import { BaseFileStore } from "langchain/schema";

export interface ReadFileConfig {
    store: BaseFileStore;
}

export interface ReadFileCommandInput {
    file_path: string;
}

export class ReadFileCommand extends SchemaBasedCommand<ReadFileCommandInput> {
    private readonly _tool: ReadFileTool;

    public constructor(config: ReadFileConfig) {
        super({
            type: "object",
            title: "read_file",
            description: "reads a file from disk",
            properties: {
                file_path: {
                    type: "string",
                    description: "name of file"
                }
            },
            required: ["file_path"],
            returns: "contents of file"
        });
        this._tool = new ReadFileTool(config);
    }

    public execute(input: ReadFileCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<string> {
        return this._tool.call(input.file_path);
    }
}
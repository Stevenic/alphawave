import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";
import { SchemaBasedCommand } from "../SchemaBasedCommand";
import { WriteFileTool } from "langchain/tools";
import { BaseFileStore } from "langchain/schema";

export interface WriteFileConfig {
    store: BaseFileStore;
}

export interface WriteFileCommandInput {
    file_path: string;
}

export class WriteFileCommand extends SchemaBasedCommand<WriteFileCommandInput> {
    private readonly _tool: WriteFileTool;

    public constructor(config: WriteFileConfig) {
        super({
            type: "object",
            title: "write_file",
            description: "writes a file to disk",
            properties: {
                file_path: {
                    type: "string",
                    description: "name of file"
                },
                text: {
                    type: "string",
                    description: "text to write to file"
                }
            },
            required: ["file_path", "text"],
            returns: "success or failure confirmation"
        });
        this._tool = new WriteFileTool(config);
    }

    public execute(input: WriteFileCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<string> {
        return this._tool.call(input);
    }
}
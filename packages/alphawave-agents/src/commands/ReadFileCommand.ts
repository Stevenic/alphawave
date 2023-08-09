import { SchemaBasedCommand } from "../SchemaBasedCommand";
import { ReadFileTool } from "langchain/tools";
import { BaseFileStore } from "langchain/schema";
import { TaskContext } from "../types";

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

    public execute(context: TaskContext, input: ReadFileCommandInput): Promise<string> {
        return this._tool.call(input.file_path);
    }
}
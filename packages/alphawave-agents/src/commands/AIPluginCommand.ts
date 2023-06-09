import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";
import { SchemaBasedCommand } from "../SchemaBasedCommand";
import { AIPluginTool  } from "langchain/tools";

export interface APIPluginConfig {
    name: string;
    description: string;
    apiSpec: string;
}

export interface AIPluginCommandInput {
    input: string;
}

export class AIPluginCommand extends SchemaBasedCommand<AIPluginCommandInput> {
    private readonly _tool: AIPluginTool;

    public constructor(config: APIPluginConfig) {
        super({
            type: "object",
            title: config.name,
            description: config.description,
            returns: "usage guide and OpenAI spec"
        });
        this._tool = new AIPluginTool(config);
    }

    public execute(input: AIPluginCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<string> {
        return this._tool.call(input);
    }

    public static async fromPluginUrl(url: string): Promise<AIPluginCommand> {
        const tool = await AIPluginTool.fromPluginUrl(url);
        return new AIPluginCommand({ name: tool.name, description: tool.description, apiSpec: tool.apiSpec });
    }
}
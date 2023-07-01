import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";
import { PromptCompletionModel } from "alphawave";
import { LangChainModel } from "alphawave-langchain";
import { SchemaBasedCommand } from "../SchemaBasedCommand";
import { VectorStoreQATool } from "langchain/tools";
import { VectorStore } from "langchain/vectorstores";

export interface VectorStoreQAConfig {
    name: string;
    description: string;
    vectorStore: VectorStore;
    model: PromptCompletionModel;
  }

export interface VectorStoreQACommandInput {
    question: string;
}

export class VectorStoreQACommand extends SchemaBasedCommand<VectorStoreQACommandInput> {
    private readonly _config: VectorStoreQAConfig;

    public constructor(config: VectorStoreQAConfig) {
        super({
            type: "object",
            title: config.name,
            description: `Useful for when you need to answer questions about ${config.name}. Whenever you need information about ${config.description} you should ALWAYS use this.`,
            properties: {
                question: {
                    type: "string",
                    description: "fully formed question"
                }
            },
            required: ["question"],
            returns: "answer"
        });
        this._config = config;
    }

    public execute(input: VectorStoreQACommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<string> {
        // Create LLM wrapper for AlphaWave client
        const llm = new LangChainModel(this._config.model, {
            memory,
            functions,
            tokenizer
        });

        // Create and call tool
        const { name, description } = this._config;
        const tool = new VectorStoreQATool(name, description, {
            vectorStore: this._config.vectorStore,
            llm
        });
        return tool.call(input.question);
    }
}
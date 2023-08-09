import { SchemaBasedCommand } from "../SchemaBasedCommand";
import { SerpAPI, SerpAPIParameters } from "langchain/tools";
import { TaskContext } from "../types";

export interface SerpAPICommandInput {
    query: string;
}

export class SerpAPICommand extends SchemaBasedCommand<SerpAPICommandInput> {
    private readonly _tool: SerpAPI;

    public constructor(apiKey?: string, params?: Partial<SerpAPIParameters>, baseUrl?: string) {
        super({
            type: "object",
            title: "bing-search",
            description: "a search engine. useful for when you need to answer questions about current events.",
            properties: {
                query: {
                    type: "string",
                    description: "search query"
                }
            },
            required: ["query"],
            returns: "search results"
        });
        this._tool = new SerpAPI(apiKey, params, baseUrl);
    }

    public execute(context: TaskContext, input: SerpAPICommandInput): Promise<string> {
        return this._tool.call(input.query);
    }
}
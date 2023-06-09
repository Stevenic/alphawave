import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";
import { SchemaBasedCommand } from "../SchemaBasedCommand";
import axios, { AxiosInstance } from 'axios';

export interface BingSearchCommandOptions {
    apiKey: string;
    params?: Record<string, string>;
    endpoint?: string;
    include_snippets?: boolean;
    max_tokens?: number;
    unique_hosts?: boolean;
}

export interface BingSearchCommandInput {
    query: string;
}

export class BingSearchCommand extends SchemaBasedCommand<BingSearchCommandInput> {
    private readonly _options: BingSearchCommandOptions;
    private readonly _endpoint: string;
    private readonly _httpClient: AxiosInstance;

    public constructor(options: BingSearchCommandOptions, title?: string, description?: string) {
        super({
            type: "object",
            title: title ?? "bingSearch",
            description: description ?? "a search engine. useful for when you need to answer questions about current events.",
            properties: {
                query: {
                    type: "string",
                    description: "search query"
                }
            },
            required: ["query"],
            returns: "search results"
        });
        this._options = Object.assign({
            params: {},
            include_snippets: false,
            max_tokens: 250,
            unique_hosts: true
        }, options);
        this._endpoint = (options.endpoint ?? "https://api.bing.microsoft.com/").trim();
        this._httpClient = axios.create();

        // Ensure the endpoint has a trailing slash
        if (!this._endpoint.endsWith('/')) {
            this._options.endpoint += "/";
        }
    }

    public async execute(input: BingSearchCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<string> {
        const headers = {
            "Ocp-Apim-Subscription-Key": this._options.apiKey,
            "Accept": "application/json"
        };
        const params = Object.assign({
            count: "20",
            textDecorations: "false"
        }, this._options.params, { q: input.query });
        const searchUrl = new URL(`${this._endpoint}v7.0/search`);

        Object.entries(params).forEach(([key, value]) => {
          searchUrl.searchParams.append(key, value);
        });

        // Fetch the search results
        try {
            const response = await this._httpClient.get(searchUrl.toString(), { headers });

            // Check for no results
            const results = response.data?.webPages?.value;
            if (!Array.isArray(results) || results.length === 0) {
                return "no results found";
            }

            // Render search results
            let tokens = 0;
            const output: string[] = [];
            const hosts: Map<string, boolean> = new Map();
            for (const result of results) {
                // Check for unique domains
                if (this._options.unique_hosts) {
                    const host = new URL(result.url).hostname;
                    if (hosts.has(host)) {
                        continue;
                    } else {
                        hosts.set(host, true);
                    }
                }

                // Create the result entry
                let entry = `[${result.name}](${result.url})`;
                if (this._options.include_snippets) {
                    entry += `\n${result.snippet}\n`
                }

                // Will it fit?
                let length = tokenizer.encode(entry).length + (tokens > 0 ? 1 : 0);
                if ((tokens + length) > this._options.max_tokens!) {
                    break;
                }

                // Add result to output
                output.push(entry);
                tokens += length;
            }

            // Return generated output
            return output.join('\n');
        } catch (error) {
            return "Error calling bing search API";
        }
   }
}
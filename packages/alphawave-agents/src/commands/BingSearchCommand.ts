import { PromptCompletionClient, PromptCompletionOptions, EmbeddingsClient, MemoryFork, JSONResponseValidator, AlphaWave } from "alphawave";
import { PromptMemory, PromptFunctions, Tokenizer, Prompt, UserMessage } from "promptrix";
import { SchemaBasedCommand } from "../SchemaBasedCommand";
import axios, { AxiosInstance } from 'axios';
import { WebBrowserCommand, WebBrowserCommandOptions } from "./WebBrowserCommand";

const DEFAULT_MAX_TOKENS = 250;
const DEFAULT_MAX_SEARCH_TIME = 60000;

export interface BingSearchCommandOptions {
    apiKey: string;
    params?: Record<string, string>;
    endpoint?: string;
    include_snippets?: boolean;
    max_tokens?: number;
    unique_hosts?: boolean;
    deep_search?: WebBrowserCommandOptions;
}

export interface BingSearchCommandInput {
    query: string;
}

export class BingSearchCommand extends SchemaBasedCommand<BingSearchCommandInput> {
    private readonly _options: BingSearchCommandOptions;
    private readonly _deepSearch?: WebBrowserCommandOptions;
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
            unique_hosts: true
        }, options);
        this._endpoint = (options.endpoint ?? "https://api.bing.microsoft.com/").trim();
        this._httpClient = axios.create();

        // Ensure the endpoint has a trailing slash
        if (!this._endpoint.endsWith('/')) {
            this._options.endpoint += "/";
        }

        // Check for deep search
        if (this._options.deep_search) {
            this._deepSearch = Object.assign({
                log_activity: false
            }, this._options.deep_search);
        }
    }

    public async execute(input: BingSearchCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<string> {
        // Fetch the search results
        let results: SearchResult[] = [];
        try {
            results = await this.fetchSearchResults(input.query);
        } catch (error) {
            return "Error calling bing search API";
        }

        // Check for no results
        if (results.length === 0) {
            return "No results found";
        }

        // Check for deep search
        if (this._deepSearch) {
            return await this.executeDeepSearch(input.query, results, memory, functions, tokenizer);
        }

        // Generate formatted results
        let tokens = 0;
        const maxTokens = this._options.max_tokens ?? DEFAULT_MAX_TOKENS;
        const output: string[] = [];
        for (const result of results) {
            // Generate entry
            const entry = `[${result.name}](${result.url})` + (this._options.include_snippets ? `\n${result.snippet}\n` : ``);
            const length = tokenizer.encode(entry).length + (tokens > 0 ? 1 : 0);

            // Check for max tokens
            if (tokens + length > maxTokens) {
                break;
            }

            // Add entry to output
            output.push(entry);
            tokens += length;
        }

        // Return the formatted results
        return output.join("\n");
   }

   private async fetchSearchResults(query: string): Promise<SearchResult[]> {
        const headers = {
            "Ocp-Apim-Subscription-Key": this._options.apiKey,
            "Accept": "application/json"
        };
        const params = Object.assign({
            count: "20",
            textDecorations: "false"
        }, this._options.params, { q: query });
        const searchUrl = new URL(`${this._endpoint}v7.0/search`);

        Object.entries(params).forEach(([key, value]) => {
            searchUrl.searchParams.append(key, value);
        });

       // Fetch the search results
        const response = await this._httpClient.get(searchUrl.toString(), { headers });

        // Check for no results
        const results = response.data?.webPages?.value;
        if (!Array.isArray(results) || results.length === 0) {
            return [];
        }

        // Filter search results
        const output: SearchResult[] = [];
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

            // Add result to output
            output.push({
                url: result.url,
                name: result.name,
                snippet: result.snippet
            });
        }

        // Return filtered results
        return output;
    }

    private async executeDeepSearch(query: string, results: SearchResult[], memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<string> {
        const startTime = Date.now();
        const stopTime = startTime + (this._deepSearch!.max_search_time ?? DEFAULT_MAX_SEARCH_TIME);

        // Fork the memory for the deep search
        const fork = new MemoryFork(memory);
        for (const result of results) {
            // Create a WebBrowser command
            const options = Object.assign({}, this._deepSearch, { max_search_time: stopTime - Date.now() });
            const webBrowser = new WebBrowserCommand(options);

            // Read the page
            const answer = await webBrowser.execute({ url: result.url, query: query }, fork, functions, tokenizer);
            if (typeof answer === "string") {
                return answer;
            } else if (answer.answered && answer.answer) {
                return `url: ${result.url}\n\n${answer.answer}`;
            }

            // Check for max search time
            if (Date.now() > stopTime) {
                return "Max search time exceeded";
            }
        }

        return `answer not found`;
    }
}

interface SearchResult {
    url: string;
    name: string;
    snippet: string;
}

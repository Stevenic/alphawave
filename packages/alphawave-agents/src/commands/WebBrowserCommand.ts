import { UserMessage } from "promptrix";
import { AlphaWave } from "alphawave";
import { SchemaBasedCommand } from "../SchemaBasedCommand";
import { WebPageSearchCommand, WebPageSearchCommandOptions, WebPageSearchResult } from "./WebPageSearchCommand";
import { WebUtilities } from "../WebUtilities";
import { TaskContext } from "../types";


export interface WebBrowserCommandOptions extends WebPageSearchCommandOptions {
    /**
     * Maximum number of pages to search.
     * @remarks
     * The WebBrowserCommand can search related pages when this value is greater than 1. The
     * default is `1`.
     */
    max_page_depth?: number;

    /**
     * Whether or not to log activity to the console.
     * @remarks
     * Defaults to false.
     */
    log_activity?: boolean;
}

export interface WebBrowserCommandInput {
    url: string;
    query?: string;
}

export class WebBrowserCommand extends SchemaBasedCommand<WebBrowserCommandInput> {
    private readonly _options: WebBrowserCommandOptions;

    public constructor(options: WebBrowserCommandOptions) {
        super({
            type: "object",
            title: "webBrowser",
            description: `useful for when you need to find something on or summarize a webpage.`,
            properties: {
                url: {
                    type: "string",
                    description: "valid http/https URL including protocol"
                },
                query: {
                    type: "string",
                    description: "optional query or question to search for on the page"
                }
            },
            required: ["url"],
            returns: "answer or summary"
        });
        this._options = options;
    }

    public async execute(context: TaskContext, input: WebBrowserCommandInput): Promise<WebPageSearchResult|string> {
        try {
            if (input.query) {
                // Create a WebPageSearch command to use
                const search = new WebPageSearchCommand(this._options);

                // Read through n pages looking for an answer
                let { url, query } = input;
                const maxDepth = this._options.max_page_depth ?? 1;
                const visited = new Set<string>();
                for (let i = 0; i < maxDepth; i++) {
                    visited.add(url.toLowerCase());

                    // Log activity
                    if (this._options.log_activity) {
                        if (i == 0) {
                            context.emitNewThought(`I'm searching this page: ${url}`, this.title, input);
                        } else {
                            context.emitNewThought(`I'm searching a link I clicked on: ${url}`, this.title, input);
                        }
                    }

                    // Search page
                    const result = await search.execute(context, { url, query });
                    if (result.answered) {
                        // Return result
                        return result;
                    } else if (result.error) {
                        // Return error
                        return result.error;
                    } else if (result.next_page) {
                        // Check for timeout
                        if (!context.nextStep()) {
                            return `max search time exceeded`;
                        }

                        // Read next page
                        url = result.next_page;

                        // Don't visit the same url twice
                        if (visited.has(url.toLowerCase())) {
                            // Done searching
                            break;
                        }
                    } else {
                        // Done searching
                        break;
                    }
                }

                // If we get here, we didn't find an answer
                return {
                    url: input.url,
                    answered: false,
                    answer: `no answer found`,
                };
            } else {
                // Log activity
                if (this._options.log_activity) {
                    context.emitNewThought(`I'm summarizing the page at ${input.url}`, this.title, input);
                }

                // Load page and extract text
                let page = '';
                try {
                    page = await this.fetchPageText(input.url);
                } catch (err: unknown) {
                    return {
                        url: input.url,
                        answered: false,
                        error: (err as any).toString()
                    };
                }

                // Get the first n tokens of page text for context
                const maxTokens = (this._options.max_input_tokens ?? 1024) - 200;
                const encoded = context.tokenizer.encode(page);
                const text = encoded.length <= maxTokens ? page : context.tokenizer.decode(encoded.slice(0, maxTokens));


                // Fork memory and set template values
                const fork = context.fork();
                fork.memory.set("url", input.url);
                fork.memory.set("text", text);

                // Initialize the prompt
                const prompt = new UserMessage([
                    `url: {{$url}}`,
                    `text:\n{{$text}}\n`,
                    `Generate a summary of the page text above.`
                ].join('\n'));

                // Create wave and complete prompt
                const wave = new AlphaWave({
                    prompt,
                    model: this._options.model,
                    memory: fork.memory,
                });
                const response = await wave.completePrompt<string>();
                if (typeof response.message === "string") {
                    return `${response.status} while search for answer: ${response.message}`;
                }

                return response.message.content!;
            }
        } catch (err: unknown) {
            return (err as any).toString();
        }
    }

    private async fetchPageText(url: string): Promise<string> {
        const html = await WebUtilities.fetchPage(url, this._options.headers ?? {}, this._options.axios_config ?? {});
        switch (this._options.parse_mode ?? "text") {
            default:
            case "text":
                return WebUtilities.extractText(html, url, false);
            case "markdown":
                return WebUtilities.htmlToMarkdown(html, url);
            case "html":
                return html;
        }
    }
}
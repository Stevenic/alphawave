import { Tokenizer, UserMessage } from "promptrix";
import { PromptCompletionModel, EmbeddingsModel, MemoryFork, AlphaWave, JSONResponseValidator } from "alphawave";
import { LangChainEmbeddings } from "alphawave-langchain";
import { AxiosRequestConfig } from "axios";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "langchain/document";
import { SchemaBasedCommand } from "../SchemaBasedCommand";
import { WebUtilities } from "../WebUtilities";
import { TaskContext } from "../types";

export type WebPageParseMode = "text" | "markdown" | "html";

export interface WebPageSearchCommandOptions {
    model: PromptCompletionModel;
    embeddings: EmbeddingsModel;
    axios_config?: Omit<AxiosRequestConfig, "url">;
    chunk_size?: number;
    chunk_overlap?: number;
    headers?: Record<string, any>;
    parse_mode?: WebPageParseMode;
    max_input_tokens?: number;
}

export interface WebPageSearchCommandInput {
    url: string;
    query?: string;
}

export interface WebPageSearchResult {
    url: string;
    answered: boolean;
    answer?: string;
    next_page?: string;
    error?: string;
}

export class WebPageSearchCommand extends SchemaBasedCommand<WebPageSearchCommandInput> {
    private readonly _options: WebPageSearchCommandOptions;

    public constructor(options: WebPageSearchCommandOptions, title?: string, description?: string) {
        super({
            type: "object",
            title: "webPageSearch",
            description: `searches an individual web page for information or asks a question of the page.`,
            properties: {
                url: {
                    type: "string",
                    description: "valid http/https URL including protocol"
                },
                query: {
                    type: "string",
                    description: "query or question to search for on the page"
                }
            },
            required: ["url", "query"],
            returns: "answer if found, otherwise relevant links to search"
        }, title, description);
        this._options = options;
    }

    public async execute(context: TaskContext, input: WebPageSearchCommandInput): Promise<WebPageSearchResult> {
        try {
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

            // Get semantically relevant text to use as context
            const maxInputTokens = this._options.max_input_tokens ?? 1024;
            const text = await this.getTextChunks(page, input, context.tokenizer, maxInputTokens - 200);

            // Fork memory and set template values
            const fork = new MemoryFork(context.memory);
            fork.set("url", input.url);
            fork.set("text", text);
            fork.set("query", input.query);

            // Initialize the prompt
            const prompt = new UserMessage([
                `page url:\n{{$url}}\n`,
                `page text:\n{{$text}}\n`,
                `query:\n{{$query}}\n`,
                `Return either the answer or the best page to search next using this JSON structure {"answered": <true|false>, "answer": "<detailed answer to question>", "next_page": "<url of page to search next>"}\n`,
            ].join('\n'));

            // Create a response validator for answer evaluator
            const answerValidator = new JSONResponseValidator<WebPageSearchResult>({
                type: "object",
                properties: {
                    answered: {
                        type: "boolean"
                    },
                    answer: {
                        type: "string"
                    },
                    next_page: {
                        type: "string"
                    }
                },
                required: ["answered"]
            });


            // Create wave and complete prompt
            const wave = new AlphaWave({
                prompt,
                model: this._options.model,
                memory: fork,
                validator: answerValidator,
            });
            const response = await wave.completePrompt<WebPageSearchResult>();
            if (typeof response.message === "string") {
                return {
                    url: input.url,
                    answered: false,
                    error: `${response.status} while search for answer: ${response.message}`
                };
            }

            // Cleanup response
            const output = response.message.content!;
            output.url = input.url;
            if (output.answered) {
                if (!output.answer) {
                    output.answered = false;
                } else if (output.next_page) {
                    delete output.next_page;
                }
            } else if (output.answer) {
                delete output.answer;
            }

            return output;
        } catch (err: unknown) {
            return {
                url: input.url,
                answered: false,
                error: (err as any).toString()
            };
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

    private async getTextChunks(text: string, input: WebPageSearchCommandInput, tokenizer: Tokenizer, max_tokens: number): Promise<string> {
        // Use the whole text if it fits
        const totalLength = tokenizer.encode(text).length;
        if (totalLength <= max_tokens) {
            return text;
        }

        // Split the text into chunks
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: this._options.chunk_size ?? 1600,
            chunkOverlap: this._options.chunk_overlap ?? 200,
        });
        const texts = await textSplitter.splitText(text);

        // Convert the chunks to documents
        const docs = texts.map(pageContent => new Document({ pageContent, metadata: [] }));

        // Add them to an in-memory vector store
        const embeddings = new LangChainEmbeddings(this._options.embeddings);
        const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

        // Query for the chunks and add as many will fit into the context
        let tokenCount = 0;
        let context = '';
        const results = await vectorStore.similaritySearch(input.query!, 10);
        for (const result of results) {
            const tokens = tokenizer.encode(result.pageContent);
            if (tokenCount + tokens.length > max_tokens) {
                break;
            }
            context += result.pageContent + "\n";
            tokenCount += tokens.length;
        }

        return context;
    }
}
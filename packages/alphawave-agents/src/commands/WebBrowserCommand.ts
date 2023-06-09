import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";
import { PromptCompletionClient, PromptCompletionOptions, EmbeddingsClient } from "alphawave";
import { PromptCompletionModel, EmbeddingsModel } from "alphawave-langchain";
import { AxiosRequestConfig } from "axios";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "langchain/document";
import { SchemaBasedCommand } from "../SchemaBasedCommand";
import { WebUtilities } from "../WebUtilities";

const ALLOWED_CONTENT_TYPES = [
    "text/html",
    "application/json",
    "application/xml",
    "application/javascript",
    "text/plain",
];


const DEFAULT_HEADERS = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "en-US,en;q=0.5",
    "Alt-Used": "LEAVE-THIS-KEY-SET-BY-TOOL",
    Connection: "keep-alive",
    Host: "LEAVE-THIS-KEY-SET-BY-TOOL",
    Referer: "https://www.google.com/",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/111.0",
};



export interface WebBrowserCommandOptions {
    prompt_client: PromptCompletionClient;
    prompt_options: PromptCompletionOptions;
    embeddings_client: EmbeddingsClient;
    embeddings_model: string;
    headers?: Record<string, any>;
    axiosConfig?: Omit<AxiosRequestConfig, "url">;
}

export interface WebBrowserCommandInput {
    url: string;
    question?: string;
}

export class WebBrowserCommand extends SchemaBasedCommand<WebBrowserCommandInput> {
    private readonly _options: WebBrowserCommandOptions;
    private readonly _headers: Record<string, any>;

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
                question: {
                    type: "string",
                    description: "Optional question to ask of the page the page"
                }
            },
            required: ["url"],
            returns: "answer or summary"
        });
        this._options = options;
        this._headers = Object.assign({}, DEFAULT_HEADERS, options.headers);
    }

    public async execute(input: WebBrowserCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<string> {
        // Create model wrapper for AlphaWave client
        const model = new PromptCompletionModel({
            client: this._options.prompt_client,
            prompt_options: this._options.prompt_options,
            memory,
            functions,
            tokenizer
        });

        // Create embeddings wrapper for AlphaWave client
        const embeddings = new EmbeddingsModel({
            client: this._options.embeddings_client,
            model: this._options.embeddings_model
        });

        // Load page and extract text
        let text;
        const summarize = !input.question;
        try {
            const url = input.url;
            const html = await WebUtilities.fetchPage(url, this._headers, this._options.axiosConfig ?? {}, ALLOWED_CONTENT_TYPES);
            text = WebUtilities.extractText(html, url, summarize);
        } catch (err: unknown) {
            return (err as any).toString();
        }

        // Are we summarizing?
        let prompt = `url: ${input.url}\ntext:\n`;
        let context: string = '';
        const tokenBudget = (this._options.prompt_options.max_tokens ?? 1024) * 0.8;
        if (summarize) {
            // Take the first n tokens of text
            const tokens = tokenizer.encode(text);
            if (tokens.length > tokenBudget) {
                context = tokenizer.decode(tokens.slice(0, tokenBudget));
            } else {
                context = text;
            }

            // Create prompt
            prompt += context + `\n\n- Summarize the text above.\n- In a separate section, include up to 5 relevant links (include title and url) formatted as \`["<title>"]("<url>")\``;
        } else {
            // Split the text into chunks
            const textSplitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1600,
                chunkOverlap: 200,
            });
            const texts = await textSplitter.splitText(text);

            // Convert the chunks to documents
            const docs = texts.map(pageContent => new Document({ pageContent, metadata: [] }));

            // Add them to an in-memory vector store
            const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

            // Query for the chunks and add as many will fit into the context
            const results = await vectorStore.similaritySearch(input.question!, 10);
            let tokenCount = 0;
            for (const result of results) {
                const tokens = tokenizer.encode(result.pageContent);
                if (tokenCount + tokens.length > tokenBudget) {
                    break;
                }
                context += result.pageContent + "\n";
                tokenCount += tokens.length;
            }

            // Create prompt
            prompt += context + `\n\n- Use the text above to answer "${input.question}"\n- Keep your answer ground in the facts of the text.\n- Return "answer not found" if the answer isn't in the text.`;
        }

        return model.predict(prompt);
    }
}
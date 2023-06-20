import { PromptCompletionModel, PromptResponse } from "alphawave";
import { Message, Prompt, PromptFunctions, PromptMemory, TextSection, Tokenizer, VolatileMemory, FunctionRegistry, GPT3Tokenizer, PromptSection } from "promptrix";
import { BaseChatModel } from "langchain/chat_models/base";
import { BaseLanguageModel, BaseLanguageModelCallOptions } from "langchain/base_language";
import { Callbacks, CallbackManagerForLLMRun } from "langchain/callbacks";
import { AIChatMessage, BaseChatMessage, ChatResult, ChatMessage, SystemChatMessage, HumanChatMessage, FunctionChatMessage } from "langchain/schema";


export interface LangChainModelOptions {
    memory: PromptMemory;
    functions: PromptFunctions;
    tokenizer: Tokenizer;
    max_input_tokens: number;
    call_options?: BaseLanguageModelCallOptions | string[];
    callbacks?: Callbacks;
}

/**
 * An adaptor that lets embeddings from either AlphaWave or LangChain.JS work in either library.
 */
export class LangChainModel extends BaseChatModel implements PromptCompletionModel {
    private readonly _instance: PromptCompletionModel|BaseLanguageModel;
    private readonly _options: LangChainModelOptions;

    /**
     * Creates a new `LangChainModel` instance.
     * @param instance Model instance being adapted.
     * @param options Optional. Settings used to render prompts when `instance` is a `PromptCompletionModel`.
     */
    public constructor(instance: PromptCompletionModel|BaseLanguageModel, options?: Partial<LangChainModelOptions>) {
        super({});
        this._instance = instance;
        this._options = Object.assign({
            memory: new VolatileMemory(),
            functions: new FunctionRegistry(),
            tokenizer: new GPT3Tokenizer(),
            max_input_tokens: 4000,
        }, options);
    }

    /**
     * Returns the model instance that's being adapted.
     */
    public get instance(): PromptCompletionModel|BaseLanguageModel {
        return this._instance;
    }

    /**
     * Returns true if the instance being adapted is an AlphaWave based `EmbeddingsModel`.
     */
    public get isAlphaWaveInstance(): boolean {
        return typeof (this.instance as PromptCompletionModel).completePrompt == 'function';
    }

    /**
     * @private
     */
    public _combineLLMOutput?(...llmOutputs: (Record<string, any> | undefined)[]): Record<string, any> | undefined {
        if (this.isAlphaWaveInstance) {
            return [];
        } else {
            return (this.instance as BaseChatModel)._combineLLMOutput?(llmOutputs) : [];
        }
    }

    /**
     * @private
     */
    public _llmType(): string {
        if (this.isAlphaWaveInstance) {
            return 'AlphaWaveModel';
        } else {
            return (this._instance as BaseChatModel)._llmType();
        }
    }

    /**
     * @private
     */
    public async _generate(messages: BaseChatMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun | undefined): Promise<ChatResult> {
        if (this.isAlphaWaveInstance) {
            const { memory, functions, tokenizer } = this._options;

            // Create a prompt
            const prompt = new Prompt(messages.map((message) => {
                switch (message._getType()) {
                    case 'human':
                        return new TextSection(message.text, 'user');
                    case 'ai':
                        return new TextSection(message.text, 'assistant');
                    case 'system':
                        return new TextSection(message.text, 'system');
                    case 'function':
                        return new TextSection(message.text, 'function');
                    case 'generic':
                        return new TextSection(message.text, (message as ChatMessage).role);
                    default:
                        throw new Error(`Got unknown type ${message}`);
                }
            }));

            // Complete the prompt
            const response = await (this._instance as PromptCompletionModel).completePrompt(memory, functions, tokenizer, prompt);
            if (response.status == 'success') {
                const text = (response.message as Message).content;
                return {
                    generations: [{
                        text: text!,
                        message: new AIChatMessage(text!)
                    }]
                };
            } else {
                throw new Error(`Prompt ${response.status} error: ${response.message}`);
            }
        } else {
            const message = await (this._instance as BaseLanguageModel).predictMessages(messages, options, this.callbacks);
            return {
                generations: [{
                    text: message.text,
                    message
                }]
            };
        }
    }

     /**
     * @private
     */
    public async completePrompt(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, prompt: PromptSection): Promise<PromptResponse> {
        if (this.isAlphaWaveInstance) {
            return await (this.instance as PromptCompletionModel).completePrompt(memory, functions, tokenizer, prompt);
        } else {
            try {
                // Render prompt to message array
                const messages = await prompt.renderAsMessages(memory, functions, tokenizer, this._options.max_input_tokens);

                // Convert to LangChain chat messages
                const chatMessages: BaseChatMessage[] = messages.output.map((m) => {
                    switch (m.role) {
                        default:
                        case 'user':
                            return new HumanChatMessage(m.content!);
                        case 'assistant':
                            return new AIChatMessage(m.content!);
                        case 'system':
                            return new SystemChatMessage(m.content!);
                        case 'function':
                            return new FunctionChatMessage(m.content!, m.name!);
                    }
                });

                // Call model
                const chatMsg = await (this.instance as BaseLanguageModel).predictMessages(chatMessages, this._options.call_options, this._options.callbacks);

                // Convert to AlphaWave message
                let message: Message
                switch (chatMsg._getType()) {
                    case 'ai':
                        return { status: 'success'}
                }
            } catch (err: unknown) {
                return {
                    status: 'error',
                    message: (err as any).toString()
                };
            }
        }
    }
}
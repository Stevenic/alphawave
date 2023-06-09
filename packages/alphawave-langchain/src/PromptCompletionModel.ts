import { PromptCompletionClient, PromptCompletionOptions } from "alphawave";
import { Message, Prompt, PromptFunctions, PromptMemory, TextSection, Tokenizer } from "promptrix";
import { BaseChatModel } from "langchain/chat_models/base";
import { CallbackManagerForLLMRun } from "langchain/dist/callbacks/manager";
import { AIChatMessage, BaseChatMessage, ChatResult, ChatMessage } from "langchain/schema";

export interface PromptCompletionModelOptions {
    client: PromptCompletionClient;
    prompt_options: PromptCompletionOptions;
    memory: PromptMemory;
    functions: PromptFunctions;
    tokenizer: Tokenizer;
}

/**
 * Adapts an AlphaWave `PromptCompletionClient` to a LangChain compatible model.
 */
export class PromptCompletionModel extends BaseChatModel {
    /**
     * Creates a new `PromptCompletionModel` instance.
     * @param options The options for the model.
     */
    public constructor(public readonly options: PromptCompletionModelOptions) {
        super({});
    }

    /**
     * @private
     */
    public _combineLLMOutput?(...llmOutputs: (Record<string, any> | undefined)[]): Record<string, any> | undefined {
        return [];
    }

    /**
     * @private
     */
    public _llmType(): string {
        return 'AlphaWavePrompt';
    }

    /**
     * @private
     */
    public async _generate(messages: BaseChatMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun | undefined): Promise<ChatResult> {
        const { client, prompt_options, memory, functions, tokenizer } = this.options;

        // Create a prompt
        const prompt = new Prompt(messages.map((message) => {
            if (message._getType() === "human") {
                return new TextSection(message.text, 'user');
            } else if (message._getType() === "ai") {
                return new TextSection(message.text, 'assistant');
            } else if (message._getType() === "system") {
                return new TextSection(message.text, 'system');
            } else if (message._getType() === "generic") {
                return new TextSection(message.text, (message as ChatMessage).role);
            } else {
                throw new Error(`Got unknown type ${message}`);
            }
        }));

        // Complete the prompt
        const response = await client.completePrompt(memory, functions, tokenizer, prompt, prompt_options);
        if (response.status == 'success') {
            const text = (response.message as Message).content;
            return {
                generations: [{
                    text,
                    message: new AIChatMessage(text)
                }]
            };
        } else {
            throw new Error(`Prompt ${response.status} error: ${response.message}`);
        }
    }
}
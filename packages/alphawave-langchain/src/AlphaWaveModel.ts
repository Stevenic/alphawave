import { AlphaWave, AlphaWaveOptions } from "alphawave";
import { Message, Prompt, TextSection } from "promptrix";
import { BaseChatModel } from "langchain/chat_models/base";
import { CallbackManagerForLLMRun } from "langchain/dist/callbacks/manager";
import { AIChatMessage, BaseChatMessage, ChatResult, ChatMessage } from "langchain/schema";

/**
 * An AlphaWave as a LangChain compatible model.
 */
export class AlphaWaveModel extends BaseChatModel {
    /**
     * Creates a new `AlphaWaveModel` instance.
     * @param options The options for the wave.
     */
    public constructor(public readonly options: Omit<AlphaWaveOptions, "prompt">) {
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
        return 'AlphaWave';
    }

    /**
     * @private
     */
    public async _generate(messages: BaseChatMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun | undefined): Promise<ChatResult> {
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

        // Create a wave
        const wave = new AlphaWave({
            prompt,
            ...this.options
        });

        // Complete the prompt
        const response = await wave.completePrompt();
        if (response.status == 'success') {
            let text: string;
            const content = (response?.message as Message).content;
            if (content === undefined || content === null) {
                text = '';
            } else if (Array.isArray(content) || (typeof content == 'object' && typeof (content as Date).toISOString  == 'function')) {
                text = JSON.stringify(content);
            } else {
                text = content.toString();
            }

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
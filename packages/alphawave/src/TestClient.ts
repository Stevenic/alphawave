import { Message, PromptFunctions, PromptMemory, PromptSection, Tokenizer } from "promptrix";
import { PromptCompletionClient, PromptCompletionOptions, PromptResponse, PromptResponseStatus } from "./types";

export class TestClient implements PromptCompletionClient {
    public constructor(status: PromptResponseStatus = 'success', response: string|Message = { role: 'assistant', content: "Hello World" }) {
        this.status = status;
        this.response = response;
    }

    public status: PromptResponseStatus;
    public response: string|Message<any>;


    public async completePrompt(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, prompt: PromptSection, options: PromptCompletionOptions): Promise<PromptResponse> {
        return { status: this.status, message: this.response };
    }
}
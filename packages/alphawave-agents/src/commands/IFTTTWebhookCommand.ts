import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";
import { SchemaBasedCommand } from "../SchemaBasedCommand";
import { IFTTTWebhook } from "langchain/tools";

export interface IFTTTWebhookCommandInput {
    input: string;
}

export class IFTTTWebhookCommand extends SchemaBasedCommand<IFTTTWebhookCommandInput> {
    private readonly _tool: IFTTTWebhook;

    public constructor(url: string, name: string, description: string, input_description: string = "input text", output_description: string = "output text") {
        super({
            type: "object",
            title: name,
            description: description,
            properties: {
                input: {
                    type: "string",
                    description: input_description
                }
            },
            required: ["input"],
            returns: output_description
        });
        this._tool = new IFTTTWebhook(url, name, description);
    }

    public execute(input: IFTTTWebhookCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<string> {
        return this._tool.call(input);
    }
}
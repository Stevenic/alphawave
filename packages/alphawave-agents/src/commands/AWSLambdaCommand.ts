import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";
import { SchemaBasedCommand } from "../SchemaBasedCommand";
import { AWSLambda } from "langchain/tools/aws_lambda";

export interface AWSLambdaConfig {
    name: string;
    description: string;
    functionName: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    input_description?: string;
    output_description?: string;
}

export interface AWSLambdaCommandInput {
    input: string;
}

export class AWSLambdaCommand extends SchemaBasedCommand<AWSLambdaCommandInput> {
    private readonly _tool: AWSLambda;

    public constructor(config: AWSLambdaConfig) {
        super({
            type: "object",
            title: config.name,
            description: config.description,
            properties: {
                input: {
                    type: "string",
                    description: config.input_description || "input text"
                }
            },
            required: ["input"],
            returns: config.output_description || "output text"
        });
        this._tool = new AWSLambda(config);
    }

    public execute(input: AWSLambdaCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<string> {
        return this._tool.call(input);
    }
}
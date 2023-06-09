import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";
import { SchemaBasedCommand } from "../SchemaBasedCommand";
import { Calculator } from "langchain/tools/calculator";

export interface CalculatorCommandInput {
    expression: string;
}

export class CalculatorCommand extends SchemaBasedCommand<CalculatorCommandInput> {
    private readonly _tool: Calculator;

    public constructor() {
        super({
            type: "object",
            title: "calculator",
            description: "useful for getting the result of a math expression",
            properties: {
                expression: {
                    type: "string",
                    description: "a valid mathematical expression that could be executed by a simple calculator"
                }
            },
            required: ["expression"],
            returns: "calculated value"
        });
        this._tool = new Calculator();
    }

    public execute(input: CalculatorCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<string> {
        return this._tool.call(input.expression);
    }
}
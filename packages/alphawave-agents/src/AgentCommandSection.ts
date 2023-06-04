import { PromptSectionBase, PromptFunctions, PromptMemory, Tokenizer, Message, RenderedPromptSection } from "promptrix";
import { Command } from "./types";

export class AgentCommandSection extends PromptSectionBase {
    private readonly _commands: Map<string, Command>;

    public constructor(commands: Map<string, Command>, tokens: number = -1, required: boolean = true) {
        super(tokens, required)
        this._commands = commands;
    }

    public renderAsMessages(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, maxTokens: number): Promise<RenderedPromptSection<Message[]>> {
        // Render commands to message content
        let content = 'commands:\n';
        for (const command of this._commands.values()) {
            content += `\t${command.title}:\n`;
            content += `\t\tuse: ${command.description}\n`;
            const inputs = command.inputs;
            if (inputs) {
                content += `\t\tinputs: ${inputs}\n`;
            }
            const output = command.output;
            if (output) {
                content += `\t\toutput: ${output}\n`;
            }
        }

        // Return as system message
        const length = tokenizer.encode(content).length;
        return Promise.resolve(this.returnMessages([{ role: 'system', content: content }], length, tokenizer, maxTokens));
    }
}
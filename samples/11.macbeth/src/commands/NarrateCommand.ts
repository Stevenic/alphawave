import { SchemaBasedCommand, CommandSchema } from "alphawave-agents";
import { PromptMemory, PromptFunctions, Tokenizer } from "promptrix";

interface NarrateCommandInput {
    text: string;
    performance: string;
}

const NarrateCommandSchema: CommandSchema = {
    type: "object",
    title: "narrate",
    description: "add narration to the story or set the scene",
    properties: {
        text: {
            type: "string",
            description: "narration"
        },
        performance: {
            type: "string",
            description: "current act and scene"
        }
    },
    required: ["text"],
    returns: "confirmation"
};

export class NarrateCommand extends SchemaBasedCommand<NarrateCommandInput> {
    public constructor() {
        super(NarrateCommandSchema);
    }

    public execute(input: NarrateCommandInput, memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer): Promise<any> {
        console.log(`\x1b[32m${input.text}\x1b[0m`);
        if (input.performance) {
            memory.set('performance', input.performance);
        }
        return Promise.resolve(`next line of dialog`);

    }
}


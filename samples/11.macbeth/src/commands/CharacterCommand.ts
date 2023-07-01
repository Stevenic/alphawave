import { OpenAIModel } from "alphawave";
import { PromptCommand, CommandSchema } from "alphawave-agents";
import { Prompt, PromptMemory, SystemMessage } from "promptrix";

const CharacterCommandSchema: CommandSchema = {
    type: "object",
    title: "extra",
    description: "a character in the play Macbeth",
    properties: {
        name: {
            type: "string",
            description: "character name"
        },
        scene: {
            type: "string",
            description: "scene description no more than 80 words"
        }
    },
    required: ["name", "scene"],
    returns: "`characters line of dialog"
};

export class CharacterCommand extends PromptCommand {
    public constructor(model: OpenAIModel, name: string, description?: string) {
        super({
            model: model.clone({
                temperature: 0.4,
                max_input_tokens: 2500,
                max_tokens: 200,
            }),
            prompt: new Prompt([
                new SystemMessage(`You are the character of {{$name}} from Macbeth.\n\nScene:\n{{$scene}}\n\nDialog:\n{{$dialog}}\n\nRespond with your next line of dialog formatted as "{{$name}}: <line of dialog>".\n\n{{$name}}:`)
            ]),
            schema: CharacterCommandSchema,
            parseResponse: async (response: string, input: Record<string, any>, memory: PromptMemory) => {
                // Trim and combine dialog.
                response = response.split('\n\n').join('\n');
                response = response.split('\n').map(line => line.trim()).join(' ');

                // Say line of dialog
                console.log(`${input.name}: \x1b[2m${response}\x1b[0m`);

                // Add line to dialog
                response = `${input.name}: ${response}`;
                const dialog = memory.get('dialog') ?? [];
                dialog.push(response);
                memory.set('dialog', dialog);
                return response;
            }
        }, name, description);
    }
}


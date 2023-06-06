import { OpenAIClient, AlphaWave, JSONResponseValidator } from "alphawave";
import { Prompt, SystemMessage, ConversationHistory, UserMessage, Message } from "promptrix";
import { config } from "dotenv";
import * as path from "path";
import * as readline from "readline";

// Read in .env file.
const ENV_FILE = path.join(__dirname, '..', '.env');
config({ path: ENV_FILE });

// Create an OpenAI or AzureOpenAI client
const client = new OpenAIClient({
    apiKey: process.env.OpenAIKey!
});

// Define expected response schema and create a validator
interface ResponseSchema {
    answer: string,
    sentiment?: 'positive'|'neutral'|'negative'
}

const validator = new JSONResponseValidator({
    type: 'object',
    properties: {
        answer: { type: 'string' },
        sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] }
    },
    required: ['answer', 'sentiment']
});

// Create a wave
const wave = new AlphaWave({
    client,
    prompt: new Prompt([
        new SystemMessage([
            `Answers the user but also analyze the sentiment of their message.`,
            `Return your answer using this JSON structure:`,
            `{"answer":"<answer>","sentiment":"positive|neutral|negative"}`
        ].join('\n')),
        new ConversationHistory('history'),
        new UserMessage('{{$input}}', 200)
    ]),
    prompt_options: {
        completion_type: 'chat',
        model: 'gpt-3.5-turbo',
        temperature: 0.9,
        max_input_tokens: 2000,
        max_tokens: 1000,
    },
    validator,
    logRepairs: true
});

// Create a readline interface object with the standard input and output streams
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Define main chat loop
async function chat(botMessage: ResponseSchema|undefined) {
    // Show the bots message
    if (botMessage) {
        if (botMessage.sentiment) {
            console.log(`\x1b[2m[${botMessage.sentiment}]\x1b[0m`);
        }
        console.log(`\x1b[32m${botMessage.answer}\x1b[0m`);
    }

    // Prompt the user for input
    rl.question('User: ', async (input: string) => {
        // Check if the user wants to exit the chat
        if (input.toLowerCase() === 'exit') {
            // Close the readline interface and exit the process
            rl.close();
            process.exit();
        } else {
            // Route users message to wave
            const result = await wave.completePrompt(input);
            switch (result.status) {
                case 'success':
                    await chat((result.message as Message<ResponseSchema>).content);
                    break;
                default:
                    if (result.message) {
                        console.log(`${result.status}: ${result.message}`);
                    } else {
                        console.log(`A result status of '${result.status}' was returned.`);
                    }

                    // Close the readline interface and exit the process
                    rl.close();
                    process.exit();
                    break;
            }
        }
    });
}

// Start chat session
chat({ answer: `Hello, how can I help you?` });
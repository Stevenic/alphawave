import { OpenAIClient, AlphaWave } from "alphawave";
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

// Create a wave
const wave = new AlphaWave({
    client,
    prompt: new Prompt([
        new SystemMessage('You are an AI assistant that is friendly, kind, and helpful', 50),
        new ConversationHistory('history', 1.0),
        new UserMessage('{{$input}}', 450)
    ]),
    prompt_options: {
        completion_type: 'chat',
        model: 'gpt-3.5-turbo',
        temperature: 0.9,
        max_input_tokens: 2000,
        max_tokens: 1000,
    }
});

// Create a readline interface object with the standard input and output streams
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Define main chat loop
async function chat(botMessage: string|undefined) {
    // Show the bots message
    if (botMessage) {
        console.log(`\x1b[32m${botMessage}\x1b[0m`);
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
                    await chat((result.message as Message).content);
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
chat(`Hello, how can I help you?`);
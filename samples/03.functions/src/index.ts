import { OpenAIModel, AlphaWave } from "alphawave";
import { Prompt, ConversationHistory, UserMessage, Message } from "promptrix";
import { config } from "dotenv";
import * as path from "path";
import * as readline from "readline";

// Read in .env file.
const ENV_FILE = path.join(__dirname, '..', '.env');
config({ path: ENV_FILE });

// Create an instance of a model
const model = new OpenAIModel({
    apiKey: process.env.OpenAIKey!,
    completion_type: 'chat',
    model: 'gpt-3.5-turbo',
    temperature: 0.9,
    max_input_tokens: 2000,
    max_tokens: 1000,
    functions: [
        {
            "name": "get_current_weather",
            "description": "Get the current weather in a given location",
            "parameters": {
              "type": "object",
              "properties": {
                "location": {
                  "type": "string",
                  "description": "The city and state, e.g. San Francisco, CA"
                },
                "unit": {
                  "type": "string",
                  "enum": ["celsius", "fahrenheit"]
                }
              },
              "required": ["location"]
            }
        }
    ]
});

// Create a wave
const wave = new AlphaWave({
    model,
    prompt: new Prompt([
        new ConversationHistory('history'),
        new UserMessage('{{$input}}', 200)
    ]),
    logRepairs: true
});

// Create a readline interface object with the standard input and output streams
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Define main chat loop
async function chat(botMessage: string) {
    async function completePrompt(input: string) {
        // Route users message to wave
        const result = await wave.completePrompt<string>(input);
        switch (result.status) {
            case 'success':
                const message = result.message as Message<string>;
                if (message.function_call) {
                    // Call function and add result to history
                    console.log(`\x1b[2m[${message.function_call.name}(${message.function_call.arguments})]\x1b[0m`);
                    const args = JSON.parse(message.function_call.arguments!);
                    const unit = args.unit ?? 'fahrenheit';
                    wave.addFunctionResultToHistory(message.function_call.name!, { "temperature": unit == 'fahrenheit' ? 76 : 24, "unit": unit, "description": "Sunny", "location": args.location });

                    // Call back in with the function result
                    await completePrompt('');
                } else {
                    // Call chat to display response and wait for user input
                    await chat(message.content!);
                }
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

    // Show the bots message
    console.log(`\x1b[32m${botMessage}\x1b[0m`);

    // Prompt the user for input
    rl.question('User: ', async (input: string) => {
        // Check if the user wants to exit the chat
        if (input.toLowerCase() === 'exit') {
            // Close the readline interface and exit the process
            rl.close();
            process.exit();
        } else {
            // Complete the prompt using the user's input
            completePrompt(input);
        }
    });
}

// Start chat session
chat(`Hello, how can I help you?`);
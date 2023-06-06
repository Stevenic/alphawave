import { Agent, AskCommand, FinalAnswerCommand, MathCommand } from "alphawave-agents";
import { OpenAIClient } from "alphawave";
import { config } from "dotenv";
import * as path from "path";
import * as readline from "readline";

// Read in .env file.
const ENV_FILE = path.join(__dirname, '..', '.env');
config({ path: ENV_FILE });

// Create an OpenAI or AzureOpenAI client
const client = new OpenAIClient({
    apiKey: process.env.OpenAIKey!,
    logRequests: true,
});

import { SummarizeImpact } from "./agents/SummarizeImpact";

// Create an agent
const agent = new SummarizeImpact({
    client,
    prompt_options: {
        completion_type: 'chat',
        model: 'gpt-3.5-turbo',
        temperature: 0.0,
        max_input_tokens: 2000,
        max_tokens: 1000,
    },
    logRepairs: true,
});

// Listen for new thoughts
agent.events.on('newThought', (thought) => {
    //console.log(`\x1b[2m[${thought.thoughts.thought}]\x1b[0m`);
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
            // Route users message to the agent
            const result = await agent.completeTask(input);
            switch (result.status) {
                case 'success':
                case 'input_needed':
                    await chat(result.message);
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
chat(`What were your core priorities for this review period?`);
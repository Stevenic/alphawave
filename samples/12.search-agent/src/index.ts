import { Agent, AskCommand, FinalAnswerCommand, BingSearchCommand, WebBrowserCommand } from "alphawave-agents";
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
    //logRequests: true,
});

// Create an agent
const agent = new Agent({
    client,
    prompt: [
        `Use the ask command to prompt the user for their question.`,
        `Send a query to the bingSearch command to find the users answer.`,
        `Always use bingSearch to verify that your answers are accurate.`,
        `When showing lists to the user, show a bulleted list.`,
    ],
    prompt_options: {
        completion_type: 'chat',
        model: 'gpt-3.5-turbo',
        temperature: 0.0,
        max_input_tokens: 2200,
        max_tokens: 800,
    },
    initial_thought: {
        "thoughts": {
            "thought":"I need to ask the user what they want to know",
            "reasoning":"I don't have any information to start with, so I need to get some input from the user",
            "plan":"- ask the user a question\n- use bingSearch to find an answer\n- use finalAnswer to generate a response."
        },
        "command": {
            "name":"ask",
            "input":{"question":"What can I help you find today?"}
        }
    },
    max_steps: 10,
    //logRepairs: true,
});

// Add commands to the agent
agent.addCommand(new AskCommand());
agent.addCommand(new FinalAnswerCommand());
agent.addCommand(new BingSearchCommand({
    apiKey: process.env.BingAPIKey!,
    deep_search: {
        prompt_client: client,
        prompt_options: {
            completion_type: 'chat',
            model: 'gpt-3.5-turbo',
            temperature: 0.0,
            max_input_tokens: 2200,
            max_tokens: 800,
        },
        embeddings_client: client,
        embeddings_model: 'text-embedding-ada-002',
        max_search_time: 60000,
        parse_mode: 'text',
        log_activity: true,
    }
}));

// Listen for new thoughts
agent.events.on('newThought', (thought) => {
    console.log(`\x1b[2m[${thought.thoughts.thought}]\x1b[0m`);
});

// Listen for command completions
agent.events.on('beforeCommand', (command, input) => {
    //console.log(`\x1b[2m[${command.title}(${JSON.stringify(input)})]\x1b[0m`);
});

agent.events.on('afterCommand', (command, input, response) => {
    //console.log(`\x1b[2m[returned: ${ typeof response == 'object' ? JSON.stringify(response) : response}]\x1b[0m`);
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
chat(`What can I help you find today?`);
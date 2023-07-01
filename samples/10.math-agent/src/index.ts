import { Agent, AskCommand, FinalAnswerCommand, MathCommand } from "alphawave-agents";
import { OpenAIModel } from "alphawave";
import { config } from "dotenv";
import * as path from "path";
import * as readline from "readline";

// Read in .env file.
const ENV_FILE = path.join(__dirname, '..', '.env');
config({ path: ENV_FILE });

// Create an OpenAI or AzureOpenAI client
const model = new OpenAIModel({
    apiKey: process.env.OpenAIKey!,
    completion_type: 'chat',
    model: 'gpt-3.5-turbo',
    temperature: 0.2,
    max_input_tokens: 2000,
    max_tokens: 1000,
});

// Create an agent
const agent = new Agent({
    model,
    prompt: `You are an expert in math. Use the math command to assist users with their math problems.`,
    initial_thought: {
        "thoughts": {
            "thought": "I need to ask the user for the problem they'd like me to solve",
            "reasoning": "This is the first step of the task and it will allow me to get the input for the math command",
            "plan": "- ask the user for the problem\n- use the math command to compute the answer\n- use the finalAnswer command to present the answer"
        },
        "command": {
            "name": "ask",
            "input": { "question":"Hi! I'm an expert in math. What problem would you like me to solve?" }
        }
    },
    logRepairs: true,
});

// Add commands to the agent
agent.addCommand(new AskCommand());
agent.addCommand(new FinalAnswerCommand());
agent.addCommand(new MathCommand());

// Listen for new thoughts
agent.events.on('newThought', (thought) => {
    console.log(`\x1b[2m[${thought.thoughts.thought}]\x1b[0m`);
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
chat(`Hi! I'm an expert in math. What problem would you like me to solve?`);
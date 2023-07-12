import { AlphaWave, OpenAIModel } from 'alphawave';
import { config } from 'dotenv';
import * as path from 'path';
import {
    ConversationHistory,
    Message,
    Prompt,
    SystemMessage,
    UserMessage
} from 'promptrix';
import * as readline from 'readline';

import { TodoList } from './todo-list';

// Read in .env file.
const ENV_FILE = path.join(__dirname, '..', '.env');
config({ path: ENV_FILE });

// Instantiate the TodoList class
const list = new TodoList();

// Create an instance of a model
const model = new OpenAIModel({
    apiKey: process.env.OpenAIKey!,
    completion_type: 'chat',
    model: 'gpt-3.5-turbo',
    temperature: 0.9,
    max_input_tokens: 4096,
    max_tokens: 2048,
    functions: [
        {
            name: 'addItem',
            description: 'Add a new todo item',
            parameters: {
                type: 'object',
                properties: {
                    title: {
                        type: 'string',
                        description: 'The title of the new todo item'
                    }
                },
                required: ['title']
            }
        },
        {
            name: 'removeItem',
            description: 'Remove a todo item',
            parameters: {
                type: 'object',
                properties: {
                    'id': {
                        type: 'number',
                        description: 'The id of the todo item to remove'
                    }
                },
                required: ['id']
            }
        },
        {
            name: 'getItem',
            description: 'Get a todo item, might be undefined',
            parameters: {
                type: 'object',
                properties: {
                    'id': {
                        type: 'number',
                        description: 'The id of the todo item to find'
                    }
                },
                required: ['id']
            }
        },
        {
            name: 'getItems',
            description: 'Get all todo items',
            parameters: {
                type: 'object',
                properties: {
                    'status': {
                        type: 'string',
                        enum: ['all', 'pending', 'in-progress', 'completed'],
                    }
                },
                required: ['status']
            }
        },
        {
            name: 'deleteItems',
            description: 'Get all todo items',
            parameters: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'markItemAsInProgress',
            description: 'Mark a todo item as in progress',
            parameters: {
                type: 'object',
                properties: {
                    'id': {
                        type: 'number',
                        description: 'The id of the todo item to mark as in progress'
                    }
                },
                required: ['id']
            }
        },
        {
            name: 'markItemAsCompleted',
            description: 'Mark a todo item as completed',
            parameters: {
                type: 'object',
                properties: {
                    'id': {
                        type: 'number',
                        description: 'The id of the todo item to mark as completed'
                    }
                },
                required: ['id']
            }
        },
        {
            name: 'markItemAsPending',
            description: 'Mark a todo item as pending',
            parameters: {
                type: 'object',
                properties: {
                    'id': {
                        type: 'number',
                        description: 'The id of the todo item to mark as pending'
                    }
                },
                required: ['id']
            }
        }
    ]
});

// Create a wave
const wave = new AlphaWave({
    model,
    prompt: new Prompt([
        new SystemMessage([
            'You are a todo list assistant. You can add, remove, and mark todo items as pending, in progress, or completed.',
            'Do not make up todo items that are not in the list.'
        ].join('\n')),
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
                console.log('message: ', message);

                if (message.function_call) {
                    // Get the function from the list
                    const func = list[message.function_call.name! as keyof TodoList] as Function;

                    // Parse the arguments from the message
                    // In this case it's straightforward because we know the that at most
                    // there will be one argument, but in general you would need to parse
                    // the arguments from the message based on the function's parameters
                    const args = JSON.parse(message.function_call.arguments!);
                    const params = Object.values(args) || [];

                    // Call function and add result to history
                    const res = func.call(list, ...params)

                    wave.addFunctionResultToHistory(message.function_call.name!, res);

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

    // Log the list
    console.log(`\x1b[2m${JSON.stringify(list, null, 2)})\x1b[0m`);

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

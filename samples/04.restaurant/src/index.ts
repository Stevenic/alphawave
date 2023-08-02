import { OpenAIModel, AlphaWave } from "alphawave";
import { Prompt, ConversationHistory, UserMessage, Message, SystemMessage } from "promptrix";
import { config } from "dotenv";
import * as path from "path";
import * as readline from "readline";
import { Order } from "./foodOrderViewSchema";

// Read in .env file.
const ENV_FILE = path.join(__dirname, '..', '.env');
config({ path: ENV_FILE });

const orderSchema = require('../src/foodOrderViewSchema.json');

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
            "name": "place_order",
            "description": "Creates or updates a food order.",
            "parameters": orderSchema
        }
    ]
});

// Create a wave
const wave = new AlphaWave({
    model,
    prompt: new Prompt([
        new SystemMessage([
            `You are a food ordering bot for a restaurant named The Pub.`,
            `The customer can order pizza, beer, or salad.`,
            `If the customer doesn't specify the type of pizza, beer, or salad they want ask them.`,
            `Verify the order is complete and accurate before placing it with the place_order function.`
        ].join('\n')),
        new ConversationHistory('history'),
        new UserMessage('{{$input}}', 200)
    ]),
    logRepairs: true
});


const saladIngredients = [
    "lettuce",
    "tomatoes",
    "red onions",
    "olives",
    "peppers",
    "parmesan",
    "croutons",
];

const pizzaToppings = [
    "pepperoni",
    "sausage",
    "mushrooms",
    "basil",
    "extra cheese",
    "extra sauce",
    "anchovies",
    "pineapple",
    "olives",
    "arugula",
    "Canadian bacon",
    "Mama Lil's Peppers",
];

// a function that takes two arrays of strings a and b and removes from a and b
// all strings that are in both a and b
function removeCommonStrings(a: string[], b: string[]) {
    const aSet = new Set(a);
    const bSet = new Set(b);
    for (const item of aSet) {
        if (bSet.has(item)) {
            aSet.delete(item);
            bSet.delete(item);
        }
    }
    return [Array.from(aSet), Array.from(bSet)];
}

const namedPizzas = new Map([
    ["Hawaiian", ["pineapple", "Canadian bacon"]],
    ["Yeti", ["extra cheese", "extra sauce"]],
    ["Pig In a Forest", ["mushrooms", "basil", "Canadian bacon", "arugula"]],
    ["Cherry Bomb", ["pepperoni", "sausage", "Mama Lil's Peppers"]],
]);

function printOrder(order: Order) {
    if (order.items && order.items.length > 0) {
        for (const item of order.items) {
            if (item.itemType === "unknown") {
                break;
            }
            switch (item.itemType) {
                case "pizza": {
                    if (item.name) {
                        const addedToppings = namedPizzas.get(item.name);
                        if (addedToppings) {
                            if (item.addedToppings) {
                                item.addedToppings = item.addedToppings.concat(addedToppings);
                            } else {
                                item.addedToppings = addedToppings;
                            }
                        }
                    }
                    if (!item.size) {
                        item.size = "large";
                    }
                    let quantity = 1;
                    if (item.quantity) {
                        quantity = item.quantity;
                    }
                    let pizzaStr = `    ${quantity} ${item.size} pizza`;
                    if (item.addedToppings && item.removedToppings) {
                        [item.addedToppings, item.removedToppings] =
                            removeCommonStrings(item.addedToppings, item.removedToppings);
                    }
                    if (item.addedToppings && item.addedToppings.length > 0) {
                        pizzaStr += " with";
                        for (const [index, addedTopping] of item.addedToppings.entries()) {
                            if (pizzaToppings.includes(addedTopping)) {
                                pizzaStr += `${index === 0 ? " " : ", "}${addedTopping}`;
                            } else {
                                console.log(`We are out of ${addedTopping}`);
                            }
                        }
                    }
                    if (item.removedToppings && item.removedToppings.length > 0) {
                        pizzaStr += " and without";
                        for (const [
                            index,
                            removedTopping,
                        ] of item.removedToppings.entries()) {
                            pizzaStr += `${index === 0 ? " " : ", "}${removedTopping}`;
                        }
                    }
                    console.log(pizzaStr);
                    break;
                }
                case "beer": {
                    let quantity = 1;
                    if (item.quantity) {
                        quantity = item.quantity;
                    }
                    const beerStr = `    ${quantity} ${item.kind}`;
                    console.log(beerStr);
                    break;
                }
                case "salad": {
                    let quantity = 1;
                    if (item.quantity) {
                        quantity = item.quantity;
                    }
                    if (!item.portion) {
                        item.portion = "half";
                    }
                    if (!item.style) {
                        item.style = "Garden";
                    }
                    let saladStr = `    ${quantity} ${item.portion} ${item.style} salad`;
                    if (item.addedIngredients && item.removedIngredients) {
                        [item.addedIngredients, item.removedIngredients] =
                            removeCommonStrings(item.addedIngredients, item.removedIngredients);
                    }
                    if (item.addedIngredients && item.addedIngredients.length > 0) {
                        saladStr += " with";
                        for (const [
                            index,
                            addedIngredient,
                        ] of item.addedIngredients.entries()) {
                            if (saladIngredients.includes(addedIngredient)) {
                                saladStr += `${index === 0 ? " " : ", "}${addedIngredient}`;
                            } else {
                                console.log(`We are out of ${addedIngredient}`);
                            }
                        }
                    }
                    if (item.removedIngredients && item.removedIngredients.length > 0) {
                        saladStr += " without";
                        for (const [
                            index,
                            removedIngredient,
                        ] of item.removedIngredients.entries()) {
                            saladStr += `${index === 0 ? " " : ", "}${removedIngredient}`;
                        }
                    }
                    console.log(saladStr);
                    break;
                }
            }
        }
    }
}

// Create a readline interface object with the standard input and output streams
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let orderPlaced = false;
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
                    const order: Order = JSON.parse(message.function_call.arguments!);
                    printOrder(order);
                    wave.addFunctionResultToHistory(message.function_call.name!, orderPlaced ? "Order updated": "Order placed");
                    orderPlaced = true;

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
chat(`🍕 Hello, how can I help you?`);
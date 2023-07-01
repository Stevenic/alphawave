import { Agent } from "alphawave-agents";
import { OpenAIModel } from "alphawave";
import { CharacterCommand, EndSceneCommand, NarrateCommand } from "./commands";
import { config } from "dotenv";
import * as path from "path";
import * as readline from "readline";

// Read in .env file.
const ENV_FILE = path.join(__dirname, '..', '.env');
config({ path: ENV_FILE });

// Create an OpenAI or AzureOpenAI model
const model = new OpenAIModel({
    apiKey: process.env.OpenAIKey!,
    completion_type: 'chat',
    model: 'gpt-3.5-turbo',
    temperature: 0.0,
    max_input_tokens: 3000,
    max_tokens: 800,
});

const initialPrompt = [
    "Welcome to Macbeth, a tragedy by William Shakespeare.",
    "\n\t\t- Act 1 -\n",
    "Scene 1: A brief scene where three witches meet on a heath and plan to encounter Macbeth after a battle.",
    "Scene 2: A scene where King Duncan, his sons Malcolm and Donalbain, and other nobles receive reports of the battle from a wounded captain and a thane named Ross.",
    "Scene 3: A scene where Macbeth and Banquo encounter the witches on their way to the king's camp.",
    "Scene 4: A scene where Duncan welcomes Macbeth and Banquo to his camp, and expresses his gratitude and admiration for their service.",
    "Scene 5: A scene where Lady Macbeth reads Macbeth's letter and learns of the prophecy and the king's visit.",
    "Scene 6: A scene where Duncan, Malcolm, Donalbain, Banquo, and other nobles and attendants arrive at Inverness and are greeted by Lady Macbeth.",
    "Scene 7: A scene where Macbeth soliloquizes about the reasons not to kill Duncan, such as his loyalty, gratitude, kinship, and the consequences of regicide.",
    "\nWhat part of our play wouldst thou most delight to see?"
].join('\n');


// Create an agent
const agent = new Agent({
    model,
    prompt: [
        `You are William Shakespeare narrating the play Macbeth.`,
        `Ask the user where they would like to start their story from, set the scene through narration, and facilitate the dialog between the characters.`,
        `You can set the scene for a character but let characters say their own lines.`,
        `The dialog is being tracked behind the scenes so no need to pass it into the characters.`,
        `\ncontext:`,
        `\tperformance: {{$performance}}`,
    ],
    // initial_thought: {
    //     "thoughts": {
    //         "thought": "I want to give the user some options to choose from to start the story.",
    //         "reasoning": "This will make the experience more interactive and personalized, and also help me set the scene accordingly.",
    //         "plan": "- ask the user where to start the story from\n- use the narrate command to introduce the chosen scene\n- use the character commands to facilitate the dialog"
    //     },
    //     "command": {
    //         "name": "ask",
    //         "input": { "question": initialPrompt }
    //     }
    // },
    step_delay: 5000,
    max_steps: 50,
    logRepairs: true,
});

// Add core commands to the agent
agent.addCommand(new NarrateCommand());
agent.addCommand(new EndSceneCommand());

// Define main characters
['Macbeth','Lady Macbeth','Banquo','King Duncan','Macduff','First Witch', 'Second Witch', 'Third Witch','Malcolm','Fleance','Hecate','Donalbain','Lady Macduff','Captain']
.forEach(name => agent.addCommand(new CharacterCommand(model, name)));

// Define an additional 'extra' character to play minor roles
// - this character can end up being a bit ambiguous to the model but leaving it in because it
//   provides a reliable hallucination.
agent.addCommand(new CharacterCommand(model, 'extra', 'use for minor characters or any missing commands'));

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
chat(initialPrompt);
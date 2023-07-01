// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    AI,
    Application,
    ConversationHistory,
    DefaultConversationState,
    DefaultPromptManager,
    DefaultTempState,
    DefaultTurnState,
    DefaultUserState,
    ResponseParser
} from '@microsoft/teams-ai';
import { ActivityTypes, TurnContext, MemoryStorage } from 'botbuilder';
import { OpenAIModel, JSONResponseValidator } from "alphawave";
import { ActionPlanner, PlanValidator } from "alphawave-teams";
import * as path from 'path';
import * as responses from './responses';
import { map } from './ShadowFalls';
import { addActions } from './actions';
import { LastWriterWinsStore } from './LastWriterWinsStore';
import { describeConditions, describeSeason, generateTemperature, generateWeather } from './conditions';
import { AdaptiveCardSchema, ICampaign, ICampaignSchema, ICampaignObjective, IItemList, ILocation, IQuest, IPlayerSchema, IMessage } from './types';

// Strongly type the applications turn state
export interface ConversationState extends DefaultConversationState {
    version: number;
    greeted: boolean;
    history: IMessage[];
    turn: number;
    location: ILocation;
    locationTurn: number;
    campaign: ICampaign;
    quests: { [title: string]: IQuest };
    players: string[];
    time: number;
    day: number;
    temperature: string;
    weather: string;
    story: string;
    nextEncounterTurn: number;
}

export interface UserState extends DefaultUserState {
    name: string;
    backstory: string;
    equipped: string;
    inventory: IItemList;
}

export interface TempState extends DefaultTempState {
    prompt: string;
    promptInstructions: string;
    listItems: IItemList;
    listType: string;
    backstoryChange: string;
    equippedChange: string;
    originalText: string;
    newText: string;
    objectiveTitle: string;
}

export type ApplicationTurnState = DefaultTurnState<ConversationState, UserState, TempState>;

if (!process.env.OpenAIKey) {
    throw new Error(
        'Missing environment variables - please check that OpenAIKey.'
    );
}

// Create model
const model = new OpenAIModel({
    apiKey: process.env.OpenAIKey,
    completion_type: 'chat',
    model: 'gpt-3.5-turbo',
    max_input_tokens: 3000,
    logRequests: true
});

// Create planner
const planner = new ActionPlanner<ApplicationTurnState>({
    model,
    logRepairs: true
});
const promptManager = new DefaultPromptManager<ApplicationTurnState>(path.join(__dirname, '../src/prompts'));

// Add response validators to planner
const planValidator = new PlanValidator();
planner.addValidator('AdaptiveCard', new JSONResponseValidator(AdaptiveCardSchema));
planner.addValidator('ICampaign', new JSONResponseValidator(ICampaignSchema));
planner.addValidator('IPlayer', new JSONResponseValidator(IPlayerSchema));
planner.addValidator('Plan', planValidator);

// Define storage and application
// - Note that we're not passing a prompt in our AI options as we manually ask for hints.
const storage = process.env.StorageConnectionString && process.env.StorageContainer ? new LastWriterWinsStore(process.env.StorageConnectionString, process.env.StorageContainer) : new MemoryStorage();
const app = new Application<ApplicationTurnState>({
    storage,
    ai: {
        planner,
        promptManager,
        prompt: async (context: TurnContext, state: ApplicationTurnState) => state.temp.value.prompt,
        history: { trackHistory: false }
    }
});

// Export bots run() function
export const run = (context: TurnContext) => app.run(context);

export const DEFAULT_BACKSTORY = `Lives in Shadow Falls.`;
export const DEFAULT_EQUIPPED = `Wearing clothes.`;
export const CONVERSATION_STATE_VERSION = 1;

app.turn('beforeTurn', async (context: TurnContext, state: ApplicationTurnState) => {
    if (context.activity.type == ActivityTypes.Message) {
        let conversation = state.conversation.value;
        const player = state.user.value;
        const temp = state.temp.value;

        // Clear conversation state on version change
        if (conversation.version !== CONVERSATION_STATE_VERSION) {
            state.conversation.delete();
            conversation = state.conversation.value;
            conversation.version = CONVERSATION_STATE_VERSION;
        }

        // Initialize player state
        if (!player.name) {
            player.name = (context.activity.from?.name ?? '').split(' ')[0];
            if (player.name.length == 0) {
                player.name = 'Adventurer';
            }
        }

        if (!player.backstory) {
            player.backstory = DEFAULT_BACKSTORY;
        }

        if (!player.equipped) {
            player.equipped = DEFAULT_EQUIPPED;
        }

        if (player.inventory == undefined) {
            player.inventory = { map: 1, sword: 1, hatchet: 1, gold: 50 };
        }

        // Add player to session
        if (Array.isArray(conversation.players)) {
            if (conversation.players.indexOf(player.name) < 0) {
                conversation.players.push(player.name);
            }
        } else {
            conversation.players = [player.name];
        }

        // Update message text to include players name
        // - This ensures their name is in the chat history
        const useHelpPrompt = context.activity.text.trim().toLowerCase() == 'help';
        context.activity.text = `[${player.name}] ${context.activity.text}`;

        // Are we just starting?
        let newDay = false;
        let campaign: ICampaign;
        let location: ILocation;
        if (!conversation.greeted) {
            newDay = true;
            conversation.greeted = true;
            temp.prompt = '<none>';

            // Create starting location
            const village = map.locations['village'];
            location = {
                title: village.name,
                description: village.details,
                encounterChance: village.encounterChance
            };

            // Initialize conversation state
            conversation.history = [];
            conversation.turn = 1;
            conversation.location = location;
            conversation.locationTurn = 1;
            conversation.quests = {};
            conversation.story = `The story begins.`;
            conversation.day = Math.floor(Math.random() * 365) + 1;
            conversation.time = Math.floor(Math.random() * 14) + 6; // Between 6am and 8pm
            conversation.nextEncounterTurn = 5 + Math.floor(Math.random() * 15);

            // Create campaign
            const response = await app.ai.completePrompt(context, state, 'createCampaign');
            if (!response) {
                throw new Error('Failed to create campaign');
            }
            campaign = ResponseParser.parseJSON(response) as ICampaign;
            if (campaign && campaign.title && Array.isArray(campaign.objectives)) {
                // Send campaign title as a message
                conversation.campaign = campaign;
                await context.sendActivity(`🧙 <strong>${campaign.title}</strong><br>${campaign.playerIntro}`);
            } else {
                state.conversation.delete();
                await context.sendActivity(responses.dataError());
                return false;
            }
        } else {
            campaign = conversation.campaign;
            location = conversation.location;
            temp.prompt = 'prompt';

            // Increment game turn
            conversation.turn++;
            conversation.locationTurn++;

            // Pass time
            conversation.time += 0.25;
            if (conversation.time >= 24) {
                newDay = true;
                conversation.time -= 24;
                conversation.day += 1;
                if (conversation.day > 365) {
                    conversation.day = 1;
                }
            }
        }

        // Find next campaign objective
        let campaignFinished = false;
        let nextObjective: ICampaignObjective|undefined = undefined;
        if (Object.entries(campaign).length > 0) {
            campaignFinished = true;
            for (let i = 0; i < campaign.objectives.length; i++) {
                const objective = campaign.objectives[i];
                if (!objective.completed) {
                    // Ignore if the objective is already a quest
                    if (!conversation.quests.hasOwnProperty(objective.title.toLowerCase())) {
                        nextObjective = objective;
                    }

                    campaignFinished = false;
                    break;
                }
            }
        }

        // Is user asking for help
        let objectiveAdded = false;
        if (useHelpPrompt && !campaignFinished) {
            temp.prompt = 'help';
        } else if (temp.prompt != '<none>' && nextObjective && Math.random() < 0.2) {
            // Add campaign objective as a quest
            conversation.quests[nextObjective.title.toLowerCase()] = {
                title: nextObjective.title,
                description: nextObjective.description
            };

            // Notify user of new quest
            objectiveAdded = true;
            await context.sendActivity(
                `✨ <strong>${nextObjective.title}</strong><br>${nextObjective.description
                    .trim()
                    .split('\n')
                    .join('<br>')}`
            );
            app.startTypingTimer(context);
        }

        // Has a new day passed?
        if (newDay) {
            const season = describeSeason(conversation.day);
            conversation.temperature = generateTemperature(season);
            conversation.weather = generateWeather(season);
        }

        // Load temp variables for prompt use
        temp.promptInstructions = 'Answer the players query.';

        if (campaignFinished) {
            temp.promptInstructions =
                'The players have completed the campaign. Congratulate them and tell them they can continue adventuring or use "/reset" to start over with a new campaign.';
            conversation.campaign = {} as ICampaign;
        } else if (objectiveAdded) {
            temp.prompt = 'newObjective';
            temp.objectiveTitle = nextObjective!.title;
        } else if (conversation.turn >= conversation.nextEncounterTurn && Math.random() <= location.encounterChance) {
            // Generate a random encounter
            temp.promptInstructions = 'An encounter occurred! Describe to the player the encounter.';
            conversation.nextEncounterTurn = conversation.turn + (5 + Math.floor(Math.random() * 15));
        }
    }

    return state.temp.value.prompt !== '<none>';
});

app.message('/state', async (context: TurnContext, state) => {
    await context.sendActivity(JSON.stringify(state));
});

app.message(['/reset-profile', '/reset-user'], async (context: TurnContext, state) => {
    state.user.delete();
    state.conversation.value.players = [];
    await context.sendActivity(`I've reset your profile.`);
});

app.message('/reset', async (context: TurnContext, state: ApplicationTurnState) => {
    state.conversation.delete();
    await context.sendActivity(`Ok lets start this over.`);
});

app.message('/forget', async (context: TurnContext, state: ApplicationTurnState) => {
    ConversationHistory.clear(state);
    await context.sendActivity(`Ok forgot all conversation history.`);
});

app.message('/history', async (context: TurnContext, state: ApplicationTurnState) => {
    const history = ConversationHistory.toString(state, 4000, `\n\n`);
    await context.sendActivity(`<strong>Chat history:</strong><br>${history}`);
});

app.message('/story', async (context: TurnContext, state: ApplicationTurnState) => {
    await context.sendActivity(`<strong>The story so far:</strong><br>${state.conversation.value.story ?? ''}`);
});

app.message('/profile', async (context: TurnContext, state: ApplicationTurnState) => {
    const player = state.user.value;
    const backstory = player.backstory.split('\n').join('<br>');
    const equipped = player.equipped.split('\n').join('<br>');
    await context.sendActivity(
        `🤴 <strong>${player.name}</strong><br><strong>Backstory:</strong> ${backstory}<br><strong>Equipped:</strong> ${equipped}`
    );
});

app.ai.action(
    AI.UnknownActionName,
    async (context: TurnContext, state: ApplicationTurnState, data: Record<string, any>, action: string = ' ') => {
        await context.sendActivity(`<strong>${action}</strong> action missing`);
        return true;
    }
);

addActions(app, planValidator);

// Register prompt functions
app.ai.prompts.addFunction('getPlayerJSON', async (context: TurnContext, state: ApplicationTurnState) => {
    const player = state.user.value;
    return JSON.stringify(player);
});

app.ai.prompts.addFunction('describeGameState', async (context: TurnContext, state: ApplicationTurnState) => {
    const conversation = state.conversation.value;
    return `\tTotalTurns: ${conversation.turn - 1}\n\tLocationTurns: ${conversation.locationTurn - 1}`;
});

app.ai.prompts.addFunction('describeCampaign', async (context: TurnContext, state: ApplicationTurnState) => {
    const conversation = state.conversation.value;
    if (conversation.campaign) {
        return `"${conversation.campaign.title}" - ${conversation.campaign.playerIntro}`;
    } else {
        return '';
    }
});

app.ai.prompts.addFunction('describeQuests', async (context: TurnContext, state: ApplicationTurnState) => {
    const conversation = state.conversation.value;
    let text = '';
    let connector = '';
    for (const key in conversation.quests) {
        const quest = conversation.quests[key];
        text += `${connector}"${quest.title}" - ${quest.description}`;
        connector = '\n\n';
    }

    return text.length > 0 ? text : 'none';
});

app.ai.prompts.addFunction('describePlayerInfo', async (context: TurnContext, state: ApplicationTurnState) => {
    const player = state.user.value;
    let text = `\tName: ${player.name}\n\tBackstory: ${player.backstory}\n\tEquipped: ${player.equipped}\n\tInventory:\n`;
    text += describeItemList(player.inventory, `\t\t`);
    return text;
});

app.ai.prompts.addFunction('describeLocation', async (context: TurnContext, state: ApplicationTurnState) => {
    const conversation = state.conversation.value;
    if (conversation.location) {
        return `"${conversation.location.title}" - ${conversation.location.description}`;
    } else {
        return '';
    }
});

app.ai.prompts.addFunction('describeConditions', async (context: TurnContext, state: ApplicationTurnState) => {
    const conversation = state.conversation.value;
    return describeConditions(conversation.time, conversation.day, conversation.temperature, conversation.weather);
});

/**
 * @param items
 * @param indent
 */
export function describeItemList(items: IItemList, indent = '\t'): string {
    let text = '';
    let delim = '';
    for (const key in items) {
        text += `${delim}\t\t${key}: ${items[key]}`;
        delim = '\n';
    }

    return text;
}

/**
 * @param text
 * @param minValue
 */
export function parseNumber(text: string | undefined, minValue?: number): number {
    try {
        const count = parseInt(text ?? `${minValue ?? 0}`);
        if (typeof minValue == 'number') {
            return count >= minValue ? count : minValue;
        } else {
            return count;
        }
    } catch (err) {
        return minValue ?? 0;
    }
}

/**
 * @param text
 */
export function titleCase(text: string): string {
    return text
        .toLowerCase()
        .split(' ')
        .map(function (word) {
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

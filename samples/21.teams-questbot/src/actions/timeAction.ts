import { TurnContext } from 'botbuilder';
import { Application } from '@microsoft/teams-ai';
import { PlanValidator } from "alphawave-teams";
import { ApplicationTurnState, parseNumber } from '../bot';
import { describeConditions, describeSeason, generateTemperature, generateWeather } from '../conditions';
import { IDataEntities } from '../types';


/**
 * @param app
 */
export function timeAction(app: Application<ApplicationTurnState>, validator: PlanValidator): void {
    // Add action to plan validator
    // {"type":"DO","action":"time","entities":{"operation": "wait|query", until: "dawn|morning|noon|afternoon|evening|night", days: <optional count>}}
    validator.action('time', {
        type: 'object',
        properties: {
            operation: {
                type: 'string',
                enum: ['wait', 'query']
            },
            until: {
                type: 'string',
                enum: ['dawn', 'morning', 'noon', 'afternoon', 'evening', 'night']
            },
            days: {
                type: 'number',
                minimum: 0
            }
        },
        required: ['operation']
    });

    // Add action handler
    app.ai.action('time', async (context: TurnContext, state: ApplicationTurnState, data: IDataEntities) => {
        const action = (data.operation ?? '').toLowerCase();
        switch (action) {
            case 'wait':
                return await waitForTime(context, state, data);
            case 'query':
                return await queryTime(context, state);
            default:
                await context.sendActivity(`[time.${action}]`);
                return true;
        }
    });
}

/**
 * @param context
 * @param state
 * @param data
 */
async function waitForTime(context: TurnContext, state: ApplicationTurnState, data: IDataEntities): Promise<boolean> {
    const until = (data.until ?? '').toLowerCase();
    const days = parseNumber(data.days, 0);
    const conversation = state.conversation.value;
    if (until) {
        let notification = '';
        conversation.day += days;
        switch (until) {
            case 'dawn':
                conversation.time = 4;
                if (days < 2) {
                    notification = `⏳ crack of dawn`;
                }
                break;
            case 'morning':
            default:
                conversation.time = 6;
                if (days == 0) {
                    notification = `⏳ early morning`;
                } else if (days == 1) {
                    notification = `⏳ the next morning`;
                }
                break;
            case 'noon':
                conversation.time = 12;
                if (days == 0) {
                    notification = `⏳ today at noon`;
                } else if (days == 1) {
                    notification = `⏳ tomorrow at noon`;
                }
                break;
            case 'afternoon':
                conversation.time = 14;
                if (days == 0) {
                    notification = `⏳ this afternoon`;
                } else if (days == 1) {
                    notification = `⏳ tomorrow afternoon`;
                }
                break;
            case 'evening':
                conversation.time = 18;
                if (days == 0) {
                    notification = `⏳ this evening`;
                } else if (days == 1) {
                    notification = `⏳ tomorrow evening`;
                }
                break;
            case 'night':
                conversation.time = 20;
                if (days == 0) {
                    notification = `⏳ tonight`;
                } else if (days == 1) {
                    notification = `⏳ tomorrow night`;
                }
                break;
        }

        // Generate new weather
        if (days > 0) {
            const season = describeSeason(conversation.day);
            conversation.temperature = generateTemperature(season);
            conversation.weather = generateWeather(season);
            conversation.nextEncounterTurn = conversation.turn + Math.floor(Math.random() * 5) + 1;
        }

        // Notify player
        // - We don't consider this answering the players query. We want the story to be included
        //   for added color.
        await context.sendActivity(notification ? notification : `⏳ ${days} days later`);
        return true;
    } else {
        // If the model calls "time action='wait'"" without any options, just return the current time of day.
        return queryTime(context, state);
    }
}

/**
 * @param context
 * @param state
 */
async function queryTime(context: TurnContext, state: ApplicationTurnState): Promise<boolean> {
    // Render conditions
    const conversation = state.conversation.value;
    const conditions = describeConditions(
        conversation.time,
        conversation.day,
        conversation.temperature,
        conversation.weather
    );

    // Say the current conditions to the player
    await context.sendActivity(`⏳ ${conditions}`);
    return false;
}

import { TurnContext } from 'botbuilder';
import { Application } from '@microsoft/teams-ai';
import { PlanValidator } from "alphawave-teams";
import { ApplicationTurnState } from '../bot';
import { findMapLocation } from '../ShadowFalls';
import { IDataEntities } from '../types';


/**
 * @param app
 */
export function locationAction(app: Application<ApplicationTurnState>, validator: PlanValidator): void {
    // Add action to plan validator
    // {"type":"DO","action":"location","entities":{"operation": "change|update", title: "<title>", description: "<100 word description>"}}
    validator.action('location', {
        type: 'object',
        properties: {
            operation: {
                type: 'string',
                enum: ['change', 'update']
            },
            title: {
                type: 'string',
            },
            description: {
                type: 'string',
            }
        },
        required: ['operation', 'title']
    });

    // Add action handler
    app.ai.action('location', async (context: TurnContext, state: ApplicationTurnState, data: IDataEntities) => {
        const action = (data.operation ?? '').toLowerCase();
        switch (action) {
            case 'change':
            case 'update':
                return await updateLocation(context, state, data);
            default:
                await context.sendActivity(`[location.${action}]`);
                return true;
        }
    });
}

/**
 * @param context
 * @param state
 * @param data
 */
async function updateLocation(
    context: TurnContext,
    state: ApplicationTurnState,
    data: IDataEntities
): Promise<boolean> {
    const conversation = state.conversation.value;
    const currentLocation = conversation.location;

    // Create new location object
    const title = (data.title ?? '').trim();
    conversation.location = {
        title: title,
        description: (data.description ?? '').trim(),
        encounterChance: getEncounterChance(title)
    };

    // Has the location changed?
    // - Ignore the change if the location hasn't changed.
    if (currentLocation?.title !== conversation.location.title) {
        conversation.locationTurn = 1;
        await context.sendActivity(
            `🧭 <strong>${conversation.location.title}</strong><br>${conversation.location.description
                .split('\n')
                .join('<br>')}`
        );
    }

    return true;
}

/**
 * @param title
 */
function getEncounterChance(title: string): number {
    title = title.toLowerCase();
    const location = findMapLocation(title);
    if (location) {
        return location.encounterChance;
    } else if (title.includes('dungeon') || title.includes('cave')) {
        return 0.4;
    } else {
        return 0.2;
    }
}

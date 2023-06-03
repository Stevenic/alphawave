import { TurnContext } from 'botbuilder';
import { Application } from '@microsoft/teams-ai';
import { PlanValidator } from "alphawave-teams";
import { ApplicationTurnState } from '../bot';
import { IDataEntities } from '../types';


/**
 * @param app
 */
export function storyAction(app: Application<ApplicationTurnState>, validator: PlanValidator): void {
    // Add action to plan validator
    // {"type":"DO","action":"story","entities":{"operation": "update", description: "<200 word description>"}}
    validator.action('story', {
        type: 'object',
        properties: {
            operation: {
                type: 'string',
                enum: ['update']
            },
            description: {
                type: 'string',
            }
        },
        required: ['operation', 'description']
    });

    // Add action handler
    app.ai.action('story', async (context: TurnContext, state: ApplicationTurnState, data: IDataEntities) => {
        const action = (data.operation ?? '').toLowerCase();
        switch (action) {
            case 'change':
            case 'update':
                return await updateStory(context, state, data);
            default:
                await context.sendActivity(`[story.${action}]`);
                return true;
        }
    });
}

/**
 * @param context
 * @param state
 * @param data
 */
async function updateStory(context: TurnContext, state: ApplicationTurnState, data: IDataEntities): Promise<boolean> {
    const description = (data.description ?? '').trim();
    if (description.length > 0) {
        // Write story change to conversation state
        state.conversation.value.story = description;
    }

    return true;
}

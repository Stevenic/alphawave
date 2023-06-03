import { TurnContext } from 'botbuilder';
import { Application, Plan, PredictedSayCommand } from '@microsoft/teams-ai';
import { PlanValidator } from "alphawave-teams";
import { ApplicationTurnState } from '../bot';
import { IDataEntities, IMessage } from '../types';
import * as responses from '../responses';


/**
 * @param app
 */
export function mapAction(app: Application<ApplicationTurnState>, validator: PlanValidator): void {
    // Add action to plan validator
    // {"type":"DO","action":"map","entities":{"operation": "query"}}
    validator.action('map', {
        type: 'object',
        properties: {
            operation: {
                type: 'string',
                enum: ['query']
            }
        },
        required: ['operation']
    });

    // Add action handler
    app.ai.action('map', async (context: TurnContext, state: ApplicationTurnState, data: IDataEntities) => {
        const action = (data.operation ?? '').toLowerCase();
        switch (action) {
            case 'query':
                return await queryMap(app, context, state);
            default:
                await context.sendActivity(`[map.${action}]`);
                return true;
        }
    });
}

/**
 * @param app
 * @param context
 * @param state
 */
async function queryMap(
    app: Application<ApplicationTurnState>,
    context: TurnContext,
    state: ApplicationTurnState
): Promise<boolean> {
    // Use the map to answer player
    const newResponse = await app.ai.completePrompt(context, state, 'useMap');
    if (newResponse) {
        // Send response to player
        const text = newResponse.trim();
        await context.sendActivity(text);

        // Add to hsitory for model awareness
        const plan = JSON.stringify({ type: 'plan', commands: [{ type: 'SAY', response: text } as PredictedSayCommand] } as Plan);
        const message: IMessage = { role: 'assistant', content: plan };
        state.conversation.value.history.push(message);
    } else {
        await context.sendActivity(responses.dataError());
    }

    return false;
}

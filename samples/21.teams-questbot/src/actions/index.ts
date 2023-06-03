import { Application } from '@microsoft/teams-ai';
import { PlanValidator } from "alphawave-teams";
import { ApplicationTurnState } from '../bot';
import { inventoryAction } from './inventoryAction';
import { locationAction } from './locationAction';
import { mapAction } from './mapAction';
import { playerAction } from './playerAction';
import { questAction } from './questAction';
import { storyAction } from './storyAction';
import { timeAction } from './timeAction';


/**
 * @param app
 * @param validator
 */
export function addActions(app: Application<ApplicationTurnState>, validator: PlanValidator): void {
    inventoryAction(app, validator);
    locationAction(app, validator);
    mapAction(app, validator);
    playerAction(app, validator);
    questAction(app, validator);
    storyAction(app, validator);
    timeAction(app, validator);
}

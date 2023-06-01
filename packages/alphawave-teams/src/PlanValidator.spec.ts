import { strict as assert } from "assert";
import { FunctionRegistry, GPT3Tokenizer, VolatileMemory } from "promptrix";
import { PromptResponse } from "alphawave";
import { Plan, PredictedDoCommand, PredictedSayCommand } from "@microsoft/teams-ai";
import { PlanValidator } from "./PlanValidator";
import { Schema } from "jsonschema";

function createResponse(content: Plan|string): PromptResponse {
    return {
        status: 'success',
        message: {
            role: 'assistant',
            content: typeof content == 'object' ? JSON.stringify(content) : content,
        }
    };
}

describe("PlanValidator", () => {
    const memory = new VolatileMemory();
    const functions = new FunctionRegistry();
    const tokenizer = new GPT3Tokenizer();
    const validPlan: Plan = {
        type: 'plan',
        commands: [
            {
                type: 'DO',
                action: 'lightsOn'
            } as PredictedDoCommand,
            {
                type: 'DO',
                action: 'pause',
                entities: {
                    duration: 5000
                }
            } as PredictedDoCommand,
            {
                type: 'SAY',
                response: 'Lights on'
            } as PredictedSayCommand,
        ]
    };
    const invalidPlanAction: Plan = {
        type: 'plan',
        commands: [
            {
                type: 'DO',
                action: 'lightsOff',
                entities: {
                }
            } as PredictedDoCommand
        ]
    };
    const missingPlanEntity: Plan = {
        type: 'plan',
        commands: [
            {
                type: 'DO',
                action: 'pause'
            } as PredictedDoCommand
        ]
    };
    const invalidPlanEntity: Plan = {
        type: 'plan',
        commands: [
            {
                type: 'DO',
                action: 'pause',
                entities: {
                    duration: 'foo'
                }
            } as PredictedDoCommand
        ]
    };
    const missingDOAction: Plan = {
        type: 'plan',
        commands: [
            {
                type: 'DO'
            }
        ]
    };
    const missingSAYResponse: Plan = {
        type: 'plan',
        commands: [
            {
                type: 'SAY'
            }
        ]
    };
    const emptyPlan: Plan = {
        type: 'plan',
        commands: [
        ]
    };
    const pauseSchema: Schema = {
        type: 'object',
        properties: {
            duration: {
                type: 'number'
            }
        },
        required: ['duration']
    };


    describe("constructor", () => {
        it("should create a PlanValidator instance", () => {
            const validator = new PlanValidator();
            assert.notEqual(validator, undefined);
        });
    });

    describe("action", () => {
        it("should throw on duplicate action", async () => {
            const validator = new PlanValidator();
            validator.action('foo');
            assert.throws(() => validator.action('foo'));
        });
    });

    const actionValidator = new PlanValidator();
    actionValidator.action('lightsOn');
    actionValidator.action('pause', pauseSchema);
    describe("validateResponse", () => {
        it("should pass a response with a valid plan", async () => {
            const validator = new PlanValidator();
            const result = await validator.validateResponse(memory, functions, tokenizer, createResponse(validPlan));
            assert.equal(result.valid, true);
            assert.equal(result.feedback, undefined);
            assert.deepEqual(result.content, validPlan);
        });

        it("should fail a response with an empty plan", async () => {
            const validator = new PlanValidator();
            const result = await validator.validateResponse(memory, functions, tokenizer, createResponse(emptyPlan));
            assert.equal(result.valid, false);
            assert.equal(result.feedback, `The JSON returned had the following errors:\n"commands": does not meet minimum length of 1\n\nTry again.`);
        });

        it("should pass a response with a valid plan and a valid action", async () => {
            const result = await actionValidator.validateResponse(memory, functions, tokenizer, createResponse(validPlan));
            assert.equal(result.valid, true);
            assert.equal(result.feedback, undefined);
            assert.deepEqual(result.content, validPlan);
        });

        it("should fail a response with a valid plan but invalid action", async () => {
            const result = await actionValidator.validateResponse(memory, functions, tokenizer, createResponse(invalidPlanAction));
            assert.equal(result.valid, false);
            assert.equal(result.feedback, `The plan JSON is using an Unknown action "lightsOff" for command[0]. Try again.`);
        });

        it("should fail a response with a valid plan but missing entity", async () => {
            const result = await actionValidator.validateResponse(memory, functions, tokenizer, createResponse(missingPlanEntity));
            assert.equal(result.valid, false);
            assert.equal(result.feedback, `The plan JSON has invalid entities for action "pause" for command[0]:\n"entities": requires property "duration"\n\nTry again.`);
        });

        it("should fail a response with a valid plan but invalid entity", async () => {
            const result = await actionValidator.validateResponse(memory, functions, tokenizer, createResponse(invalidPlanEntity));
            assert.equal(result.valid, false);
            assert.equal(result.feedback, `The plan JSON has invalid entities for action "pause" for command[0]:\n"entities.duration": is not of a type(s) number\n\nTry again.`);
        });

        it("should fail a response with a missing DO action name", async () => {
            const result = await actionValidator.validateResponse(memory, functions, tokenizer, createResponse(missingDOAction));
            assert.equal(result.valid, false);
            assert.equal(result.feedback, `The plan JSON is missing the DO "action" for command[0]. Try again.`);
        });

        it("should fail a response with a missing SAY response", async () => {
            const result = await actionValidator.validateResponse(memory, functions, tokenizer, createResponse(missingSAYResponse));
            assert.equal(result.valid, false);
            assert.equal(result.feedback, `The plan JSON is missing the SAY "response" for command[0]. Try again.`);
        });
    });
});

import { strict as assert } from "assert";
import { GPT3Tokenizer } from "promptrix";
import { TestClient } from "alphawave";
import { AI, DefaultTurnState, TurnStateEntry, DefaultTempState, PromptTemplate, Plan, PredictedDoCommand, PredictedSayCommand, ConfiguredAIOptions } from "@microsoft/teams-ai";
import { Activity } from "botbuilder";
import { ActionPlanner } from "./ActionPlanner";
import { PlanValidator } from "./PlanValidator";

interface TurnContext {
    activity: Activity;
}

function createState(): DefaultTurnState {
    return {
        conversation: new TurnStateEntry({
            history: [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi' },
            ],
        }),
        user: new TurnStateEntry({
            name: 'John Doe',
        }),
        temp: new TurnStateEntry({
            input: 'How are you?',
        } as DefaultTempState)
    };
}

describe("ActionPlanner", () => {
    const context: TurnContext = {
        activity: {
            type: 'message',
            text: 'Turn on the lights',
        } as Activity
    };
    const trackHistory = {
        history: {
            trackHistory: true,
            maxTurns: 3
        }
    } as ConfiguredAIOptions<DefaultTurnState>;
    const noHistory = {
        history: {
            trackHistory: false,
            maxTurns: 3
        }
    } as ConfiguredAIOptions<DefaultTurnState>;
    const tokenizer = new GPT3Tokenizer();
    const defaultPrompt: PromptTemplate = {
        text: 'What is your name?',
        config: {
            "schema": 1,
            "description": "Answers a players request for help.",
            "type": "completion",
            "completion": {
              "max_tokens": 1000,
              "temperature": 0.7,
              "top_p": 1.0,
              "presence_penalty": 0.6,
              "frequency_penalty": 0.0
            }
        }
    };
    const chatPrompt: PromptTemplate = {
        text: 'What is your name?',
        config: {
            "schema": 1,
            "description": "Answers a players request for help.",
            "type": "completion",
            "completion": {
              "max_tokens": 1000,
              "temperature": 0.7,
              "top_p": 1.0,
              "presence_penalty": 0.6,
              "frequency_penalty": 0.0
            },
            "default_backends": [
                "gpt-4"
            ]
        }
    };
    const textPrompt: PromptTemplate = {
        text: 'What is your name?',
        config: {
            "schema": 1,
            "description": "Answers a players request for help.",
            "type": "completion",
            "completion": {
              "max_tokens": 1000,
              "temperature": 0.7,
              "top_p": 1.0,
              "presence_penalty": 0.6,
              "frequency_penalty": 0.0
            },
            "default_backends": [
                "text-davinci-003"
            ]
        }
    };
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
    const sayPlan: Plan = {
        type: 'plan',
        commands: [
            {
                type: 'SAY',
                response: 'Hello world'
            } as PredictedSayCommand,
        ]
    };
    const invalidResponsePlan: Plan = {
        type: 'plan',
        commands: [
            {
                type: 'DO',
                action: ActionPlanner.InvalidResponseActionName,
                entities: {
                    message: 'No JSON objects were found in the response. Try again.'
                }
            } as PredictedDoCommand
        ]
    };
    const rateLimitedPlan: Plan = {
        type: 'plan',
        commands: [
            {
                type: 'DO',
                action: AI.RateLimitedActionName
            } as PredictedDoCommand
        ]
    };
    const tooLongPlan: Plan = {
        type: 'plan',
        commands: [
            {
                type: 'DO',
                action: ActionPlanner.TooLongActionName
            } as PredictedDoCommand
        ]
    };
    const planValidator = new PlanValidator();

    describe("constructor", () => {
        it("should create an ActionPlanner instance", () => {
            const planner = new ActionPlanner({
                client: new TestClient(),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' }
            });
            assert.notEqual(planner, undefined);
            assert.equal(planner.client instanceof TestClient, true);
            assert.notEqual(planner.options, undefined);
            assert.notEqual(planner.options.prompt_options, undefined);
        });

        it("should create an ActionPlanner instance with custom options", () => {
            const planner = new ActionPlanner({
                client: new TestClient(),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' },
                tokenizer: tokenizer,
            });
            assert.notEqual(planner, undefined);
            assert.equal(planner.client instanceof TestClient, true);
            assert.notEqual(planner.options, undefined);
            assert.notEqual(planner.options.prompt_options, undefined);
            assert.equal(planner.options.tokenizer, tokenizer);
        });
    });

    describe("completePrompt", () => {
        it("should complete a prompt", async () => {
            const state = createState();
            const message = JSON.stringify(validPlan);
            const planner = new ActionPlanner({
                client: new TestClient('success', message),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' }
            });
            const response = await planner.completePrompt(context as any, state, defaultPrompt, trackHistory);
            assert.equal(response, message);
        });

        it("should complete a prompt with no history tracking", async () => {
            const state = createState();
            const message = JSON.stringify(validPlan);
            const planner = new ActionPlanner({
                client: new TestClient('success', message),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' }
            });
            const response = await planner.completePrompt(context as any, state, defaultPrompt, noHistory);
            assert.equal(response, message);
        });

        it("should complete a prompt with an overridden chat completion model", async () => {
            const state = createState();
            const message = JSON.stringify(validPlan);
            const planner = new ActionPlanner({
                client: new TestClient('success', message),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' }
            });
            const response = await planner.completePrompt(context as any, state, chatPrompt, trackHistory);
            assert.equal(response, message);
        });

        it("should complete a prompt with an overridden text completion model", async () => {
            const state = createState();
            const message = JSON.stringify(validPlan);
            const planner = new ActionPlanner({
                client: new TestClient('success', message),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' }
            });
            const response = await planner.completePrompt(context as any, state, textPrompt, trackHistory);
            assert.equal(response, message);
        });

        it("should complete a prompt that uses the 'system' role", async () => {
            const state = createState();
            const message = JSON.stringify(validPlan);
            const planner = new ActionPlanner({
                client: new TestClient('success', message),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' },
                use_system_role: true
            });
            const response = await planner.completePrompt(context as any, state, textPrompt, trackHistory);
            assert.equal(response, message);
        });

        it("should complete a prompt that uses a custom history and input variables", async () => {
            const state = createState();
            const message = JSON.stringify(validPlan);
            const planner = new ActionPlanner({
                client: new TestClient('success', message),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' },
                history_variable: 'custom_history',
                input_variable: 'custom_input'
            });
            const response = await planner.completePrompt(context as any, state, textPrompt, trackHistory);
            assert.equal(response, message);
        });

        it("should complete a prompt uses a validator", async () => {
            const state = createState();
            const message = JSON.stringify(validPlan);
            const planner = new ActionPlanner({
                client: new TestClient('success', message),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' },
                validator: planValidator
            });
            const response = await planner.completePrompt(context as any, state, textPrompt, trackHistory);
            assert.equal(response, message);
        });

        it("should fail a prompt that uses a validator", async () => {
            const state = createState();
            const planner = new ActionPlanner({
                client: new TestClient('success', 'no plan found'),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' },
                validator: planValidator
            });
            const response = await planner.completePrompt(context as any, state, textPrompt, trackHistory);
            assert.equal(response, undefined);
        });

        it("should retry a prompt that uses a validator", async () => {
            const state = createState();
            const planner = new ActionPlanner({
                client: new TestClient('success', 'no plan found'),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' },
                validator: planValidator,
                retry_invalid_responses: true
            });
            const response = await planner.completePrompt(context as any, state, textPrompt, trackHistory);
            assert.equal(response, undefined);
        });

        it("should throw an error if the prompt fails", async () => {
            const state = createState();
            const planner = new ActionPlanner({
                client: new TestClient('error', 'something went wrong'),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' },
            });
            await assert.rejects(async () => {
                await planner.completePrompt(context as any, state, textPrompt, trackHistory);
            });
        });
    });

    describe("generatePlan", () => {
        it("should generate a plan", async () => {
            const state = createState();
            const message = JSON.stringify(validPlan);
            const planner = new ActionPlanner({
                client: new TestClient('success', message),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' }
            });
            const plan = await planner.generatePlan(context as any, state, defaultPrompt, trackHistory);
            assert.deepEqual(plan, validPlan);
        });

        it("should generate a plan with A SAY action when not using a validator", async () => {
            const state = createState();
            const planner = new ActionPlanner({
                client: new TestClient('success', 'Hello world'),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' }
            });
            const plan = await planner.generatePlan(context as any, state, defaultPrompt, trackHistory);
            assert.deepEqual(plan, sayPlan);
        });

        it("should generate a plan with no history tracking", async () => {
            const state = createState();
            const message = JSON.stringify(validPlan);
            const planner = new ActionPlanner({
                client: new TestClient('success', message),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' }
            });
            const plan = await planner.generatePlan(context as any, state, defaultPrompt, noHistory);
            assert.deepEqual(plan, validPlan);
        });

        it("should generate a plan with an overridden chat completion model", async () => {
            const state = createState();
            const message = JSON.stringify(validPlan);
            const planner = new ActionPlanner({
                client: new TestClient('success', message),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' }
            });
            const plan = await planner.generatePlan(context as any, state, chatPrompt, trackHistory);
            assert.deepEqual(plan, validPlan);
        });

        it("should generate a plan with an overridden text completion model", async () => {
            const state = createState();
            const message = JSON.stringify(validPlan);
            const planner = new ActionPlanner({
                client: new TestClient('success', message),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' }
            });
            const plan = await planner.generatePlan(context as any, state, textPrompt, trackHistory);
            assert.deepEqual(plan, validPlan);
        });

        it("should generate a plan that uses the 'system' role", async () => {
            const state = createState();
            const message = JSON.stringify(validPlan);
            const planner = new ActionPlanner({
                client: new TestClient('success', message),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' },
                use_system_role: true
            });
            const plan = await planner.generatePlan(context as any, state, textPrompt, trackHistory);
            assert.deepEqual(plan, validPlan);
        });

        it("should generate a plan that uses a custom history and input variables", async () => {
            const state = createState();
            const message = JSON.stringify(validPlan);
            const planner = new ActionPlanner({
                client: new TestClient('success', message),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' },
                history_variable: 'custom_history',
                input_variable: 'custom_input'
            });
            const plan = await planner.generatePlan(context as any, state, textPrompt, trackHistory);
            assert.deepEqual(plan, validPlan);
        });

        it("should generate a plan that uses a validator", async () => {
            const state = createState();
            const message = JSON.stringify(validPlan);
            const planner = new ActionPlanner({
                client: new TestClient('success', message),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' },
                validator: planValidator
            });
            const plan = await planner.generatePlan(context as any, state, textPrompt, trackHistory);
            assert.deepEqual(plan, validPlan);
        });

        it("should redirect to ActionPlanner.InvalidResponseActionName when a plan fails validation.", async () => {
            const state = createState();
            const planner = new ActionPlanner({
                client: new TestClient('success', 'no plan found'),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' },
                validator: planValidator
            });
            const plan = await planner.generatePlan(context as any, state, textPrompt, trackHistory);
            assert.deepEqual(plan, invalidResponsePlan);
        });

        it("should retry execution when a plan fails validation.", async () => {
            const state = createState();
            const planner = new ActionPlanner({
                client: new TestClient('success', 'no plan found'),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' },
                validator: planValidator,
                retry_invalid_responses: true
            });
            const plan = await planner.generatePlan(context as any, state, textPrompt, trackHistory);
            assert.deepEqual(plan, invalidResponsePlan);
        });

        it("should redirect to AI.RateLimitedActionName when the client is rate limited.", async () => {
            const state = createState();
            const planner = new ActionPlanner({
                client: new TestClient('rate_limited'),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' },
                validator: planValidator
            });
            const plan = await planner.generatePlan(context as any, state, textPrompt, trackHistory);
            assert.deepEqual(plan, rateLimitedPlan);
        });

        it("should redirect to ActionPlanner.TooLongActionName when the input prompt is too long.", async () => {
            const state = createState();
            const planner = new ActionPlanner({
                client: new TestClient('too_long'),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' },
                validator: planValidator
            });
            const plan = await planner.generatePlan(context as any, state, textPrompt, trackHistory);
            assert.deepEqual(plan, tooLongPlan);
        });

        it("should throw an error when the client returns an error.", async () => {
            const state = createState();
            const planner = new ActionPlanner({
                client: new TestClient('error', 'something went wrong'),
                prompt_options: { completion_type: 'chat', model: 'gpt-3.5-turbo' },
                validator: planValidator
            });
            await assert.rejects(async () => {
                await planner.generatePlan(context as any, state, textPrompt, trackHistory);
            });
        });
    });
});

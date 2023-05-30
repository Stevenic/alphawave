import { strict as assert } from "assert";
import { FunctionRegistry, GPT3Tokenizer, Prompt, PromptFunctions, PromptMemory, Tokenizer, VolatileMemory } from "promptrix";
import { PromptCompletionOptions, PromptResponse, PromptResponseValidator, PromptResponseValidation } from "./types";
import { DefaultResponseValidator } from "./DefaultResponseValidator";
import { TestClient } from "./TestClient";
import { AlphaWave } from "./AlphaWave";

class TestValidator implements PromptResponseValidator {
    public feedback: string = 'Something is wrong';
    public repairAttempts: number = 0;
    public exception?: Error;
    public clientErrorDuringRepair: boolean = false;

    public constructor(public client: TestClient) { }

    public validateResponse(memory: PromptMemory, functions: PromptFunctions, tokenizer: Tokenizer, response: PromptResponse): Promise<PromptResponseValidation> {
        if (this.exception) {
            const exception = this.exception;
            this.exception = undefined;
            return Promise.reject(exception);
        }

        if (this.clientErrorDuringRepair && this.repairAttempts == 1) {
            // Simulate a client error on next turn
            this.clientErrorDuringRepair = false;
            this.client.status = 'error';
            this.client.response = 'Some Error';
            return Promise.resolve({ isValid: false, feedback: this.feedback });
        } else if (this.repairAttempts > 0) {
            this.repairAttempts--;
            return Promise.resolve({ isValid: false, feedback: this.feedback });
        } else {
            return Promise.resolve({ isValid: true });
        }
    }
}

describe("AlphaWave", () => {
    const client = new TestClient('success', { role: 'assistant', content: 'Hello' });
    const prompt = new Prompt([]);
    const prompt_options: PromptCompletionOptions = { completion_type: 'chat', model: 'test' };
    const memory = new VolatileMemory();
    const functions = new FunctionRegistry();
    const tokenizer = new GPT3Tokenizer();
    const validator = new TestValidator(client);

    describe("constructor", () => {
        it("should create a AlphaWave and use default values", () => {
            const wave = new AlphaWave({ client, prompt, prompt_options });
            assert.notEqual(wave, undefined);
            assert.notEqual(wave.options, undefined);
            assert.equal(wave.options.client, client);
            assert.equal(wave.options.prompt, prompt);
            assert.equal(wave.options.prompt_options, prompt_options);
            assert.equal(wave.options.memory instanceof VolatileMemory, true);
            assert.equal(wave.options.functions instanceof FunctionRegistry, true);
            assert.equal(wave.options.tokenizer instanceof GPT3Tokenizer, true);
            assert.equal(wave.options.validator instanceof DefaultResponseValidator, true);
            assert.equal(wave.options.history_variable, 'history');
            assert.equal(wave.options.input_variable, 'input');
            assert.equal(wave.options.max_repair_attempts, 3);
            assert.equal(wave.options.max_history_messages, 10);
        });

        it("should create a AlphaWave and use provided values", () => {
            const wave = new AlphaWave({ client, prompt, prompt_options, memory, functions, tokenizer, validator, history_variable: 'test_history', input_variable: 'test_input', max_repair_attempts: 5, max_history_messages: 20 });
            assert.notEqual(wave, undefined);
            assert.notEqual(wave.options, undefined);
            assert.equal(wave.options.client, client);
            assert.equal(wave.options.prompt, prompt);
            assert.equal(wave.options.prompt_options, prompt_options);
            assert.equal(wave.options.memory, memory);
            assert.equal(wave.options.functions, functions);
            assert.equal(wave.options.tokenizer, tokenizer);
            assert.equal(wave.options.validator, validator);
            assert.equal(wave.options.history_variable, 'test_history');
            assert.equal(wave.options.input_variable, 'test_input');
            assert.equal(wave.options.max_repair_attempts, 5);
            assert.equal(wave.options.max_history_messages, 20);
        });
    });

    const wave = new AlphaWave({ client, prompt, prompt_options, memory, functions, tokenizer, validator });
    describe("basic prompt completion", () => {
        it("should complete a prompt and update history", async () => {
            const response = await wave.completePrompt();
            assert.equal(response.status, 'success');
            assert.deepEqual(response.message, { role: 'assistant', content: 'Hello' });
            const history = memory.get('history');
            assert.deepEqual(history, [{ role: 'assistant', content: 'Hello' }]);
            const input = memory.get('input');
            assert.equal(input, undefined);
            memory.clear();
        });

        it("should complete a prompt with input passed in", async () => {
            client.response = 'Hello';
            const response = await wave.completePrompt('Hi');
            assert.equal(response.status, 'success');
            assert.deepEqual(response.message, { role: 'assistant', content: 'Hello' });
            const history = memory.get('history');
            assert.deepEqual(history, [{ role: 'user', content: 'Hi' },{ role: 'assistant', content: 'Hello' }]);
            const input = memory.get('input');
            assert.equal(input, 'Hi');
            memory.clear();
        });

        it("should complete a prompt with input already in memory", async () => {
            client.response = 'Hello';
            memory.set('input', 'Hi');
            const response = await wave.completePrompt();
            assert.equal(response.status, 'success');
            assert.deepEqual(response.message, { role: 'assistant', content: 'Hello' });
            const history = memory.get('history');
            assert.deepEqual(history, [{ role: 'user', content: 'Hi' },{ role: 'assistant', content: 'Hello' }]);
            const input = memory.get('input');
            assert.equal(input, 'Hi');
            memory.clear();
        });

        it("should complete a prompt and update existing history", async () => {
            client.response = 'Sure I can help with that';
            memory.set('history', [{ role: 'user', content: 'Hi' },{ role: 'assistant', content: 'Hi! How may I assist you?' }]);
            const response = await wave.completePrompt('book flight');
            assert.equal(response.status, 'success');
            assert.deepEqual(response.message, { role: 'assistant', content: 'Sure I can help with that' });
            const history = memory.get('history');
            assert.deepEqual(history, [{ role: 'user', content: 'Hi' },{ role: 'assistant', content: 'Hi! How may I assist you?' },{ role: 'user', content: 'book flight' },{ role: 'assistant', content: 'Sure I can help with that' }]);
            memory.clear();
        });

        it("should complete a prompt and update existing history with a max history limit", async () => {
            client.response = 'Hello';
            for (let i = 0; i < 20; i++) {
                const response = await wave.completePrompt();
                assert.equal(response.status, 'success');
                assert.deepEqual(response.message, { role: 'assistant', content: 'Hello' });
            }
            const history = memory.get('history');
            assert.equal(history.length, wave.options.max_history_messages);
            memory.clear();
        });

        it("should complete a prompt and update existing history with a max history limit and input passed in", async () => {
            client.response = 'Hello';
            for (let i = 0; i < 20; i++) {
                const response = await wave.completePrompt('Hi');
                assert.equal(response.status, 'success');
                assert.deepEqual(response.message, { role: 'assistant', content: 'Hello' });
            }
            const history = memory.get('history');
            assert.equal(history.length, wave.options.max_history_messages);
            memory.clear();
        });

        it("should return an empty string for undefined response", async () => {
            client.response = undefined as any;
            const response = await wave.completePrompt();
            assert.equal(response.status, 'success');
            assert.deepEqual(response.message, { role: 'assistant', content: '' });
            memory.clear();
        });

        it("should not update memory if no input_variable configured", async () => {
            const wave = new AlphaWave({ client, prompt, prompt_options, memory, functions, tokenizer, validator, input_variable: '' });
            client.response = 'Hello';
            const response = await wave.completePrompt('Hi');
            assert.equal(response.status, 'success');
            assert.deepEqual(response.message, { role: 'assistant', content: 'Hello' });
            const input = memory.get('');
            assert.equal(input, undefined);
            memory.clear();
        });

        it("should not update memory if no input_variable configured and no input passed in", async () => {
            const wave = new AlphaWave({ client, prompt, prompt_options, memory, functions, tokenizer, validator, input_variable: '' });
            client.response = 'Hello';
            const response = await wave.completePrompt('');
            assert.equal(response.status, 'success');
            assert.deepEqual(response.message, { role: 'assistant', content: 'Hello' });
            const input = memory.get('');
            assert.equal(input, undefined);
            memory.clear();
        });

        it("should not update memory if no history_variable configured", async () => {
            const wave = new AlphaWave({ client, prompt, prompt_options, memory, functions, tokenizer, validator, history_variable: '' });
            client.response = 'Hello';
            const response = await wave.completePrompt('Hi');
            assert.equal(response.status, 'success');
            assert.deepEqual(response.message, { role: 'assistant', content: 'Hello' });
            const history = memory.get('');
            assert.equal(history, undefined);
            memory.clear();
        });

        it("should return a client error", async () => {
            client.status = 'error';
            client.response = 'Some Error';
            const response = await wave.completePrompt('Hi');
            assert.equal(response.status, 'error');
            assert.equal(response.message, 'Some Error');
            memory.clear();
        });

        it("should map any exceptions to errors", async () => {
            client.status = 'success';
            client.response = 'Hello';
            validator.exception = new Error('Some Exception');
            const response = await wave.completePrompt('Hi');
            assert.equal(response.status, 'error');
            assert.equal(response.message, 'Some Exception');
            memory.clear();
        });

        it("should map any non Error based exceptions to errors", async () => {
            client.status = 'success';
            client.response = 'Hello';
            validator.exception = 'Some Exception' as any;
            const response = await wave.completePrompt('Hi');
            assert.equal(response.status, 'error');
            assert.equal(response.message, 'Some Exception');
            memory.clear();
        });
    });

    describe("prompt completion with validation", () => {
        it("should repair an error in one turn", async () => {
            client.response = 'Hello';
            validator.repairAttempts = 1;
            const response = await wave.completePrompt('Hi');
            assert.equal(response.status, 'success');
            assert.deepEqual(response.message, { role: 'assistant', content: 'Hello' });
            const history = memory.get('history');
            assert.deepEqual(history, [{ role: 'user', content: 'Hi' },{ role: 'assistant', content: 'Hello' }]);
            memory.clear();
        });

        it("should repair an error in two turns", async () => {
            client.response = 'Hello';
            validator.repairAttempts = 2;
            const response = await wave.completePrompt('Hi');
            assert.equal(response.status, 'success');
            assert.deepEqual(response.message, { role: 'assistant', content: 'Hello' });
            const history = memory.get('history');
            assert.deepEqual(history, [{ role: 'user', content: 'Hi' },{ role: 'assistant', content: 'Hello' }]);
            memory.clear();
        });

        it("should repair an error in three turns", async () => {
            client.response = 'Hello';
            validator.repairAttempts = 3;
            const response = await wave.completePrompt('Hi');
            assert.equal(response.status, 'success');
            assert.deepEqual(response.message, { role: 'assistant', content: 'Hello' });
            const history = memory.get('history');
            assert.deepEqual(history, [{ role: 'user', content: 'Hi' },{ role: 'assistant', content: 'Hello' }]);
            memory.clear();
        });

        it("should fail to repair an error in four turns", async () => {
            client.response = 'Hello';
            validator.repairAttempts = 4;
            const response = await wave.completePrompt('Hi');
            assert.equal(response.status, 'invalid_response');
            assert.equal(response.message, validator.feedback);
            const history = memory.get('history');
            assert.equal(history, undefined);
            memory.clear();
        });

        it("should return client errors while repairing", async () => {
            client.response = 'Hello';
            validator.repairAttempts = 2;
            validator.clientErrorDuringRepair = true;
            const response = await wave.completePrompt('Hi');
            assert.equal(response.status, 'error');
            assert.equal(response.message, 'Some Error');
            memory.clear();
        });

        it("should use default feedback when repairing", async () => {
            client.status = 'success';
            client.response = 'Hello';
            validator.repairAttempts = 1;
            validator.feedback = undefined as any;
            const response = await wave.completePrompt('Hi');
            assert.equal(response.status, 'success');
            assert.deepEqual(response.message, { role: 'assistant', content: 'Hello' });
            const history = memory.get('history');
            assert.deepEqual(history, [{ role: 'user', content: 'Hi' },{ role: 'assistant', content: 'Hello' }]);
            memory.clear();
        });

        it("should return an empty string for a repaired response that's undefined", async () => {
            client.status = 'success';
            client.response =  undefined as any;
            validator.repairAttempts = 1;
            const response = await wave.completePrompt('Hi');
            assert.equal(response.status, 'success');
            assert.deepEqual(response.message, { role: 'assistant', content: '' });
            memory.clear();
        });

        it("should return a message object as a repaired response", async () => {
            client.status = 'success';
            client.response = { role: 'assistant', content: 'Hello World' };
            validator.repairAttempts = 1;
            const response = await wave.completePrompt('Hi');
            assert.equal(response.status, 'success');
            assert.deepEqual(response.message, { role: 'assistant', content: 'Hello World' });
            const history = memory.get('history');
            assert.deepEqual(history, [{ role: 'user', content: 'Hi' },{ role: 'assistant', content: 'Hello World' }]);
            memory.clear();
        });
    });
});

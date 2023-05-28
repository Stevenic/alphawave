import { strict as assert } from "assert";
import { FunctionRegistry, GPT3Tokenizer, Prompt, VolatileMemory } from "promptrix";
import { PromptCompletionOptions } from "./types";
import { TestClient } from "./TestClient";


describe("TestClient", () => {
    const memory = new VolatileMemory();
    const functions = new FunctionRegistry();
    const tokenizer = new GPT3Tokenizer();
    const prompt = new Prompt([]);
    const options: PromptCompletionOptions = {
        completion_type: 'text',
        model: 'davinci',
    };

    describe("constructor", () => {
        it("should create a TestClient with default params", () => {
            const client = new TestClient();
            assert.equal(client.status, 'success');
            assert.equal(client.response, 'Hello World');
        });

        it("should create a TestClient with custom params", () => {
            const client = new TestClient('error', 'Hello Error');
            assert.equal(client.status, 'error');
            assert.equal(client.response, 'Hello Error');
        });
    });

    describe("completePrompt", () => {
        it("should return a success response", async () => {
            const client = new TestClient();
            const response = await client.completePrompt(memory, functions, tokenizer, prompt, options);
            assert.equal(response.status, 'success');
            assert.equal(response.response, 'Hello World');
        });
    });
});

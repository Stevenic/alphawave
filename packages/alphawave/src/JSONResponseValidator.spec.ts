import { strict as assert } from "assert";
import { FunctionRegistry, GPT3Tokenizer, VolatileMemory } from "promptrix";
import { JSONResponseValidator } from "./JSONResponseValidator";
import { Schema } from "jsonschema";


describe("JSONResponseValidator", () => {
    const memory = new VolatileMemory();
    const functions = new FunctionRegistry();
    const tokenizer = new GPT3Tokenizer();
    const schema: Schema = {
        type: "object",
        properties: {
            foo: {
                type: "string"
            }
        },
        required: ["foo"]
    };

    describe("constructor", () => {
        it("should create a JSONResponseValidator", () => {
            const validator = new JSONResponseValidator();
            assert.notEqual(validator, undefined);
        });

        it("should create a JSONResponseValidator with schema", () => {
            const validator = new JSONResponseValidator(schema);
            assert.notEqual(validator, undefined);
        });
    });

    describe("validateResponse", () => {
        it("should pass a JSON object with no schema", async () => {
            const validator = new JSONResponseValidator();
            const response = await validator.validateResponse(memory, functions, tokenizer, { status: 'success', message: '{"foo":"bar"}' });
            assert.notEqual(response, undefined);
            assert.equal(response.valid, true);
            assert.deepEqual(response.content, { foo: 'bar' });
        });

        it("should pass a JSON object passed in as a message", async () => {
            const validator = new JSONResponseValidator();
            const response = await validator.validateResponse(memory, functions, tokenizer, { status: 'success', message: { role: 'assstant', content: '{"foo":"bar"}' } });
            assert.notEqual(response, undefined);
            assert.equal(response.valid, true);
            assert.deepEqual(response.content, { foo: 'bar' });
        });

        it("should pass a JSON object with schema", async () => {
            const validator = new JSONResponseValidator(schema);
            const response = await validator.validateResponse(memory, functions, tokenizer, { status: 'success', message: '{"foo":"bar"}' });
            assert.notEqual(response, undefined);
            assert.equal(response.valid, true);
            assert.deepEqual(response.content, { foo: 'bar' });
        });

        it("should fail a response with no JSON object", async () => {
            const validator = new JSONResponseValidator();
            const response = await validator.validateResponse(memory, functions, tokenizer, { status: 'success', message: '' });
            assert.notEqual(response, undefined);
            assert.equal(response.valid, false);
            assert.equal(response.feedback, 'No JSON objects were found in the response. Try again.');
            assert.equal(response.content, undefined);
        });

        it("should fail a response with no JSON object as a message", async () => {
            const validator = new JSONResponseValidator();
            const response = await validator.validateResponse(memory, functions, tokenizer, { status: 'success', message: { role: 'assistant', content: undefined } });
            assert.notEqual(response, undefined);
            assert.equal(response.valid, false);
            assert.equal(response.feedback, 'No JSON objects were found in the response. Try again.');
            assert.equal(response.content, undefined);
        });

        it("should fail a JSON object that doesn't match schema", async () => {
            const validator = new JSONResponseValidator(schema);
            const response = await validator.validateResponse(memory, functions, tokenizer, { status: 'success', message: '{"foo":7}' });
            assert.notEqual(response, undefined);
            assert.equal(response.valid, false);
            assert.equal(response.feedback, `The JSON returned had the following errors:\n"foo": is not of a type(s) string\n\nTry again.`);
        });

        it("should validate multiple objects in a response and return the last valid one", async () => {
            const validator = new JSONResponseValidator(schema);
            const response = await validator.validateResponse(memory, functions, tokenizer, { status: 'success', message: '{"foo":"taco"}\n{"foo":"bar"}' });
            assert.notEqual(response, undefined);
            assert.equal(response.valid, true);
            assert.deepEqual(response.content, { foo: 'bar' });
        });

        it("should validate multiple objects in a response and return the only valid one", async () => {
            const validator = new JSONResponseValidator(schema);
            const response = await validator.validateResponse(memory, functions, tokenizer, { status: 'success', message: '{"foo":1}\n{"foo":"bar"}\n{"foo":3}' });
            assert.notEqual(response, undefined);
            assert.equal(response.valid, true);
            assert.deepEqual(response.content, { foo: 'bar' });
        });

        it("should validate multiple objects ", async () => {
            const validator = new JSONResponseValidator(schema);
            const response = await validator.validateResponse(memory, functions, tokenizer, { status: 'success', message: '{"bar":"foo"}\n{"foo":3}' });
            assert.notEqual(response, undefined);
            assert.equal(response.valid, false);
            assert.equal(response.feedback, `The JSON returned had the following errors:\n"foo": is not of a type(s) string\n\nTry again.`);
        });
    });
});
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
            const response = await validator.validateResponse(memory, functions, tokenizer, { status: 'success', response: '{"foo":"bar"}' });
            assert.notEqual(response, undefined);
            assert.equal(response.isValid, true);
            assert.deepEqual(response.content, { foo: 'bar' });
        });

        it("should pass a JSON object with schema", async () => {
            const validator = new JSONResponseValidator(schema);
            const response = await validator.validateResponse(memory, functions, tokenizer, { status: 'success', response: '{"foo":"bar"}' });
            assert.notEqual(response, undefined);
            assert.equal(response.isValid, true);
            assert.deepEqual(response.content, { foo: 'bar' });
        });

        it("should fail a response with no JSON object", async () => {
            const validator = new JSONResponseValidator();
            const response = await validator.validateResponse(memory, functions, tokenizer, { status: 'success', response: '' });
            assert.notEqual(response, undefined);
            assert.equal(response.isValid, false);
            assert.equal(response.feedback, 'No JSON objects were found in the response. Try again.');
            assert.equal(response.content, undefined);
        });

        it("should fail a JSON object that doesn't match schema", async () => {
            const validator = new JSONResponseValidator(schema);
            const response = await validator.validateResponse(memory, functions, tokenizer, { status: 'success', response: '{"foo":7}' });
            assert.notEqual(response, undefined);
            assert.equal(response.isValid, false);
            assert.equal(response.feedback, `The JSON returned had the following errors:\n"foo": is not of a type(s) string\n\nTry again.`);
        });
    });
});

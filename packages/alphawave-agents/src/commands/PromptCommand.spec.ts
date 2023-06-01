import { strict as assert } from "assert";
import { FunctionRegistry, GPT3Tokenizer, Prompt, VolatileMemory, Message } from "promptrix";
import { TestClient, PromptCompletionOptions } from "alphawave";
import { PromptCommand } from "./PromptCommand";
import { CommandSchema } from "../SchemaBasedCommand";


describe("PromptCommand", () => {
    const memory = new VolatileMemory();
    const functions = new FunctionRegistry();
    const tokenizer = new GPT3Tokenizer();
    const prompt = new Prompt([]);
    const prompt_options: PromptCompletionOptions = { completion_type: 'chat', model: 'gpt-3.5-turbo' };
    const prompt_response = { role: 'assistant', content: "fact remembered" };
    const client = new TestClient('success', prompt_response);
    const schema: CommandSchema = {
        type: 'object',
        title: 'test',
        description: 'test description',
        properties: {
            fact: {
                type: 'string',
                description: 'a fact'
            }
        },
        required: ['fact']
    };

    describe("constructor", () => {
        it("should create a PromptCommand", () => {
            const command = new PromptCommand({ prompt, prompt_options, client, schema });
            assert.equal(command.title, 'test');
            assert.equal(command.description, 'test description');
            assert.equal(command.inputs, `"fact":"<a fact>"`);
            assert.equal(command.output, undefined);
        });
    });

    describe("validate", () => {
        it("should pass a valid input", async () => {
            const command = new PromptCommand({ prompt, prompt_options, client, schema });
            const input = {
                fact: 'test fact'
            };
            const result = await command.validate(input, memory, functions, tokenizer);
            assert.equal(result.valid, true);
            assert.deepEqual(result.content, input);
        });

        it("should fail an invalid input", async () => {
            const command = new PromptCommand({ prompt, prompt_options, client, schema });
            const input = {
                test: 'test fact'
            };
            const result = await command.validate(input as any, memory, functions, tokenizer);
            assert.equal(result.valid, false);
            assert.equal(result.feedback, 'The command.input has errors:\n"input": requires property "fact"\n\nTry again.');
        });
    });

    describe("execute", () => {
        it("should return models response", async () => {
            const command = new PromptCommand({ prompt, prompt_options, client, schema });
            const input = {
                fact: 'test fact'
            };
            const result = await command.execute(input, memory, functions, tokenizer);
            assert.equal(result, 'fact remembered');
        });
    });
});

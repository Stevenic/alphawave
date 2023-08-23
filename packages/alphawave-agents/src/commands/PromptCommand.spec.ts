import { strict as assert } from "assert";
import { Prompt } from "promptrix";
import { TestModel } from "alphawave";
import { PromptCommand } from "./PromptCommand";
import { CommandSchema } from "../SchemaBasedCommand";
import { TestTaskContext } from "../TestTaskContext";


describe("PromptCommand", () => {
    const context = new TestTaskContext();
    const prompt = new Prompt([]);
    const prompt_response = { role: 'assistant', content: "fact remembered" };
    const model = new TestModel('success', prompt_response);
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
            const command = new PromptCommand({ prompt, model, schema });
            assert.equal(command.title, 'test');
            assert.equal(command.description, 'test description');
            assert.equal(command.inputs, `"fact":"<a fact>"`);
            assert.equal(command.output, undefined);
        });
    });

    describe("validate", () => {
        it("should pass a valid input", async () => {
            const command = new PromptCommand({ prompt, model, schema });
            const input = {
                fact: 'test fact'
            };
            const result = await command.validate(input, context.memory, context.functions, context.tokenizer);
            assert.equal(result.valid, true);
            assert.deepEqual(result.value, input);
        });

        it("should fail an invalid input", async () => {
            const command = new PromptCommand({ prompt, model, schema });
            const input = {
                test: 'test fact'
            };
            const result = await command.validate(input as any, context.memory, context.functions, context.tokenizer);
            assert.equal(result.valid, false);
            assert.equal(result.feedback, 'The command.input has errors:\n"input": requires property "fact"\n\nTry again.');
        });
    });

    describe("execute", () => {
        it("should return models response", async () => {
            const command = new PromptCommand({ prompt, model, schema });
            const input = {
                fact: 'test fact'
            };
            const result = await command.execute(context, input);
            assert.equal(result, 'fact remembered');
        });
    });
});

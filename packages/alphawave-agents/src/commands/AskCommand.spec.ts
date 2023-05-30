import { strict as assert } from "assert";
import { FunctionRegistry, GPT3Tokenizer, VolatileMemory } from "promptrix";
import { AskCommand } from "./AskCommand";


describe("AskCommand", () => {
    const memory = new VolatileMemory();
    const functions = new FunctionRegistry();
    const tokenizer = new GPT3Tokenizer();

    describe("constructor", () => {
        it("should create a AskCommand with default params", () => {
            const command = new AskCommand();
            assert.equal(command.title, 'ask');
            assert.equal(command.description, 'ask the user a question and wait for their response');
            assert.equal(command.inputs, `"question":"<question to ask>"`);
            assert.equal(command.output, 'users answer');
        });

        it("should create a AskCommand with custom params", () => {
            const command = new AskCommand('custom title', 'custom description');
            assert.equal(command.title, 'custom title');
            assert.equal(command.description, 'custom description');
            assert.equal(command.inputs, `"question":"<question to ask>"`);
            assert.equal(command.output, 'users answer');
        });
    });

    describe("validate", () => {
        it("should pass a valid input", async () => {
            const command = new AskCommand();
            const input = {
                question: 'how are you?'
            };
            const result = await command.validate(input, memory, functions, tokenizer);
            assert.equal(result.isValid, true);
            assert.deepEqual(result.content, input);
        });

        it("should fail an invalid input", async () => {
            const command = new AskCommand();
            const input = {
                ask: 'how are you?'
            };
            const result = await command.validate(input as any, memory, functions, tokenizer);
            assert.equal(result.isValid, false);
            assert.equal(result.feedback, 'The command.input has errors:\n"input": requires property "question"\n\nTry again.');
        });
    });

    describe("execute", () => {
        it("should return input_needed", async () => {
            const command = new AskCommand();
            const input = {
                question: 'how are you?'
            };
            const result = await command.execute(input, memory, functions, tokenizer);
            assert.deepEqual(result, {
                type: "TaskResponse",
                status: "input_needed",
                message: "how are you?"
            });
        });
    });
});

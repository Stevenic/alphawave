import { strict as assert } from "assert";
import { FunctionRegistry, GPT3Tokenizer, VolatileMemory } from "promptrix";
import { FinalAnswerCommand } from "./FinalAnswerCommand";


describe("FinalAnswerCommand", () => {
    const memory = new VolatileMemory();
    const functions = new FunctionRegistry();
    const tokenizer = new GPT3Tokenizer();

    describe("constructor", () => {
        it("should create a FinalAnswerCommand with default params", () => {
            const command = new FinalAnswerCommand();
            assert.equal(command.title, 'finalAnswer');
            assert.equal(command.description, 'generate an answer for the user');
            assert.equal(command.inputs, `"answer":"<final answer>"`);
            assert.equal(command.output, 'a followup task or question');
        });

        it("should create a FinalAnswerCommand with custom params", () => {
            const command = new FinalAnswerCommand('custom title', 'custom description');
            assert.equal(command.title, 'custom title');
            assert.equal(command.description, 'custom description');
            assert.equal(command.inputs, `"answer":"<final answer>"`);
            assert.equal(command.output, 'a followup task or question');
        });
    });

    describe("validate", () => {
        it("should pass a valid input", async () => {
            const command = new FinalAnswerCommand();
            const input = {
                answer: 'final answer'
            };
            const result = await command.validate(input, memory, functions, tokenizer);
            assert.equal(result.isValid, true);
            assert.deepEqual(result.content, input);
        });

        it("should fail an invalid input", async () => {
            const command = new FinalAnswerCommand();
            const input = {
                foo: 'final answer'
            };
            const result = await command.validate(input as any, memory, functions, tokenizer);
            assert.equal(result.isValid, false);
            assert.equal(result.feedback, 'The command.input has errors:\n"input": requires property "answer"\n\nTry again.');
        });
    });

    describe("execute", () => {
        it("should return success", async () => {
            const command = new FinalAnswerCommand();
            const input = {
                answer: 'final answer'
            };
            const result = await command.execute(input, memory, functions, tokenizer);
            assert.deepEqual(result, {
                type: "TaskResponse",
                status: "success",
                message: "final answer"
            });
        });
    });
});

import { strict as assert } from "assert";
import { FunctionRegistry, GPT3Tokenizer, VolatileMemory } from "promptrix";
import { MathCommand } from "./MathCommand";


describe("MathCommand", () => {
    const memory = new VolatileMemory();
    const functions = new FunctionRegistry();
    const tokenizer = new GPT3Tokenizer();

    describe("constructor", () => {
        it("should create a MathCommand with default params", () => {
            const command = new MathCommand();
            assert.equal(command.title, 'math');
            assert.equal(command.description, 'execute some javascript code to calculate a value');
            assert.equal(command.inputs, `"code":"<javascript expression to evaluate>"`);
            assert.equal(command.output, 'the calculated value');
        });

        it("should create a MathCommand with custom params", () => {
            const command = new MathCommand('custom title', 'custom description');
            assert.equal(command.title, 'custom title');
            assert.equal(command.description, 'custom description');
            assert.equal(command.inputs, `"code":"<javascript expression to evaluate>"`);
            assert.equal(command.output, 'the calculated value');
        });
    });

    describe("validate", () => {
        it("should pass a valid input", async () => {
            const command = new MathCommand();
            const input = {
                code: '7 + 3'
            };
            const result = await command.validate(input, memory, functions, tokenizer);
            assert.equal(result.isValid, true);
            assert.deepEqual(result.content, input);
        });

        it("should fail an invalid input", async () => {
            const command = new MathCommand();
            const input = {
                math: '7 + 3'
            };
            const result = await command.validate(input as any, memory, functions, tokenizer);
            assert.equal(result.isValid, false);
            assert.equal(result.feedback, 'The command.input has errors:\n"input": requires property "code"\n\nTry again.');
        });
    });

    describe("execute", () => {
        it("should execute code", async () => {
            const command = new MathCommand();
            const input = {
                code: '7 + 3'
            };
            const result = await command.execute(input, memory, functions, tokenizer);
            assert.equal(result, 10);
        });

        it("should return error for bad code", async () => {
            const command = new MathCommand();
            const input = {
                code: '7 +'
            };
            const result = await command.execute(input, memory, functions, tokenizer);
            assert.deepEqual(result, { type: 'TaskResponse', status: 'error', message: 'SyntaxError: Unexpected end of input' });
        });
    });
});

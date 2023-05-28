import { strict as assert } from "assert";
import { FunctionRegistry, GPT3Tokenizer, VolatileMemory } from "promptrix";
import { ConversationHistoryFork } from "./ConversationHistoryFork";


describe("ConversationHistoryFork", () => {
    const memory = new VolatileMemory({
        "history": [
            { role: "user", content: "Hello" },
            { role: "assistant", content: "Hi! How may I assist you?"}
        ],
        "input": "I'd like to book a flight to London",
        "name": "John Doe"
    });
    const functions = new FunctionRegistry();
    const tokenizer = new GPT3Tokenizer();

    describe("constructor", () => {
        it("should create a ConversationHistoryFork", () => {
            const fork = new ConversationHistoryFork(memory, 'history', 'input');
            assert.notEqual(fork, undefined);
        });
    });

    const fork = new ConversationHistoryFork(memory, 'history', 'input');
    describe("has", () => {
        it("should return true for the forked history", async () => {
            const hasHistory = fork.has('history');
            assert.equal(hasHistory, true);
        });

        it("should return true for the forked input", async () => {
            const hasInput = fork.has('input');
            assert.equal(hasInput, true);
        });

        it("should return true for a pass through memory", async () => {
            const hasName = fork.has('name');
            assert.equal(hasName, true);
        });

        it("should return false for a missing pass through memory", async () => {
            const hasAge = fork.has('age');
            assert.equal(hasAge, false);
        });

        it("should return true for history & input even with empty memory", async () => {
            const emptyMemory = new VolatileMemory();
            const emptyFork = new ConversationHistoryFork(emptyMemory, 'history', 'input');
            const hasHistory = emptyFork.has('history');
            assert.equal(hasHistory, true);
            const hasInput = emptyFork.has('input');
            assert.equal(hasInput, true);
        });
    });


    describe("get", () => {
        it("should get the current history", async () => {
            const history = fork.get('history');
            assert.deepEqual(history, [ { role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi! How may I assist you?' } ]);
        });

        it("should get the current input", async () => {
            const input = fork.get('input');
            assert.equal(input, "I'd like to book a flight to London");
        });

        it("should get a pass through memory", async () => {
            const name = fork.get('name');
            assert.equal(name, "John Doe");
        });

        it("should return undefined for a missing pass through memory", async () => {
            const age = fork.get('age');
            assert.equal(age, undefined);
        });

        it("should return values for history & input even with empty memory", async () => {
            const emptyMemory = new VolatileMemory();
            const emptyFork = new ConversationHistoryFork(emptyMemory, 'history', 'input');
            const history = emptyFork.get('history');
            assert.deepEqual(history, []);
            const input = emptyFork.get('input');
            assert.equal(input, '');
        });
    });

    describe("set", () => {
        it("should change the forked history without modifying original memory", async () => {
            fork.set('history', [ { role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi! How may I assist you?' }, { role: 'user', content: 'I\'d like to book a flight to London' } ]);
            const history = fork.get('history');
            assert.deepEqual(history, [ { role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi! How may I assist you?' }, { role: 'user', content: 'I\'d like to book a flight to London' } ]);
            const originalHistory = memory.get('history');
            assert.deepEqual(originalHistory, [ { role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi! How may I assist you?' } ]);
        });

        it("should change the forked input without modifying the original input", async () => {
            fork.set('input', "I'd like first class please");
            const input = fork.get('input');
            assert.equal(input, "I'd like first class please");
            const originalInput = memory.get('input');
            assert.equal(originalInput, "I'd like to book a flight to London");
        });

        it("should set a pass through memory", async () => {
            fork.set('name', "Jane Doe");
            const name = fork.get('name');
            assert.equal(name, "Jane Doe");
            const originalName = memory.get('name');
            assert.equal(originalName, "Jane Doe");
        });

        it("should add a new pass through memory", async () => {
            fork.set('age', 42);
            const age = fork.get('age');
            assert.equal(age, 42);
            const originalAge = memory.get('age');
            assert.equal(originalAge, 42);
        });

        it("should assign a default value to history when set to undefined", async () => {
            fork.set('history', undefined);
            const history = fork.get('history');
            assert.deepEqual(history, []);
            const originalHistory = memory.get('history');
            assert.deepEqual(originalHistory, [ { role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi! How may I assist you?' } ]);
            fork.set('history', originalHistory);
        });

        it("should assign a default value to input when set to undefined", async () => {
            fork.set('input', undefined);
            const input = fork.get('input');
            assert.equal(input, '');
            const originalInput = memory.get('input');
            assert.equal(originalInput, "I'd like to book a flight to London");
            fork.set('input', originalInput);
        });
    });

    describe("delete", () => {
        it("should delete the forked history without modifying original memory", async () => {
            fork.delete('history');
            const history = fork.get('history');
            assert.deepEqual(history, []);
            const originalHistory = memory.get('history');
            assert.deepEqual(originalHistory, [ { role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi! How may I assist you?' } ]);
            fork.set('history', originalHistory);
        });

        it("should delete the forked input without modifying the original input", async () => {
            fork.delete('input');
            const input = fork.get('input');
            assert.equal(input, "");
            const originalInput = memory.get('input');
            assert.equal(originalInput, "I'd like to book a flight to London");
            fork.set('input', originalInput);
        });

        it("should delete a pass through memory", async () => {
            fork.delete('name');
            const name = fork.get('name');
            assert.equal(name, undefined);
            const originalName = memory.get('name');
            assert.equal(originalName, undefined);
        });
    });

    describe("clear", () => {
        it("should clear both the forked memory and the original memory", async () => {
            fork.clear();
            const history = fork.get('history');
            assert.deepEqual(history, []);
            const input = fork.get('input');
            assert.equal(input, "");
            const originalHistory = memory.get('history');
            assert.equal(originalHistory, undefined);
            const originalInput = memory.get('input');
            assert.equal(originalInput, undefined);
        });
    });
});

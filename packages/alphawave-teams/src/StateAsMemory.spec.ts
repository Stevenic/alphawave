import { strict as assert } from "assert";
import { DefaultTurnState, TurnStateEntry, DefaultTempState } from "@microsoft/teams-ai";
import { Activity } from "botbuilder";
import { StateAsMemory } from "./StateAsMemory";

interface TurnContext {
    activity: Activity;
}

describe("StateAsMemory", () => {
    const context: TurnContext = {
        activity: {
            type: 'message',
            text: 'How are you?',
        } as Activity
    };
    const state: DefaultTurnState = {
        conversation: new TurnStateEntry({
            history: [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi' },
            ],
        }),
        user: new TurnStateEntry({
            name: 'John Doe',
        }),
        temp: new TurnStateEntry({
            input: 'How are you?',
        } as DefaultTempState)
    };

    describe("constructor", () => {
        it("should create a StateAsMemory instance", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.notEqual(memory, undefined);
        });
    });

    describe("has", () => {
        it("should return true for an existing conversation property", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.equal(memory.has('conversation.history'), true);
        });

        it("should return false for a missing conversation property", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.equal(memory.has('conversation.foo'), false);
        });

        it("should return true for an existing user property", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.equal(memory.has('user.name'), true);
        });

        it("should return false for a missing user property", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.equal(memory.has('user.foo'), false);
        });

        it("should return true for an existing temp property", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.equal(memory.has('temp.input'), true);
        });

        it("should return false for a missing temp property", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.equal(memory.has('temp.foo'), false);
        });

        it("should default to temp scope", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.equal(memory.has('input'), true);
        });

        it("should throw an error for nested properties", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.throws(() => memory.has('conversation.history.foo'));
        });

        it("should throw an error for invalid scopes", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.throws(() => memory.has('foo.bar'));
        });
    });

    describe("get", () => {
        it("should return a conversation property", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.equal(memory.get('conversation.history'), (state.conversation.value as any).history);
        });

        it("should return a user property", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.equal(memory.get('user.name'), (state.user.value as any).name);
        });

        it("should return a temp property", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.equal(memory.get('temp.input'), state.temp.value.input);
        });

        it("should return an activity property", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.equal(memory.get('activity.text'), context.activity.text);
        });

        it("should default to temp scope", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.equal(memory.get('input'), state.temp.value.input);
        });

        it("should throw an error for nested properties", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.throws(() => memory.get('conversation.history.foo'));
        });
    });

    describe("set", () => {
        it("should set a conversation property", () => {
            const memory = new StateAsMemory(context as any, state);
            memory.set('conversation.history', []);
            assert.deepEqual(memory.get('conversation.history'), []);
        });

        it("should set a user property", () => {
            const memory = new StateAsMemory(context as any, state);
            memory.set('user.name', 'Jane Doe');
            assert.equal(memory.get('user.name'), 'Jane Doe');
        });

        it("should set a temp property", () => {
            const memory = new StateAsMemory(context as any, state);
            memory.set('temp.input', 'Howdy?');
            assert.equal(memory.get('temp.input'), 'Howdy?');
        });

        it("should default to temp scope", () => {
            const memory = new StateAsMemory(context as any, state);
            memory.set('input', 'Howdy?');
            assert.equal(memory.get('input'), 'Howdy?');
        });

        it("should throw an error for setting activity properties", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.throws(() => memory.set('activity.text', 'bar'));
        });

        it("should throw an error for nested properties", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.throws(() => memory.set('conversation.history.foo', 'bar'));
        });
    });

    describe("delete", () => {
        it("should delete a conversation property", () => {
            const memory = new StateAsMemory(context as any, state);
            memory.delete('conversation.history');
            assert.equal(memory.has('conversation.history'), false);
        });

        it("should delete a user property", () => {
            const memory = new StateAsMemory(context as any, state);
            memory.delete('user.name');
            assert.equal(memory.has('user.name'), false);
        });

        it("should delete a temp property", () => {
            const memory = new StateAsMemory(context as any, state);
            memory.delete('temp.input');
            assert.equal(memory.has('temp.input'), false);
        });

        it("should default to temp scope", () => {
            const memory = new StateAsMemory(context as any, state);
            memory.delete('input');
            assert.equal(memory.has('input'), false);
        });

        it("should throw an error for nested properties", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.throws(() => memory.delete('conversation.history.foo'));
        });
    });

    describe("clear", () => {
        it("should throw error when calling clear()", () => {
            const memory = new StateAsMemory(context as any, state);
            assert.throws(() => memory.clear());
        });
    });
});

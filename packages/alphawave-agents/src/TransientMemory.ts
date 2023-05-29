import { PromptMemory, VolatileMemory } from "promptrix";

/**
 * A PromptMemory implementation that forks the memory of the current history variable.
 * @remarks
 * This creates a temporary in-memory fork of the current conversation history. The current
 * conversation history is cloned into the fork, and any changes made to the fork will not
 * affect the original history.
 */
export class TransientMemory implements PromptMemory {
    private readonly _transient: VolatileMemory = new VolatileMemory();
    private readonly _memory: PromptMemory;
    private readonly _variables: string[];

    public constructor(memory: PromptMemory, variables: string[]) {
        this._memory = memory;
        this._variables = variables;
    }

    public has(key: string): boolean {
        return this._variables.includes(key) ? this._transient.has(key) : this._memory.has(key);
    }

    public get<TValue = any>(key: string): TValue {
        return this._variables.includes(key) ? this._transient.get(key) : this._memory.get(key);
    }

    public set<TValue = any>(key: string, value: TValue): void {
        if (this._variables.includes(key)) {
            this._transient.set(key, value);
        } else {
            this._memory.set(key, value);
        }
    }

    public delete(key: string): void {
        if (this._variables.includes(key)) {
            this._transient.delete(key);
        } else {
            this._memory.delete(key);
        }
    }

    public clear(): void {
        this._transient.clear();
    }
}
import { PromptMemory, VolatileMemory } from "promptrix";

/**
 * A memory fork is a memory that is a copy of another memory, but can be modified without
 * affecting the original memory.
 */
export class MemoryFork implements PromptMemory {
    private readonly _fork: VolatileMemory = new VolatileMemory();
    private readonly _memory: PromptMemory;

    public constructor(memory: PromptMemory) {
        this._memory = memory;
    }

    public has(key: string): boolean {
        return this._fork.has(key) || this._memory.has(key);
    }

    public get<TValue = any>(key: string): TValue {
        if (this._fork.has(key)) {
            return this._fork.get(key);
        } else {
            return this._memory.get(key);
        }
    }

    public set<TValue = any>(key: string, value: TValue): void {
        this._fork.set(key, value);
    }

    public delete(key: string): void {
        if (this._fork.has(key)) {
            this._fork.delete(key);
        }
    }

    public clear(): void {
        this._fork.clear();
    }
}
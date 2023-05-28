import { Message, PromptMemory } from "promptrix";

export class ConversationHistoryMemoryFork implements PromptMemory {
    private readonly _memory: PromptMemory;
    private readonly _historyVariable: string;
    private _history: Array<Message>;

    public constructor(memory: PromptMemory, historyVariable: string) {
        this._memory = memory;
        this._historyVariable = historyVariable;
        this._history = memory.has(historyVariable) ? (memory.get(historyVariable) as Array<Message>).slice() : [];
    }

    public has(key: string): boolean {
        return (key === this._historyVariable || this._memory.has(key));
    }

    public get<TValue = any>(key: string): TValue {
        if (key === this._historyVariable) {
            return this._history as any;
        } else {
            return this._memory.get(key);
        }
    }

    public set<TValue = any>(key: string, value: TValue): void {
        if (key === this._historyVariable) {
            this._history = (value as any) ?? [];
        } else {
            this._memory.set(key, value);
        }
    }

    public delete(key: string): void {
        if (key === this._historyVariable) {
            this._history = [];
        } else {
            this._memory.delete(key);
        }
    }

    public clear(): void {
        this._history = [];
        this._memory.clear();
    }
}
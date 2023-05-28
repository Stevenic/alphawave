import { Message, PromptMemory } from "promptrix";

/**
 * A PromptMemory implementation that forks the memory of the current history variable.
 * @remarks
 * This creates a temporary in-memory fork of the current conversation history. The current
 * conversation history is cloned into the fork, and any changes made to the fork will not
 * affect the original history.
 */
export class ConversationHistoryFork implements PromptMemory {
    private readonly _memory: PromptMemory;
    private readonly _historyVariable: string;
    private readonly _inputVariable: string;
    private _history: Message[];
    private _input: string;

    public constructor(memory: PromptMemory, historyVariable: string, inputVariable: string) {
        this._memory = memory;
        this._historyVariable = historyVariable;
        this._inputVariable = inputVariable;
        this._history = historyVariable && memory.has(historyVariable) ? JSON.parse(JSON.stringify(memory.get(historyVariable))) : [];
        this._input = inputVariable && memory.has(inputVariable) ? (memory.get(inputVariable) as string) : '';
    }

    public has(key: string): boolean {
        return (key === this._historyVariable || key === this._inputVariable || this._memory.has(key));
    }

    public get<TValue = any>(key: string): TValue {
        if (key === this._historyVariable) {
            return JSON.parse(JSON.stringify(this._history));
        } else if (key === this._inputVariable) {
            return this._input as any;
        } else {
            return this._memory.get(key);
        }
    }

    public set<TValue = any>(key: string, value: TValue): void {
        if (key === this._historyVariable) {
            this._history = Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : [];
        } else if (key === this._inputVariable) {
            this._input = (value as any) ?? '';
        } else {
            this._memory.set(key, value);
        }
    }

    public delete(key: string): void {
        if (key === this._historyVariable) {
            this._history = [];
        } else if (key === this._inputVariable) {
            this._input = '';
        } else {
            this._memory.delete(key);
        }
    }

    public clear(): void {
        this._history = [];
        this._input = '';
        this._memory.clear();
    }
}
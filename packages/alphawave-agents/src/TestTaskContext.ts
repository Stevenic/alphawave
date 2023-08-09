import { PromptFunctions, PromptMemory, Tokenizer, FunctionRegistry, VolatileMemory, GPT3Tokenizer } from "promptrix";
import { Agent } from "./Agent";
import { AgentThought, TaskContext, TaskResponseStatus } from "./types";
import { MemoryFork } from "alphawave";

export interface TestTaskContextOptions {
    max_steps?: number;
    max_time?: number;
}

export class TestTaskContext implements TaskContext {
    private _cancelled = false;
    private _step = 0;
    private _start_time = Date.now();
    private _functions = new FunctionRegistry();
    private _memory: PromptMemory;
    private _tokenizer = new GPT3Tokenizer();
    private _lastThought?: AgentThought;

    public constructor(private readonly _options: TestTaskContextOptions = {}, memory?: PromptMemory) {
        this._memory = memory ?? new VolatileMemory();
    }

    public get cancelled(): boolean {
        return this._cancelled;
    }

    public get elapsed_time(): number {
        return Date.now() - this._start_time;
    }

    public get functions(): PromptFunctions {
        return this._functions;
    }

    public get lastThought(): AgentThought|undefined {
        return this._lastThought;
    }

    public get max_steps(): number {
        return this._options?.max_steps ?? 5;
    }

    public get max_time(): number {
        return this._options?.max_time ?? 60000;
    }

    public get memory(): PromptMemory {
        return this._memory;
    }

    public get remaining_steps(): number {
        return this.max_steps - this.step;
    }

    public get remaining_time(): number {
        return this.max_time - this.elapsed_time;
    }

    public get step(): number {
        return this._step;
    }

    public get start_time(): number {
        return this._start_time;
    }

    public get status(): TaskResponseStatus {
        if (this.shouldContinue()) {
            return 'success';
        } else if (this.cancelled) {
            return 'cancelled';
        } else if (this.remaining_time <= 0) {
            return 'too_much_time';
        } else {
            return 'too_many_steps';
        }
    }

    public get tokenizer(): Tokenizer {
        return this._tokenizer;
    }

    public cancel(): void {
        this._cancelled = true;
    }

    public emitNewThought(thought: AgentThought): void;
    public emitNewThought(thought: string, commandName: string, commandInput?: Record<string, any>): void;
    public emitNewThought(thought: AgentThought|string, commandName?: string, commandInput?: Record<string, any>): void {
        if (typeof thought === 'string') {
            thought = {
                thoughts: {
                    thought,
                    reasoning: 'none',
                    plan: 'none'
                },
                command: {
                    name: commandName || '',
                    input: commandInput
                }
            };
        }
        this._lastThought = thought;
    }

    public fork(): TaskContext {
        return new TestTaskContext(this._options, new MemoryFork(this.memory));
    }

    public nextStep(): boolean {
        this._step++;
        return this.shouldContinue();
    }

    public shouldContinue(): boolean {
        return (this._step < this.max_steps && this.remaining_time > 0 && !this._cancelled);
    }
}
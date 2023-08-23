import { PromptFunctions, PromptMemory, Tokenizer } from "promptrix";
import { Agent } from "./Agent";
import { AgentThought, TaskContext, TaskResponseStatus } from "./types";
import { ForkedTaskContext } from "./ForkedTaskContext";

export class AgentTaskContext implements TaskContext {
    private _cancelled = false;
    private _step = 0;
    private _start_time = Date.now();
    private _memory: PromptMemory;

    constructor(public readonly agent: Agent, memory?: PromptMemory) {
        this._memory = memory ?? agent.memory;
    }

    public get cancelled(): boolean {
        return this._cancelled;
    }

    public get elapsed_time(): number {
        return Date.now() - this._start_time;
    }

    public get functions(): PromptFunctions {
        return this.agent.functions;
    }

    public get max_steps(): number {
        return this.agent.options.max_steps;
    }

    public get max_time(): number {
        return this.agent.options.max_time;
    }

    public get memory(): PromptMemory {
        return this._memory;
    }

    public get remaining_steps(): number {
        return Math.max(this.max_steps - this.step, 0);
    }

    public get remaining_time(): number {
        return Math.max(this.max_time - this.elapsed_time, 0);
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
        return this.agent.tokenizer;
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
        this.agent.events.emit('newThought', thought);
    }

    public fork(): TaskContext {
        return new ForkedTaskContext(this);
    }

    public nextStep(): boolean {
        this._step++;
        return this.shouldContinue();
    }

    public shouldContinue(): boolean {
        return (this._step < this.max_steps && this.remaining_time > 0 && !this.cancelled);
    }
}
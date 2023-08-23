import { PromptFunctions, PromptMemory, Tokenizer } from "promptrix";
import { AgentThought, TaskContext, TaskResponseStatus } from "./types";
import { MemoryFork } from "alphawave";

export class ForkedTaskContext implements TaskContext {
    private _memory: PromptMemory;

    public constructor(private readonly _context: TaskContext) {
        this._memory = new MemoryFork(_context.memory);
    }

    public get cancelled(): boolean {
        return this._context.cancelled;
    }

    public get elapsed_time(): number {
        return this._context.elapsed_time;
    }

    public get functions(): PromptFunctions {
        return this._context.functions;
    }

    public get max_steps(): number {
        return this._context.max_steps;
    }

    public get max_time(): number {
        return this._context.max_time;
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
        return this._context.step;
    }

    public get start_time(): number {
        return this._context.start_time;
    }

    public get status(): TaskResponseStatus {
        return this._context.status;
    }

    public get tokenizer(): Tokenizer {
        return this._context.tokenizer;
    }

    public cancel(): void {
        this._context.cancel();
    }

    public emitNewThought(thought: AgentThought): void;
    public emitNewThought(thought: string, commandName: string, commandInput?: Record<string, any>): void;
    public emitNewThought(thought: AgentThought|string, commandName?: string, commandInput?: Record<string, any>): void {
        this._context.emitNewThought(thought as any, commandName as any, commandInput);
    }

    public fork(): TaskContext {
        return new ForkedTaskContext(this);
    }

    public nextStep(): boolean {
        return this._context.nextStep();
    }

    public shouldContinue(): boolean {
        return this._context.shouldContinue();
    }
}
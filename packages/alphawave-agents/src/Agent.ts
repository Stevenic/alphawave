import { FunctionRegistry, GPT3Tokenizer, PromptFunctions, PromptMemory, PromptSection, Tokenizer, VolatileMemory } from "promptrix";
import { AlphaWave, PromptCompletionClient, PromptCompletionOptions } from "alphawave";

export interface AgentOptions  {
    client: PromptCompletionClient;
    prompt: PromptSection;
    prompt_options: PromptCompletionOptions;
    functions?: PromptFunctions;
    history_variable?: string;
    input_variable?: string;
    max_history_messages?: number;
    max_repair_attempts?: number;
    max_steps?: number;
    memory?: PromptMemory;
    step_delay?: number;
    tokenizer?: Tokenizer;
}

export interface ConfiguredAgentOptions {
    client: PromptCompletionClient;
    history_variable: string;
    input_variable: string;
    functions: PromptFunctions;
    max_history_messages: number;
    max_repair_attempts: number;
    max_steps: number;
    memory: PromptMemory;
    prompt: PromptSection;
    prompt_options: PromptCompletionOptions;
    step_delay: number;
    tokenizer: Tokenizer;
}

export class Agent {
    public readonly options: ConfiguredAgentOptions;

    public constructor(options: AgentOptions) {
        this.options = Object.assign({
            functions: new FunctionRegistry(),
            history_variable: 'history',
            input_variable: 'input',
            max_history_messages: 10,
            max_repair_attempts: 3,
            max_steps: 5,
            memory: new VolatileMemory(),
            step_delay: 0,
            tokenizer: new GPT3Tokenizer()
        }, options) as ConfiguredAgentOptions;
    }

    public async completeTask(input?: string): Promise<void> {
    }
}
import { FunctionRegistry, GPT3Tokenizer, PromptFunctions, PromptMemory, PromptSection, Tokenizer, VolatileMemory } from "promptrix";
import { AlphaWave, JSONResponseValidator, PromptCompletionClient, PromptCompletionOptions } from "alphawave";
import { TaskResponse, AgentThoughts } from "./types";
import { Schema } from "jsonschema";

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

    public async completeTask(input?: string): Promise<TaskResponse> {
        //
        // Create a wave and send it
        const wave = new AlphaWave(this.options);
        const response = await wave.completePrompt(input);

        // Process the response
        const message = typeof response.message == "object" ? response.message.content : response.message;
        if (response.status === "success") {
            // Return the response
            return {
                type: "TaskResponse",
                status: response.status,
                message
            }
        } else {
            // Return the error
            return {
                type: "TaskResponse",
                status: response.status,
                message
            };
        }
    }
}

const agentThoughtsSchema: Schema = {
    type: "object",
    properties: {
        thoughts: {
            type: "object",
            properties: {
                thought: {
                    type: "string"
                },
                reasoning: {
                    type: "string"
                },
                plan: {
                    type: "string"
                }
            },
            required: ["thought", "reasoning", "plan"]
        },
        command: {
            type: "object",
            properties: {
                name: {
                    type: "string"
                },
                input: {
                    type: "object"
                }
            },
            required: ["name", "input"]
        }
    },
    required: ["thoughts", "command"]
};

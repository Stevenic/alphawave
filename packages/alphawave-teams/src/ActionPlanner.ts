import {
    Planner,
    TurnState,
    DefaultTurnState,
    ConfiguredAIOptions,
    Plan,
    PromptTemplate,
    PredictedSayCommand,
    PredictedDoCommand,
    AI
} from '@microsoft/teams-ai';
import { TurnContext } from 'botbuilder';
import { AlphaWave, AlphaWaveOptions,PromptCompletionClient, PromptCompletionOptions, PromptResponse, PromptResponseValidator, Response } from "alphawave";
import { Message, TextSection, Tokenizer, Utilities, GPT3Tokenizer } from "promptrix";
import { StateAsMemory } from './StateAsMemory';

export interface ActionPlannerOptions {
    client: PromptCompletionClient;
    prompt_options: PromptCompletionOptions;
    history_variable?: string;
    input_variable?: string;
    max_history_messages?: number;
    max_repair_attempts?: number;
    tokenizer?: Tokenizer;
    validator?: PromptResponseValidator;
    use_system_role?: boolean;
    retry_invalid_responses?: boolean;
}

export class ActionPlanner<TState extends TurnState = DefaultTurnState> implements Planner<TState> {
    private readonly _options: ActionPlannerOptions;

    public static readonly InvalidResponseActionName = '__invalid_response__';
    public static readonly TooLongActionName = '__too_long__';

    public constructor(options: ActionPlannerOptions) {
        this._options = Object.assign({}, options);
    }

    public get client(): PromptCompletionClient {
        return this._options.client;
    }

    public get options(): ActionPlannerOptions {
        return this._options;
    }

    public async completePrompt(context: TurnContext, state: TState, inputPrompt: PromptTemplate, options: ConfiguredAIOptions<TState>): Promise<string | undefined> {
        // Wrap state as memory
        const memory = new StateAsMemory<TState>(context, state);

        // Create prompt and options
        const prompt = new TextSection(inputPrompt.text, this._options.use_system_role ? 'system' : 'user');
        const prompt_options: PromptCompletionOptions  = Object.assign({}, this._options.prompt_options, inputPrompt.config.completion as any);
        if (Array.isArray(inputPrompt.config.default_backends)) {
            prompt_options.model = inputPrompt.config.default_backends[0];
            if (prompt_options.model.startsWith('gpt')) {
                prompt_options.completion_type = 'chat';
            } else {
                prompt_options.completion_type = 'text';
            }
        }

        // Create history options
        let history_variable = 'temp.history';
        let max_history_messages = 10;
        const input_variable = this._options.input_variable ?? 'temp.input';
        if (options.history.trackHistory) {
            history_variable = this._options.history_variable ?? 'conversation.history';
            max_history_messages = options.history.maxTurns * 2;
        }

        // Create AlphaWave instance
        const waveOptions: AlphaWaveOptions = Object.assign({}, this._options, { memory, prompt, prompt_options, history_variable, max_history_messages, input_variable });
        const alphaWave = new AlphaWave(waveOptions);

        // Complete prompt
        let response: PromptResponse;
        let maxAttempts = this._options.retry_invalid_responses ? 2 : 1;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            response = await alphaWave.completePrompt();
            if (response.status != 'invalid_response') {
                break;
            }
        }

        // Process response
        switch (response!.status) {
            case 'success':
                return (response!.message as Message).content;
            case 'error':
                throw new Error(response!.message as string);
            default:
                return undefined;
        }
    }

    public async generatePlan(context: TurnContext, state: TState, inputPrompt: PromptTemplate, options: ConfiguredAIOptions<TState>): Promise<Plan> {
        // Wrap state as memory
        const memory = new StateAsMemory<TState>(context, state);

        // Create prompt and options
        const prompt = new TextSection(inputPrompt.text, this._options.use_system_role ? 'system' : 'user');
        const prompt_options: PromptCompletionOptions  = Object.assign({}, this._options.prompt_options, inputPrompt.config.completion as any);
        if (Array.isArray(inputPrompt.config.default_backends)) {
            prompt_options.model = inputPrompt.config.default_backends[0];
            if (prompt_options.model.startsWith('gpt')) {
                prompt_options.completion_type = 'chat';
            } else {
                prompt_options.completion_type = 'text';
            }
        }

        // Create history options
        let history_variable = 'temp.history';
        let max_history_messages = 10;
        const input_variable = this._options.input_variable ?? 'temp.input';
        if (options.history.trackHistory) {
            history_variable = this._options.history_variable ?? 'conversation.history';
            max_history_messages = options.history.maxTurns * 2;
        }

        // Create AlphaWave instance
        const waveOptions: AlphaWaveOptions = Object.assign({}, this._options, { memory, prompt, prompt_options, history_variable, max_history_messages, input_variable });
        const alphaWave = new AlphaWave(waveOptions);

        // Complete prompt
        let response: PromptResponse;
        let maxAttempts = this._options.retry_invalid_responses ? 2 : 1;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            response = await alphaWave.completePrompt();
            if (response.status != 'invalid_response') {
                break;
            }
        }

        // Process response
        switch (response!.status) {
            case 'success':
                const content = (response!.message as Message).content;
                const plan: Plan|undefined = typeof content == 'object' ? content as Plan : Response.parseJSON<Plan>(content);
                if (plan && plan.type == 'plan') {
                    return plan;
                } else {
                    const text = Utilities.toString(new GPT3Tokenizer(), content);
                    return { type: 'plan', commands: [{ type: 'SAY', response: text } as PredictedSayCommand]};
                }
            case 'invalid_response':
                return { type: 'plan', commands: [{ type: 'DO', action: ActionPlanner.InvalidResponseActionName, entities: { message: response!.message } } as PredictedDoCommand]};
            case 'rate_limited':
                return { type: 'plan', commands: [{ type: 'DO', action: AI.RateLimitedActionName } as PredictedDoCommand]};
            case 'too_long':
                return { type: 'plan', commands: [{ type: 'DO', action: ActionPlanner.TooLongActionName } as PredictedDoCommand]};
            default:
                throw new Error(response!.message as string);
        }
    }
}



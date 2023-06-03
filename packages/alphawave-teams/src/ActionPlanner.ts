import {
    Planner,
    TurnState,
    DefaultTurnState,
    ConfiguredAIOptions,
    Plan,
    PromptTemplate,
    PredictedSayCommand,
    PredictedDoCommand,
    PromptTemplateConfig,
    AI,
    AIHistoryOptions
} from '@microsoft/teams-ai';
import { TurnContext } from 'botbuilder';
import { AlphaWave, AlphaWaveOptions,PromptCompletionClient, PromptCompletionOptions, PromptResponse, PromptResponseValidator, Response } from "alphawave";
import { Message, TextSection, Tokenizer, Utilities, GPT3Tokenizer, UserMessage, PromptSection } from "promptrix";
import { StateAsMemory } from './StateAsMemory';
import { Prompt } from 'promptrix';
import { ConversationHistory } from 'promptrix';

export interface ActionPlannerOptions {
    client: PromptCompletionClient;
    prompt_options: PromptCompletionOptions;
    history_variable?: string;
    input_variable?: string;
    max_history_messages?: number;
    max_repair_attempts?: number;
    tokenizer?: Tokenizer;
    use_system_role?: boolean;
    retry_invalid_responses?: boolean;
    logRepairs?: boolean;
}

export class ActionPlanner<TState extends TurnState = DefaultTurnState> implements Planner<TState> {
    private readonly _options: ActionPlannerOptions;
    private readonly _validators: Map<string, PromptResponseValidator> = new Map<string, PromptResponseValidator>();

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

    public addValidator(name: string, validator: PromptResponseValidator): this {
        if (this._validators.has(name)) {
            throw new Error(`A validator with a name of '${name}' already exists.`);
        }

        this._validators.set(name, validator);
        return this;
    }

    public async completePrompt(context: TurnContext, state: TState, inputPrompt: PromptTemplate, options: ConfiguredAIOptions<TState>): Promise<string | undefined> {
        // Wrap state as memory
        const memory = new StateAsMemory<TState>(context, state);

        // Initialize history options
        const historyOptions = this.getHistoryOptions(inputPrompt.config as ExtendedPromptTemplateConfig);
        const history_variable = historyOptions.trackHistory ? this._options.history_variable ?? 'conversation.history' : 'temp.history';
        const max_history_messages = historyOptions.maxTurns * 2;
        const input_variable = this._options.input_variable ?? 'temp.input';

        // Create prompt options
        const prompt_options: PromptCompletionOptions  = Object.assign({}, this._options.prompt_options, inputPrompt.config.completion as any);
        if (Array.isArray(inputPrompt.config.default_backends)) {
            prompt_options.model = inputPrompt.config.default_backends[0];
            if (prompt_options.model.startsWith('gpt')) {
                prompt_options.completion_type = 'chat';
            } else {
                prompt_options.completion_type = 'text';
            }
        }

        // Create list of prompt sections
        const sections: PromptSection[] = [
            new TextSection(inputPrompt.text, this._options.use_system_role ? 'system' : 'user'),
            new ConversationHistory(history_variable, historyOptions.maxTokens, false, historyOptions.userPrefix, historyOptions.assistantPrefix, historyOptions.lineSeparator)
        ];
        if (historyOptions.trackHistory && prompt_options.completion_type == 'chat' && memory.has(input_variable) && memory.get(input_variable)) {
            sections.push(new UserMessage(`{{$${input_variable}}}`));
        }

        // Create prompt
        const prompt = new Prompt(sections);

        // Get validator
        const waveOptions: AlphaWaveOptions = Object.assign({}, this._options, { memory, prompt, prompt_options, history_variable, max_history_messages, input_variable });
        const validator = this.getValidator(inputPrompt.config as ExtendedPromptTemplateConfig);
        if (validator) {
            waveOptions.validator = validator;
        }

        // Create AlphaWave instance
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
                // Convert response to string
                const content = (response!.message as Message).content;
                if (typeof content == 'object' && content != null) {
                    return JSON.stringify(content);
                } else {
                    return content.toString();
                }
            case 'error':
                throw new Error(response!.message as string);
            default:
                return undefined;
        }
    }

    public async generatePlan(context: TurnContext, state: TState, inputPrompt: PromptTemplate, options: ConfiguredAIOptions<TState>): Promise<Plan> {
        // Wrap state as memory
        const memory = new StateAsMemory<TState>(context, state);

        // Initialize history options
        const historyOptions = this.getHistoryOptions(inputPrompt.config as ExtendedPromptTemplateConfig);
        const history_variable = historyOptions.trackHistory ? this._options.history_variable ?? 'conversation.history' : 'temp.history';
        const max_history_messages = historyOptions.maxTurns * 2;
        const input_variable = this._options.input_variable ?? 'temp.input';

        // Create prompt options
        const prompt_options: PromptCompletionOptions  = Object.assign({}, this._options.prompt_options, inputPrompt.config.completion as any);
        if (Array.isArray(inputPrompt.config.default_backends)) {
            prompt_options.model = inputPrompt.config.default_backends[0];
            if (prompt_options.model.startsWith('gpt')) {
                prompt_options.completion_type = 'chat';
            } else {
                prompt_options.completion_type = 'text';
            }
        }

        // Create list of prompt sections
        const sections: PromptSection[] = [
            new TextSection(inputPrompt.text, this._options.use_system_role ? 'system' : 'user'),
            new ConversationHistory(history_variable, historyOptions.maxTokens, false, historyOptions.userPrefix, historyOptions.assistantPrefix, historyOptions.lineSeparator)
        ];
        if (historyOptions.trackHistory && prompt_options.completion_type == 'chat' && memory.has(input_variable) && memory.get(input_variable)) {
            sections.push(new UserMessage(`{{$${input_variable}}}`));
        }

        // Create prompt
        const prompt = new Prompt(sections);

        // Get validator
        const waveOptions: AlphaWaveOptions = Object.assign({}, this._options, { memory, prompt, prompt_options, history_variable, max_history_messages, input_variable });
        const validator = this.getValidator(inputPrompt.config as ExtendedPromptTemplateConfig);
        if (validator) {
            waveOptions.validator = validator;
        }

        // Create AlphaWave instance
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

    private getHistoryOptions(config: ExtendedPromptTemplateConfig): AIHistoryOptions {
        return Object.assign({
            trackHistory: false,
            maxTurns: 5,
            maxTokens: 1000,
            lineSeparator: '\n',
            userPrefix: 'user: ',
            assistantPrefix: 'assistant: ',
            assistantHistoryType: 'text'
        }, config.history);
    }

    private getValidator(config: ExtendedPromptTemplateConfig): PromptResponseValidator|undefined {
        if (config.validator) {
            const validator = this._validators.get(config.validator);
            if (!validator) {
                throw new Error(`A validator named '${config.validator}' couldn't be found.`);
            }
            return validator;
        }

        return undefined;;
    }
}

interface ExtendedPromptTemplateConfig extends PromptTemplateConfig {
    validator?: string;
    history?:  AIHistoryOptions;
}

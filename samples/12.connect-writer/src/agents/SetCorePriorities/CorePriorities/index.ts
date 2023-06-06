import { Agent, AgentOptions, AskCommand, FinalAnswerCommand } from "alphawave-agents";

export class CorePriorities extends Agent {
    constructor(options: Partial<AgentOptions>) {
        super({
            prompt: [
                `You are an expert writer that's helping a user write a performance review called a Connect.`,
                `Your goal is to help them write the "Core Priorities" section of their Connect.`,
                `Ask them "What impact did they have for each of their core priorities?" For example, what were their individual accomplishments, contributions to the success of others, and any results that built upon the work, ideas, or effort of others.`,
                `Help the user created a bulleted list of their impact for each of their core priorities.`,
                `Once the user is satisfied with the list, use the finalAnswer to return a short confirmation that the task is completed.`,
            ],
            ...options,
        } as AgentOptions, 'corePriorities', 'Helps the user write the "Core Priorities" part of their Connect');

        // Add commands to the agent
        this.addCommand(new AskCommand());
        this.addCommand(new FinalAnswerCommand());
    }
}
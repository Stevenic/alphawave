import { Agent, AgentOptions, AskCommand, CompleteTaskCommand, ConfirmAnswerCommand } from "alphawave-agents";
import { SayCommand } from "../../../commands";

export class CorePriorities extends Agent {
    constructor(options: Partial<AgentOptions>) {
        super({
            prompt: [
                `You are an expert writer that's helping a user write a performance review called a Connect.`,
                `Your goal is to help them write the "Core Priorities" section of their Connect.`,
                `Ask them to list what priorities they had for this review period.`,
                `And then ask them what impact did they have for each of their core priorities? For example, what were their individual accomplishments, contributions to the success of others, and any results that built upon the work, ideas, or effort of others.`,
                `Help the user created a bulleted list of their impact for each of their core priorities.`,
                `Ask the user if they'd like to make any changes before completing the task.`
            ],
            ...options,
        } as AgentOptions, 'corePriorities', 'Helps the user write the "Core Priorities" part of their Connect');

        // Add commands to the agent
        this.addCommand(new AskCommand());
        this.addCommand(new SayCommand());
        this.addCommand(new ConfirmAnswerCommand());
        this.addCommand(new CompleteTaskCommand());
    }
}
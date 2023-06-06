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
            initial_thought: {
                "thoughts": {
                    "thought":"I need to gather the user's core priorities and their impact on each one. This will help me create a comprehensive and specific Core Priorities section for their Connect.",
                    "reasoning":"By asking the user to list their priorities and their impact, I can ensure that their accomplishments and contributions are highlighted in the review. This will also help the user see their progress and growth over the review period.",
                    "plan":"- Ask the user to list their core priorities\n- Ask the user to describe their impact for each priority\n- Create a bulleted list for each priority with their impact"
                },
                "command": {
                    "name":"ask","input":{"question":"What were your core priorities for this review period?"}
                }
            },
            ...options,
        } as AgentOptions, 'corePriorities', 'Helps the user write the "Core Priorities" part of their Connect');

        // Add commands to the agent
        this.addCommand(new AskCommand());
        this.addCommand(new SayCommand());
        this.addCommand(new ConfirmAnswerCommand());
        this.addCommand(new CompleteTaskCommand('task completed'));
    }
}
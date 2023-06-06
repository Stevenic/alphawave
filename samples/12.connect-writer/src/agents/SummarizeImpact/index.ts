import { Agent, AgentOptions, CompleteTaskCommand } from "alphawave-agents";
import { SayCommand } from "../../commands";
import { CorePriorities } from "./CorePriorities";
import { DiversityInclusion } from "./DiversityInclusion";

export class SummarizeImpact extends Agent {
    constructor(options: Partial<AgentOptions>) {
        super({
            prompt: [
                `You are an expert writer that's helping a user write a performance review called a Connect.`,
                `First use the say command to tell the user you're going to help them summarize their impact.`,
                `Then use the corePriorities command to help the user write their "Core Priorities" section.`,
                `Then use the diversityInclusion command to help the user write their "Diversity & Inclusion" section.`,
                `Then use the finalAnswer to return a short confirmation that the task is completed.`,
            ],
            ...options,
        } as AgentOptions, 'summarizeImpact', 'Summarizes the users past performance and overall impact');

        // Add commands to the agent
        this.addCommand(new SayCommand());
        this.addCommand(new CorePriorities(options));
        this.addCommand(new DiversityInclusion(options));
        this.addCommand(new CompleteTaskCommand());
    }
}
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
                `Then use the completeTask command to complete this portion of the task.`,
            ],
            initial_thought: {
                "thoughts": {
                    "thought":"I think we should start by summarizing the user's impact before diving into the specific sections of the Connect.",
                    "reasoning":"This will help provide context for the rest of the review and give the user a chance to reflect on their overall performance.",
                    "plan":"- Ask the user to provide a brief summary of their impact over the past year.\n- Use their response to craft an opening statement for the Connect."
                },
                "command": {
                    "name":"say",
                    "input": { "message":"Let's start by summarizing your impact over the past year." }
                }
            },
            ...options,
        } as AgentOptions, 'summarizeImpact', 'Summarizes the users past performance and overall impact');

        // Add commands to the agent
        this.addCommand(new SayCommand());
        this.addCommand(new CorePriorities(options));
        this.addCommand(new DiversityInclusion(options));
        this.addCommand(new CompleteTaskCommand());
    }
}
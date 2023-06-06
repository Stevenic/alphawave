import { Agent, AgentOptions, AskCommand, FinalAnswerCommand } from "alphawave-agents";

export class DiversityInclusion extends Agent {
    constructor(options: Partial<AgentOptions>) {
        super({
            prompt: [
                `You are an expert writer that's helping a user write a performance review called a Connect.`,
                `Your goal is to help them write the "Diversity & Inclusion (D&I) Core Priority" section of their Connect.`,
                `Ask them "What impact did your actions have in contributing to a more diverse and inclusive Microsoft?" For example, they should share the outcomes they had to advance a more diverse and inclusive culture, including their individual accomplishments, contributions to the success of others and any results that built upon the work, ideas or effort of others.`,
                `Help the user write this section and suggest they check out https://aka.ms/dicorepriority for more guidance and examples of impact.`,
                `Once the user is satisfied with the list, use the finalAnswer to return a short confirmation that the task is completed.`,
            ],
            ...options,
        } as AgentOptions, 'diversityInclusion', 'Helps the user write the Diversity & Inclusion" part of their Connect');

        // Add commands to the agent
        this.addCommand(new AskCommand());
        this.addCommand(new FinalAnswerCommand());
    }
}
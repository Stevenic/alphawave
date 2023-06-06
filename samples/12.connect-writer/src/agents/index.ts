import { Agent, AgentOptions, FinalAnswerCommand } from "alphawave-agents";
import { SayCommand } from "../commands";
import { SummarizeImpact } from "./SummarizeImpact";

export class ConnectAgent extends Agent {
    constructor(options: Partial<AgentOptions>) {
        super({
            prompt: [
                `You are an expert writer that's helping a user write a performance review called a Connect.`,
                `First use the summarizeImpact command to have the user reflect over their past performance.`,
                `Then use the finalAnswer to thank the user and ask them if the need any further writing assistance.`,
            ],
            ...options,
        } as AgentOptions, 'writeConnect', 'Helps the user write their performance review called a Connect');

        // Add commands to the agent
        this.addCommand(new SayCommand());
        this.addCommand(new SummarizeImpact(options));
        this.addCommand(new FinalAnswerCommand());
    }
}
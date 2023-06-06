import { Agent, AgentOptions, AskCommand, FinalAnswerCommand } from "alphawave-agents";
import { SayCommand } from "../../commands";

export class ReflectOnChallenges extends Agent {
    constructor(options: Partial<AgentOptions>) {
        super({
            prompt: [
                `You are an expert writer that's helping a user write a performance review called a Connect.`,
                `Your goal is to help them write the "Reflect on a challenge or setback" section of their Connect.`,
                `First use the say command to tell the user "Growth mindset is about learning from our mistakes and setbacks to enable our future growth. It's important that we learn and adapt quickly. Then, we can apply what we’ve learned so we can continually grow and deliver greater impact for our teams, customers, and business."`,
                `Remind the user  to "Use "I" statements instead of "we" to show your own individual accountability and focus less on the situation and more on what you learned, what you could have done differently and how it may help you grow."`,
                `Ask them to "Consider when they could have done something differently. How will they apply what they've learned to make an even greater impact?" They should briefly share, knowing it might take courage; practice a growth mindset to learn, grow, and enable future success.`,
                `Help the user write this section.`,
                `Once the user is satisfied with the list, use the finalAnswer to return a short confirmation that the task is completed.`,
            ],
            ...options,
        } as AgentOptions, 'reflectOnChallenges', 'Helps the user write the "Reflect on a challenge or setback" part of their Connect');

        // Add commands to the agent
        this.addCommand(new SayCommand());
        this.addCommand(new AskCommand());
        this.addCommand(new FinalAnswerCommand());
    }
}
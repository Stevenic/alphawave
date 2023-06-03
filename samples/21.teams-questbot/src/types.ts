import { Schema } from "jsonschema";

export interface IAction {
    title: string;
    examples: string[];
}

export interface IItemList {
    [item: string]: number;
}

export interface IMap {
    locations: { [id: string]: IMapLocation };
    aliases: { [name: string]: string };
}

export interface IMapLocation {
    id: string;
    name: string;
    description: string;
    details: string;
    prompt: string;
    mapPaths: string;
    encounterChance: number;
    north?: string;
    west?: string;
    south?: string;
    east?: string;
    up?: string;
    down?: string;
}


export interface IMessage {
    role: 'assistant' | 'user';
    content: string;
}


export interface IDataEntities {
    operation: string;
    description: string;
    items: string;
    title: string;
    name: string;
    backstory: string;
    equipped: string;
    until: string;
    days: string;
}

export interface IQuest {
    title: string;
    description: string;
}

export interface ILocation {
    title: string;
    description: string;
    encounterChance: number;
}

export interface IPlayer {
    name: string;
    backstory: string;
    equipped: string;
    inventory: IItemList;
}

export interface ICampaign {
    title: string;
    playerIntro: string;
    objectives: ICampaignObjective[];
}

export interface ICampaignObjective {
    title: string;
    description: string;
    completed: boolean;
}

export const AdaptiveCardSchema: Schema = {
    type: "object",
    properties: {
        type: {
            type: "string",
            enum: ["AdaptiveCard"]
        },
        version: {
            type: "string",
            enum: ["1.4"]
        },
        body: {
            type: "array",
            items: { type: "object" }
        }
    },
    required: ["type", "version", "body"]
};

export const ICampaignSchema: Schema = {
    type: "object",
    properties: {
        title: { type: "string" },
        playerIntro: { type: "string" },
        objectives: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    completed: { type: "boolean" }
                },
                required: ["title", "description", "completed"]
            },
            minItems: 1
        }
    },
    required: ["title", "playerIntro", "objectives"]
};

export const IPlayerSchema: Schema = {
    type: "object",
    properties: {
        name: { type: "string" },
        backstory: { type: "string" },
        equipped: { type: "string" },
        inventory: {
            type: "object",
            additionalProperties: { type: "number" }
        }
    },
    required: ["name", "backstory", "equipped", "inventory"]
};
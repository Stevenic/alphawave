import { TurnState } from "@microsoft/teams-ai";
import { TurnContext } from "botbuilder";
import { PromptMemory } from "promptrix";

export class StateAsMemory<TState extends TurnState> implements PromptMemory {
    public constructor(private readonly context: TurnContext, private readonly state: TState) { }

    public has(key: string): boolean {
        const parts = key.split('.');
        if (parts.length == 1) {
            parts.unshift('temp');
        } else if (parts.length > 2) {
            throw new Error(`Unable to check if memory has {{$${key}}} as nested properties aren't supported.`);
        }

        const scope = this.getScope(parts[0]);
        const value = scope[parts[1]];
        return value != undefined && value != null;
    }


    public get<TValue = any>(key: string): TValue {
        const parts = key.split('.');
        if (parts.length == 1) {
            parts.unshift('temp');
        } else if (parts.length > 2) {
            throw new Error(`Unable to get {{$${key}}} from memory as nested properties aren't supported.`)
        }

        const scope = this.getScope(parts[0]);
        return scope[parts[1]];
    }

    public set<TValue = any>(key: string, value: TValue): void {
        const parts = key.split('.');
        if (parts.length == 1) {
            parts.unshift('temp');
        } else if (parts.length > 2) {
            throw new Error(`Unable to set a memory value for {{$${key}}} as nested properties aren't supported.`)
        }

        // Check for activity scope
        if (parts[0] == 'activity') {
            throw new Error(`The 'activity' memory scope is read only.`);
        }

        const scope = this.getScope(parts[0]);
        scope[parts[1]] = value;
    }

    public delete(key: string): void {
        const parts = key.split('.');
        if (parts.length == 1) {
            parts.unshift('temp');
        } else if (parts.length > 2) {
            throw new Error(`Unable to delete a memory value for {{$${key}}} as nested properties aren't supported.`)
        }

        const scope = this.getScope(parts[0]);
        if (scope.hasOwnProperty(parts[1])) {
            delete scope[parts[1]];
        }
    }

    public clear(): void {
        throw new Error(`The 'PromptMemory.clear()' method is not supported.`);
    }

    private getScope(scope: string): Record<string,any> {
        switch (scope) {
            case 'user':
                return this.state.user.value;
            case 'conversation':
                return this.state.conversation.value;
            case 'temp':
                return this.state.temp.value;
            case 'activity':
                return this.context.activity;
            default:
                throw new Error(`Invalid memory scope of '${scope}' being referenced.`);
        }
    }
}
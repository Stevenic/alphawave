# AlphaWave
AlphaWave is a very opinionated client for interfacing with Large Language Models (LLM). It uses [Promptrix](https://github.com/Stevenic/promptrix) for prompt management and has the following features:

- Supports calling OpenAI and Azure OpenAI hosted models out of the box but a simple plugin model lets you extend AlphaWave to support any LLM.
- Promptrix integration means that all prompts are universal and work with either Chat Completion or Text Completion API's.
- Automatic history management. AlphaWave manages a prompts conversation history and all you have todo is tell it where to store it. It uses an in-memory store by default but a simple plugin interface (provided by Promptrix) lets you store short term memory, like conversation history, anywhere.
- State-of-the-art response repair logic. AlphaWave lets you provide an optional "response validator" plugin which it will use to validate every response returned from an LLM. Should a response fail validation, AlphaWave will automatically try to get the model to correct its mistake. More below...

## Automatic Response Repair
A key goal of AlphaWave is to be the most reliable mechanisms for talking to an LLM on the planet. If you lookup the wikipedia definition for Alpha Waves you see that it's believed that they may be used to help predict mistakes in the human brain. One of the key roles of the AlphaWave library is to help automatically correct for mistakes made by an LLM, leading to more reliable output. It can correct for everything from hallucinations to just malformed output. It does this by using a series of techniques.

First it uses validation to programmatically verify the LLM's output. This would be the equivalent of a "guard" in other libraries like LangChain. When a validation fails, AlphaWave immediately forks the conversation to isolate the mistake. This is critical because the last thing you want to do is promote a mistake/hallucination to the conversation history as the LLM will just double down on the mistake. They are primarily pattern matchers.

Once AlphaWave has isolated the mistake, it will attempt to get the model to repair the mistake itself. It uses a process called "feedback" which simply tells the model the mistake it made and asks it to correct it. For GPT-4 this works more often then not in 1 turn. For the other models it sometimes works but it depends on the type of mistake. AlphaWave will even ask the model to slow down and think step-by-step on the last try, to give it every shot at fixing itself.

If the LLM can correct its mistake, AlphaWave will delete the conversation fork, write the corrected response to the conversation history, and move forward as if nothing ever happened. For GPT-4, you should be able to make several hundred sequential model calls before running into a sequence that can't be repaired.

In the event that the model isn't able to repair itself, a result with a status of `invalid_response` will be returned and the app can either abort the task or give it one more go. For well defined prompts and tasks I'd recommend given it one more go. The reason for that is that, if you've made it hundreds of model calls without it making a mistake, the odds of it making a mistake if you simply try again are low. You just hit the stochastic nature of talking to LLMs.

So why even use "feedback" at all if retrying can work? It doesn't always work. Some mistakes, especially hallucinations, the LLM will make over and over again. They need to be confronted with their mistake and then they will happily correct it. You need both appproaches, feedback & retry, to build a system that's as reliable as possible.

## Installation
To get started, you'll want to install the latest versions of both AlphaWave and Promptrix. If you're using yarn:

```bash
yarn add alphawave
yarn add promptrix
```

or if you're using npm:

```bash
npm install alphawave
npm install promptrix
```

## Basic Usage
You'll need to import a couple of components from "alphawave", along with the various prompt parts you want to use from "promptrix". Here's a super simple wave that creates a basic ChatGPT like bot:

```typescript
import { OpenAIClient, AlphaWave } from "alphawave";
import { Prompt, SystemMessage, ConversationHistory, UserMessage, Message } from "promptrix";

// Create an OpenAI or AzureOpenAI client
const client = new OpenAIClient({
    apiKey: process.env.OpenAIKey!
});

// Create a wave
const wave = new AlphaWave({
    client,
    prompt: new Prompt([
        new SystemMessage('You are an AI assistant that is friendly, kind, and helpful', 50),
        new ConversationHistory('history', 1.0),
        new UserMessage('{{$input}}', 450)
    ]),
    prompt_options: {
        completion_type: 'chat',
        model: 'gpt-3.5-turbo',
        temperature: 0.9,
        max_input_tokens: 2000,
        max_tokens: 1000,
    }
});

```

One of the key features of Promptrix is its ability to proportionally layout prompts, so this prompt has an overall budget of 2000 input tokens. It will give the `SystemMessage` up to 50 tokens, the `UserMessage` up to 450 tokens, and then the `ConversationHistory` gets 100% of the remaining tokens.

Next we just need to call `completePrompt()` on the wave to process the users input:

```typescript
// Route users message to wave
const result = await wave.completePrompt(input);
switch (result.status) {
    case 'success':
        console.log((result.response as Message).content);
        break;
    default:
        if (result.response) {
            console.log(`${result.status}: ${result.response}`);
        } else {
            console.log(`A result status of '${result.status}' was returned.`);
        }
        break;
}
```

The `input` parameter is optional and the wave can also take input directly from memory, but you don't have to pass prompts input. You can see in the example that if the prompt doesn't reference the input via a `{{$input}}` template variable it won't use it anyway.

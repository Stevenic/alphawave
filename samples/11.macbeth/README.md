# Macbeth Sample
Macbeth is an agent that's capable of performing any scene from the play Macbeth. The agent plays the role of the narrator and use 15 `PromptCommands` to play the roles of the characters. The narrator sets the scene and is responsible for deciding who speaks next. The narrator can pass in a little scene direction to each character but it's not allowed to feed them lines. The characters all see a shared dialog history and are responsible for predicting their next line of dialog.

This example shows how to create custom commands and leverage other prompts. It uses `gpt-3.5-turbo` by default but I can tell you that it will work way better with `gpt-4`. To run this sample first copy the file `.env.example` to `.env`. Edit the copied file and set the `OpenAIKey` variable to the value of your personal API key for OpenAI. You can create a new key here:

https://platform.openai.com/account/api-keys

Once you've updated your `.env` file with your API key you can run the following from a terminal window:

```bash
yarn install
yarn start
```

or if you're using npm:

```Bash
npm install
npm run start
```

This is just a simple ChatGPT style bot that remembers the last 5 turns (or 10 lines) of conversation history. A "turn" is a single message + response pair.

## Trouble Shooting
if you get a 401 error your `.env` file isn't set correctly or the key you used isn't valid. If you get rate limited just try again in a few seconds. I haven't added exponential back off logic to the client yet but that's coming so this will get better. If you run into other issues please let me know.
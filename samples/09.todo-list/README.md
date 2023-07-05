# TODO List Function Calling Sample
This is a simple chat experience that has the model interact with a user to create a todo list. It's a great example of how to use the `gpt-3.5-turbo` model and the function calling feature. To run this sample first copy the file `.env.example` to `.env`. Edit the copied file and set the `OpenAIKey` variable to the value of your personal API key for OpenAI. You can create a new key here:

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

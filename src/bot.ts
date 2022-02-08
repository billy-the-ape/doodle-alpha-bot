import { Client, Intents } from 'discord.js';
import dotenv from 'dotenv-flow';
import interactionCreate from './listeners/interactionCreate';
import ready from './listeners/ready';

dotenv.config();

const token = process.env.BOT_TOKEN;

console.log(`doodle-alpha-bot is starting...`);

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
});

interactionCreate(client);
ready(client);

client.login(token);

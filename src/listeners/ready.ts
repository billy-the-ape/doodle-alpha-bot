import { Client } from 'discord.js';
import commands from '../commands';
import { setupActiveWhitelists } from '../util/setup';

export default (client: Client): void => {
  client.on('ready', async () => {
    if (!client.user || !client.application) {
      return;
    }

    const guildId = process.env.GUILD_ID;
    const guild = client.guilds.cache.get(guildId ?? '');

    if (guild) {
      console.log('doodle-alpha-bot: registering guild commands');
      await guild.commands.set(commands);
    } else {
      console.log('doodle-alpha-bot: registering global commands');
      await client.application.commands.set(commands);
    }

    await setupActiveWhitelists(client);

    console.log(`doodle-alpha-bot: ${client.user.username} is online`);
  });
};

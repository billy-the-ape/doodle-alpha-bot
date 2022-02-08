import { Client } from 'discord.js';
import commands from '../commands';
import { setStatusOngoing } from '../util';

export default (client: Client): void => {
  client.on('ready', async () => {
    if (!client.user || !client.application) {
      return;
    }

    const guildId = process.env.GUILD_ID;
    const guild = client.guilds.cache.get(guildId ?? '');

    if (guild) {
      console.log('doodle-alpha-bot registering guild commands');
      await guild.commands.set(commands);
    } else {
      console.log('doodle-alpha-bot registering global commands');
      await client.application.commands.set(commands);
    }

    setStatusOngoing(client);

    console.log(`${client.user.username} is online`);
  });
};

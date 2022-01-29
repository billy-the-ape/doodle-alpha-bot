import { Constants, BaseCommandInteraction, Client, MessageEmbed, TextBasedChannel, User } from "discord.js";
import { Command } from "../types";
import { notifyWinners } from "./util";

export const Fcfs: Command = {
  name: "wl-fcfs",
  description: "First come first serve whitelist drop (50 max)",
  type: "CHAT_INPUT",
  options: [
    {
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      name: 'wl-count',
      description: 'Number of entries available for the whitelist. Max 50.',
      required: true,
      maxValue: 50,
    },
    {
      type: Constants.ApplicationCommandOptionTypes.STRING,
      name: 'project',
      description: 'Name of the project providing the whitelist.',
      required: true,
    },
    {
      type: Constants.ApplicationCommandOptionTypes.STRING,
      name: 'discord-link',
      description: 'Link to project discord (optional)',
      required: false,
    },
    
  ],
  run: async (client: Client, interaction: BaseCommandInteraction) => {
    try {
      const channel = await client.channels.fetch(interaction.channelId) as TextBasedChannel;

      if (!channel || !channel.isText) {
        interaction.editReply('An error occurred :(');
        return;
      }

      const [
        { value: userCountRaw },
        { value: projectNameRaw },
        { value: discordUrlRaw } = { value: '' },
      ] = interaction.options.data;

      const userCount = Number(userCountRaw);
      const projectName = String(projectNameRaw);
      const discordUrl = String(discordUrlRaw);

      const embed = new MessageEmbed({
        title: `${projectName} Whitelist Opportunity! ${userCount} people FCFS`,
        author: { name: interaction.user.username },
        footer: { text: 'Good luck!' },
      }).setTimestamp();

      interaction.editReply(`Collecting entries for ${projectName} WL (FCFS)`);

      const message = await channel.send({ embeds: [embed] });
      const emoji = '🎉';
      const winners: User[] = [];

      await message.react(emoji);

      const collector = message.createReactionCollector({
        filter: (reaction) => reaction.emoji.name === emoji,
        max: 1 + userCount,
      });

      collector.on('collect', (_, user) => {
        if (user.id !== message.author.id && winners.length < userCount) {
          winners.push(user);

          if (winners.length === userCount) {
            notifyWinners({
              discordUrl,
              winners,
              interaction,
              projectName,
              channel,
            });
          }
        }
      });
    } catch {
      interaction.editReply(`An error occurred :(`);
    }
  }
};
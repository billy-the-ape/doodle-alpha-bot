import {
  Constants,
  BaseCommandInteraction,
  Client,
  MessageEmbed,
  TextBasedChannel,
  User,
} from "discord.js";
import { Command } from "../types";
import { notifyWinners, selectWinners } from "./util";

export const Raffle: Command = {
  name: "wl-raffle",
  description: "Raffle reaction whitelist drop (50 max)",
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
      type: Constants.ApplicationCommandOptionTypes.NUMBER,
      name: 'duration-hrs',
      description: 'Duration (in hours) for raffle. Default 1.',
      required: false,
    },
    {
      type: Constants.ApplicationCommandOptionTypes.STRING,
      name: 'discord-link',
      description: 'Link to project discord (optional)',
      required: false,
    },
    {
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      name: 'max-entries',
      description: 'Max number of entries for the raffle. Enter zero for infinite.',
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
        { value: durationRaw } = { value: 1 },
        { value: discordUrlRaw } = { value: '' },
        { value: maxEntriesRaw } = { value: 0 },
      ] = interaction.options.data;

      const winnerCount = Number(userCountRaw);
      const projectName = String(projectNameRaw);
      const discordUrl = String(discordUrlRaw);
      const durationHrs = Number(durationRaw);
      const maxEntries = Number(maxEntriesRaw);

      const embed = new MessageEmbed({
        title: `${projectName} Whitelist Opportunity! ${winnerCount} Raffle!`,
        author: { name: interaction.user.username },
        description: ``,
        footer: { text: 'Good luck!' },
      }).setTimestamp();

      interaction.editReply(`Collecting entries for ${projectName} WL (Raffle)`);

      const message = await channel.send({ embeds: [embed] });
      const emoji = '🎉';
      const entries: User[] = [];
      let complete = false;

      await message.react(emoji);

      const collector = message.createReactionCollector({
        filter: (reaction) => reaction.emoji.name === emoji,
        time: durationHrs * 60 * 60 * 60,
        max: maxEntries ? 1 + maxEntries : undefined,
      });

      collector.on('collect', (_, user) => {
        if (user.id !== message.author.id && entries.length < maxEntries) {
          entries.push(user);

          if (entries.length === maxEntries) {
            const winners = selectWinners({ winnerCount, entries });
            notifyWinners({
              discordUrl,
              winners,
              interaction,
              projectName,
              channel,
            });
            complete = true;
          }
        }
      });

      collector.on('end', () => {
        if (!complete) {
          const winners = selectWinners({ winnerCount, entries });
          notifyWinners({
            discordUrl,
            winners,
            interaction,
            projectName,
            channel,
          });
        }
      });
    } catch {
      interaction.editReply(`An error occurred :(`);
    }
  }
};
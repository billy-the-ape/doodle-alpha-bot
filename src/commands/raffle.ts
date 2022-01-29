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
      description: 'Duration (in hours) for raffle. Optional, default 1 hr.',
      required: false,
    },
    {
      type: Constants.ApplicationCommandOptionTypes.STRING,
      name: 'discord-link',
      description: 'Link to project discord, optional.',
      required: false,
    },
    {
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      name: 'max-entries',
      description: 'Max number of entries for the raffle, optional.',
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

      const { value: userCountRaw } = interaction.options.get('wl-count', true);
      const { value: projectNameRaw } = interaction.options.get('project', true);
      const { value: discordUrlRaw } = interaction.options.get('discord-link') ?? { value: '' };
      const { value: durationRaw } = interaction.options.get('duration-hrs') ?? { value: 1 };
      const { value: maxEntriesRaw } = interaction.options.get('max-entries') ?? { value: 0 };

      const winnerCount = Number(userCountRaw);
      const projectName = String(projectNameRaw);
      const discordUrl = String(discordUrlRaw);
      const durationHrs = Number(durationRaw);
      const maxEntries = Number(maxEntriesRaw);

      const hrString = durationHrs === 1 ? 'hour' : 'hours';
      const timeMessage = `- Ends in ${durationHrs} ${hrString}.`
      const maxEntriesMessage = maxEntries > 0 ? `\n- Maximum ${maxEntries} entries.` : '';
      const durationMs = durationHrs * 60 * 60 * 1000;
      const endTime = new Date();
      endTime.setTime(endTime.getTime() + durationMs);

      const embed = new MessageEmbed({
        title: `**${projectName}** whitelist opportunity: ${winnerCount} spots, raffle`,
        author: { name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() },
        description: timeMessage + maxEntriesMessage,
        footer: { text: 'Good luck! Ends' },
      }).setTimestamp(endTime);

      interaction.editReply(`Collecting entries for ${projectName} WL Raffle`);

      const message = await channel.send({ embeds: [embed] });
      const emoji = '🎉';
      const entries: User[] = [];
      let complete = false;

      await message.react(emoji);

      const collector = message.createReactionCollector({
        filter: (reaction) => reaction.emoji.name === emoji,
        time: durationMs,
        max: maxEntries ? 1 + maxEntries : undefined,
      });

      collector.on('collect', (_, user) => {
        if (
          user.id !== message.author.id &&
          (maxEntries < 1 || entries.length < maxEntries) &&
          !entries.find(({ id }) => id === user.id)
        ) {
          entries.push(user);

          console.log(entries.length + ' ' + maxEntries)

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

      collector.on('remove', (_, user) => {
        const index = entries.findIndex(({ id }) => id === user.id);
        entries.splice(index, 1);
      });
    } catch {
      interaction.editReply(`An error occurred :(`);
    }
  }
};
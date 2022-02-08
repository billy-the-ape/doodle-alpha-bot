import {
  Constants,
  BaseCommandInteraction,
  Client,
  TextBasedChannel,
} from "discord.js";
import { Command } from "../types";
import { createEmbed, handleMessageReactions, notifyWinners, selectWinners } from "./util";

const run = async (client: Client, interaction: BaseCommandInteraction) => {
  try {
    const channel = await client.channels.fetch(interaction.channelId) as TextBasedChannel;

    if (!channel || !channel.isText) {
      console.error('No channel found ' + interaction.channelId);
      interaction.editReply('An error occurred, invalid channel.');
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

    const dropType="raffle";

    const embed = createEmbed({
      projectName,
      winnerCount,
      dropType,
      user: interaction.user,
      description: timeMessage + maxEntriesMessage,
      footerText: 'Good luck! Ends',
      timeStamp: endTime,
    });
    let complete = false;

    await handleMessageReactions({
      projectName,
      dropType,
      embed,
      client,
      interaction,
      winnerCount,
      maxEntries,
      onCollect: async (user, entries, message) => {
        if (
          user.id !== message.author.id &&
          (maxEntries < 1 || entries.length < maxEntries) &&
          !entries.find(({ id }) => id === user.id)
        ) {
          entries.push(user);

          if (entries.length === maxEntries) {
            const winners = selectWinners({ winnerCount, entries });
            await notifyWinners({
              discordUrl,
              winners,
              interaction,
              projectName,
              message,
            });
            complete = true;
          }
        }
      },
      onEnd: async (entries, message) => {
        if (!complete) {
          const winners = selectWinners({ winnerCount, entries });
          await notifyWinners({
            discordUrl,
            winners,
            interaction,
            projectName,
            message,
          });
        }
      }
    });
  } catch (e: any) {
    console.error('Error: ', e);
    interaction.editReply(`An unexpected error occurred: ${e.message}`);
  }
}

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
  run,
};
import { BaseCommandInteraction, Client } from 'discord.js';
import {
  addWl,
  createEmbed,
  ensureDiscordUrl,
  handleMessageReactions,
  notifyWinners,
  selectWinners,
  subtractWl,
} from '../util';

export const run = async (
  client: Client,
  interaction: BaseCommandInteraction
) => {
  try {
    addWl(client);

    const { value: userCountRaw } = interaction.options.get('wl-count', true);
    const { value: projectNameRaw } = interaction.options.get('project', true);
    const { value: discordUrlRaw } = interaction.options.get(
      'discord-link'
    ) ?? { value: '' };
    const { value: durationRaw } = interaction.options.get('duration-hrs') ?? {
      value: 1,
    };
    const { value: maxEntriesRaw } = interaction.options.get('max-entries') ?? {
      value: 0,
    };

    const winnerCount = Number(userCountRaw);
    const projectName = String(projectNameRaw);
    const discordUrl = ensureDiscordUrl(String(discordUrlRaw));
    const durationHrs = Number(durationRaw);
    const maxEntries = Number(maxEntriesRaw);
    const durationMs = durationHrs * 60 * 60 * 1000;

    const endTime = new Date();
    endTime.setTime(endTime.getTime() + durationMs);

    const timeMessage = `Ends <t:${Math.floor(endTime.getTime() / 1000)}:R>`;
    const maxEntriesMessage =
      maxEntries > 0 ? `\nMaximum ${maxEntries} entries.` : '';

    const dropType = 'raffle';

    const embed = createEmbed({
      projectName,
      winnerCount,
      dropType,
      user: interaction.user,
      description: timeMessage + maxEntriesMessage,
      footerText: 'Good luck! | Ends',
      timeStamp: endTime,
    });
    let complete = false;

    const success = await handleMessageReactions({
      projectName,
      dropType,
      embed,
      client,
      interaction,
      winnerCount,
      maxEntries,
      durationMs,
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
            subtractWl(client);
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
          subtractWl(client);
        }
      },
    });

    if (!success) {
      subtractWl(client);
    }
  } catch (e: any) {
    console.error('Error: ', e);
    interaction.editReply(`An unexpected error occurred: ${e.message}`);
  }
};

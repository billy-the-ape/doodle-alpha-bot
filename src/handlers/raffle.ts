import { BaseCommandInteraction, Client } from 'discord.js';
import {
  addWl,
  createEmbed,
  editInteractionReply,
  getParameters,
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

    const dropType = 'raffle';
    const {
      winnerCount,
      projectName,
      discordUrl,
      maxEntries,
      durationMs,
      emoji,
      description,
    } = getParameters(interaction);

    const timeStamp = new Date();
    timeStamp.setTime(timeStamp.getTime() + durationMs);

    const timeMessage = `Ends <t:${Math.floor(timeStamp.getTime() / 1000)}:R>`;
    const maxEntriesMessage =
      maxEntries > 0 ? `\nMaximum **${maxEntries}** entries.` : '';

    const embed = createEmbed({
      projectName,
      winnerCount,
      dropType,
      timeStamp,
      emoji,
      user: interaction.user,
      description: timeMessage + maxEntriesMessage,
      footerText: 'Good luck! | Ends',
    });
    let complete = false;

    const success = await handleMessageReactions({
      projectName,
      dropType,
      embed,
      client,
      interaction,
      maxEntries,
      durationMs,
      emoji,
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
              description,
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
            description,
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
    await editInteractionReply(
      interaction,
      `An unexpected error occurred: ${e.message}`
    );
  }
};

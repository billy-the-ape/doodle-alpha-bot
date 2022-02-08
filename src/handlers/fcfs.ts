import { BaseCommandInteraction, Client } from 'discord.js';
import {
  addWl,
  createEmbed,
  getParameters,
  handleMessageReactions,
  notifyWinners,
  subtractWl,
} from '../util';

export const run = async (
  client: Client,
  interaction: BaseCommandInteraction
) => {
  try {
    addWl(client);

    const dropType = 'FCFS';
    const { winnerCount, projectName, discordUrl, emoji } =
      getParameters(interaction);

    const embed = createEmbed({
      projectName,
      dropType,
      winnerCount,
      user: interaction.user,
      footerText: 'Good luck!',
      emoji,
    });

    const success = await handleMessageReactions({
      projectName,
      dropType,
      embed,
      client,
      interaction,
      winnerCount,
      maxEntries: winnerCount,
      emoji,
      onCollect: async (user, winners, message) => {
        if (
          user.id !== message.author.id &&
          winners.length < winnerCount &&
          !winners.find(({ id }) => id === user.id)
        ) {
          winners.push(user);

          if (winners.length === winnerCount) {
            await notifyWinners({
              discordUrl,
              winners,
              interaction,
              projectName,
              message,
            });
            subtractWl(client);
          }
        }
      },
      onEnd: () => {
        subtractWl(client);
      },
    });

    if (!success) {
      subtractWl(client);
    }
  } catch (e: any) {
    subtractWl(client);
    console.error('Error: ', e);
    interaction.editReply(`An unexpected error occurred: ${e.message}`);
  }
};

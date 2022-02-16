import { BaseCommandInteraction, Client } from 'discord.js';
import { addWhitelist } from '../mongo';
import {
  addWl,
  createEmbed,
  editInteractionReply,
  getParameters,
  handleMessageReactions,
  raffleEvents,
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

    const messageId = await handleMessageReactions({
      projectName,
      dropType,
      embed,
      client,
      interaction,
      maxEntries,
      durationMs,
      emoji,
      ...raffleEvents({
        client,
        interaction,
        discordUrl,
        winnerCount,
        projectName,
        description,
        maxEntries,
        creatorUser: interaction.user,
      }),
    });

    if (!messageId) {
      subtractWl(client);
      return;
    }

    await addWhitelist({
      _id: String(messageId),
      endTime: Date.now() + durationMs,
      projectName,
      dropType,
      winnerCount,
      discordUrl,
      description,
      emoji,
      userId: interaction.user.id,
      guildId: interaction.guildId!,
      channelId: interaction.channelId,
      interactionId: interaction.id,
    });
  } catch (e: any) {
    console.error('Error: ', e);
    await editInteractionReply(
      interaction,
      `An unexpected error occurred: ${e.message}`
    );
  }
};

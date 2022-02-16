import { BaseCommandInteraction, Client } from 'discord.js';
import { addWhitelist } from '../mongo';
import {
  addWl,
  createEmbed,
  DEFAULT_DURATION,
  editInteractionReply,
  fcfsOnCollect,
  getParameters,
  handleMessageReactions,
  subtractWl,
} from '../util';

export const run = async (
  client: Client,
  interaction: BaseCommandInteraction
) => {
  try {
    addWl(client);

    const dropType = 'FCFS';
    const { winnerCount, projectName, discordUrl, emoji, description } =
      getParameters(interaction);

    const embed = createEmbed({
      projectName,
      dropType,
      winnerCount,
      user: interaction.user,
      footerText: 'Good luck!',
      emoji,
    });

    const messageId = await handleMessageReactions({
      projectName,
      dropType,
      embed,
      client,
      interaction,
      maxEntries: winnerCount,
      emoji,
      onCollect: fcfsOnCollect({
        winnerCount,
        discordUrl,
        interaction,
        projectName,
        description,
        client,
        creatorUser: interaction.user,
      }),
    });

    if (!messageId) {
      subtractWl(client);
      return;
    }

    await addWhitelist({
      _id: String(messageId),
      endTime: Date.now() + DEFAULT_DURATION,
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
    subtractWl(client);
    console.error('Error: ', e);
    await editInteractionReply(
      interaction,
      `An unexpected error occurred: ${e.message}`
    );
  }
};

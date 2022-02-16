import {
  BaseCommandInteraction,
  MessagePayload,
  WebhookEditMessageOptions,
} from 'discord.js';
import { addWl, subtractWl } from './setup';

export * from './constants';
export { fcfsOnCollect, handleMessageReactions, raffleEvents } from './events';
export { createEmbed, notifyWinners, selectWinners } from './output';
export { subtractWl, addWl };

export const ensureDiscordUrl = (discordUrl: string) => {
  if (discordUrl.startsWith('discord' || discordUrl.startsWith('www')))
    return 'https://' + discordUrl;
  else if (discordUrl.trim() !== '') return 'https://discord.gg/' + discordUrl;
  return discordUrl;
};

export const log = (message?: any, ...optionalParams: any[]) => {
  if (process.env.NODE_ENV === 'dev') {
    console.log(message, ...optionalParams);
  }
};

export const getParameters = (interaction: BaseCommandInteraction) => {
  const { value: userCountRaw } = interaction.options.get('wl-count', true);
  const { value: projectNameRaw } = interaction.options.get('project', true);
  const { value: discordUrlRaw } = interaction.options.get('discord-link') ?? {
    value: '',
  };
  const { value: descriptionRaw } = interaction.options.get('description') ?? {
    value: '',
  };
  const { value: durationRaw } = interaction.options.get('duration-hrs') ?? {
    value: 1,
  };
  const { value: maxEntriesRaw } = interaction.options.get('max-entries') ?? {
    value: 0,
  };
  const { value: emojiRaw } = interaction.options.get('emoji') ?? {
    value: '🎉',
  };

  return {
    winnerCount: Number(userCountRaw),
    projectName: String(projectNameRaw),
    description: String(descriptionRaw),
    discordUrl: ensureDiscordUrl(String(discordUrlRaw)),
    maxEntries: Number(maxEntriesRaw),
    durationMs: Number(durationRaw) * 60 * 60 * 1000,
    emoji: String(emojiRaw),
  };
};

export const editInteractionReply = async (
  interaction?: BaseCommandInteraction,
  options?: string | MessagePayload | WebhookEditMessageOptions
) => {
  try {
    await interaction?.editReply(options!);
  } catch (e) {
    console.error('Error: ', e);
  }
};

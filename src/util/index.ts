import {
  BaseCommandInteraction,
  MessagePayload,
  WebhookEditMessageOptions,
} from 'discord.js';
import { BaseDrop, Drop } from '../mongo/types';
import { DropTypes } from '../types';
import { addDrop, subtractDrop } from './setup';

export * from './constants';
export { createDropMessage, fcfsOnCollect, raffleEvents } from './events';
export { createEmbed, notifyWinners, selectWinners } from './output';
export { subtractDrop, addDrop };

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
  const { value: durationHours } = interaction.options.get('duration-hrs') ?? {
    value: 1,
  };
  const { value: maxEntriesRaw } = interaction.options.get('max-entries') ?? {
    value: 0,
  };
  const { value: emojiRaw } = interaction.options.get('emoji') ?? {
    value: '🎉',
  };
  const { value: imageUrl } = interaction.options.get('image-url') ?? {
    value: '',
  };
  const { value: requireWallet } = interaction.options.get(
    'require-wallet'
  ) ?? {
    value: false,
  };

  return {
    winnerCount: Number(userCountRaw),
    projectName: String(projectNameRaw),
    description: String(descriptionRaw),
    discordUrl: ensureDiscordUrl(String(discordUrlRaw)),
    maxEntries: Number(maxEntriesRaw),
    durationMs: Number(durationHours) * 60 * 60 * 1000, // hours to ms
    emoji: String(emojiRaw),
    imageUrl: String(imageUrl),
    requireWallet: Boolean(requireWallet),
  };
};

export const getBaseDrop = (
  interaction: BaseCommandInteraction,
  overrides: Partial<Drop> & { dropType: DropTypes }
): BaseDrop => {
  const params = getParameters(interaction);
  const startTime = Date.now();

  return {
    ...params,
    ...overrides,
    startTime,
    userId: interaction.user.id,
    guildId: interaction.guildId!,
    channelId: interaction.channelId,
    endTime: startTime + params.durationMs,
  };
};

export const editInteractionReply = async (
  interaction?: BaseCommandInteraction,
  options?: string | MessagePayload | WebhookEditMessageOptions,
  warning = false
) => {
  if (warning && typeof options === 'string') {
    options = `\`\`\`fix\n${options}\n\`\`\``;
  }
  try {
    await interaction?.editReply(options!);
  } catch (e) {
    console.error('Error (editInteractionReply): ', e);
  }
};

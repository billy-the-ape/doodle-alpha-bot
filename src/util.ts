import {
  BaseCommandInteraction,
  CacheType,
  Client,
  Message,
  MessageEmbed,
  TextBasedChannel,
  User,
} from 'discord.js';

export type NotifyWinnersProps = {
  message: Message<boolean>;
  discordUrl: string;
  winners: User[];
  interaction: BaseCommandInteraction<CacheType>;
  projectName: string;
  sendDm?: boolean;
};

export type SelectWinnersProps = {
  winnerCount: number;
  entries: User[];
};

export type CreateEmbedProps = {
  winnerCount: number | string;
  dropType: string;
  projectName: string;
  user: User;
  footerText: string;
  description?: string;
  timeStamp?: Date;
};

export type HandleMessageReactionsProps = {
  interaction: BaseCommandInteraction;
  embed: MessageEmbed;
  projectName: string;
  dropType: string;
  client: Client;
  winnerCount: number;
  durationMs?: number;
  maxEntries?: number;
  emoji?: string;

  // Event handlers
  onCollect: (
    user: User,
    entries: User[],
    message: Message<boolean>
  ) => void | Promise<void>;
  onEnd: (entries: User[], message: Message<boolean>) => void | Promise<void>;
};

export const ensureDiscordUrl = (discordUrl: string) => {
  if (discordUrl.startsWith('discord' || discordUrl.startsWith('www')))
    return 'https://' + discordUrl;
  else if (discordUrl.trim() !== '') return 'https://discord.gg/' + discordUrl;
  return discordUrl;
};

export const notifyWinners = async ({
  message,
  discordUrl,
  winners,
  interaction,
  projectName,
  sendDm = true,
}: NotifyWinnersProps) => {
  const discordMessage = discordUrl
    ? `\n\n**Join discord: ${discordUrl}**`
    : '';

  // Message for creator of WL to easily copy all the discord names with #
  const winnersMessage =
    winners.length === 0
      ? 'None? 🥲'
      : winners.reduce(
          (acc, { username, discriminator }) =>
            `${acc}\n${username}#${discriminator}`,
          `\n**===== ${projectName} WINNERS =====**`
        ) + `\n**===== ${projectName} END =====**`;

  // Message to ping users
  const publicWinnersMessage =
    winners.length === 0
      ? 'None? 🥲'
      : winners.reduce(
          (acc, user) => `${acc} ${user.toString()}`,
          '\n🏆 Winners 🏆\n'
        );

  const winnerReply = await message.reply(
    `**${projectName} whitelist completed**\n${
      publicWinnersMessage + discordMessage
    }\n\n🎉🎉 _Congratulations!_ 🎉🎉`
  );
  winnerReply.suppressEmbeds(true);

  const newEmbed = message.embeds[0];
  newEmbed.description = `Ended <t:${Math.round(Date.now() / 1000)}>`;

  message.edit({
    embeds: [newEmbed],
  });

  if (sendDm) {
    try {
      const dm = await interaction.user.createDM(true);
      await dm.send(winnersMessage);
    } catch {
      await interaction.editReply(
        "Attempted to DM you winners, but I couldn't.\n" + winnersMessage
      );
    }
  } else {
    await interaction.editReply(winnersMessage);
  }
};

export const selectWinners = ({ winnerCount, entries }: SelectWinnersProps) => {
  if (winnerCount >= entries.length) {
    return entries;
  }

  const arr = [...entries];
  const result: User[] = [];

  while (result.length < winnerCount) {
    const random = Math.floor(Math.random() * arr.length);

    result.push(...arr.splice(random, 1));
  }

  return result;
};

export const createEmbed = ({
  winnerCount,
  dropType,
  projectName,
  user,
  description,
  timeStamp,
  footerText,
}: CreateEmbedProps) =>
  new MessageEmbed({
    title: `__${projectName}__ whitelist opportunity: ${winnerCount} spots, ${dropType}`,
    author: { name: user.username, iconURL: user.displayAvatarURL() },
    description,
    footer: { text: footerText },
  }).setTimestamp(timeStamp);

export const handleMessageReactions = async ({
  interaction,
  embed,
  projectName,
  dropType,
  client,
  winnerCount,
  maxEntries,
  durationMs = 86400000,
  onCollect,
  onEnd,
  emoji = '🎉',
}: HandleMessageReactionsProps) => {
  const channel = (await client.channels.fetch(
    interaction.channelId
  )) as TextBasedChannel;

  if (!channel || !channel.isText) {
    console.error('No channel found ' + interaction.channelId);
    interaction.editReply('An error occurred, invalid channel.');
    return false;
  }
  interaction.editReply(`Collecting entries for ${projectName} WL ${dropType}`);

  const message = await channel.send({ embeds: [embed] });
  const cancelEmoji = '❌';
  const entries: User[] = [];

  await message.react(emoji);

  maxEntries = maxEntries === 0 ? winnerCount : maxEntries ?? winnerCount;

  const collector = message.createReactionCollector({
    filter: (reaction) => reaction.emoji.name === emoji,
    max: 1 + maxEntries,
    time: durationMs,
  });

  const endEarlyCollector = message.createReactionCollector({
    filter: (reaction) => reaction.emoji.name === cancelEmoji,
    max: 1 + maxEntries,
    time: 86400000, // 24 hours force end
  });

  endEarlyCollector.on('collect', async ({ emoji }, user) => {
    log('onCancelCollect', { emoji: emoji.name, userId: user.id });
    if (user.id === interaction.user.id) {
      subtractWl(client);
      await message.delete();
      interaction.editReply(`${projectName} ${dropType} removed.`);
    }
  });

  collector.on('collect', ({ emoji }, user) => {
    log('onCollect', { emoji: emoji.name, userId: user.id });
    onCollect(user, entries, message);
  });

  if (onEnd) {
    collector.on('end', (a, b) => {
      log('onEnd', { entries: a.entries.length, reason: b });
      onEnd(entries, message);
    });
  }

  collector.on('remove', ({ emoji }, user) => {
    log('onRemove', { emoji: emoji.name, userId: user.id });
    const index = entries.findIndex(({ id }) => id === user.id);
    entries.splice(index, 1);
  });

  return true;
};

export const log = (message?: any, ...optionalParams: any[]) => {
  if (process.env.NODE_ENV === 'dev') {
    console.log(message, ...optionalParams);
  }
};

let wlCount = 0;

export const addWl = (client: Client) => {
  wlCount++;

  setStatusOngoing(client);
};

export const subtractWl = (client: Client) => {
  wlCount--;

  setStatusOngoing(client);
};

export const setStatusOngoing = (client: Client) =>
  client.user?.setPresence({
    status: wlCount <= 0 ? 'idle' : 'online',
    activities: [
      {
        name: `${wlCount} WL opportunit${wlCount > 1 ? 'ies' : 'y'}`,
        type: 'WATCHING',
      },
    ],
  });

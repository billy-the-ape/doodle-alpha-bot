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
  emoji: string;

  // Optional
  description?: string;
  timeStamp?: Date;
};

export type HandleMessageReactionsProps = {
  interaction: BaseCommandInteraction;
  embed: MessageEmbed;
  projectName: string;
  dropType: string;
  client: Client;
  emoji: string;
  winnerCount: number;
  maxEntries: number;

  // Optional
  durationMs?: number;

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

  message.embeds[0]
    .setDescription(`Ended <t:${Math.round(Date.now() / 1000)}>`)
    .setFooter({
      text: 'Ended',
    });

  message.edit({
    embeds: [message.embeds[0]],
  });

  if (sendDm) {
    await interaction.editReply(
      `${projectName}: ${winners.length} winners selected`
    );
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
  emoji,
}: CreateEmbedProps) =>
  new MessageEmbed({
    title: `__${projectName}__ whitelist opportunity: ${winnerCount} spot${
      winnerCount === 1 ? '' : 's'
    }, ${dropType}`,
    author: { name: user.username, iconURL: user.displayAvatarURL() },
    description: `${description ?? ''}\n\n**React with ${emoji} to enter**`,
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
  emoji,
}: HandleMessageReactionsProps) => {
  const channel = (await client.channels.fetch(
    interaction.channelId
  )) as TextBasedChannel;

  if (!channel || !channel.isText) {
    console.error('No channel found ' + interaction.channelId);
    interaction.editReply('An error occurred, invalid channel.');
    return false;
  }

  const message = await channel.send({ embeds: [embed] });
  const cancelEmoji = '❌';
  const entries: User[] = [];

  try {
    await message.react(emoji);
  } catch (e: any) {
    if (e.message === 'Unknown Emoji') {
      await message.delete();
      interaction.editReply(
        `**Invalid custom emoji - WL Cancelled**\n\nThe bot cannot use ${emoji} because it is probably from a server the bot is not in. To be safe, only use standard emojis or custome ones from the current server.`
      );
      return false;
    } else {
      throw e;
    }
  }

  const collector = message.createReactionCollector({
    filter: (reaction) =>
      reaction.emoji.name === emoji ||
      `<:${reaction.emoji.name}:${reaction.emoji.id}>` === emoji, // Custom emoji
    max: maxEntries === 0 ? undefined : 1 + maxEntries,
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

  interaction.editReply(`${projectName}: ${dropType} WL drop created.`);

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
        name: `${wlCount} WL opportunit${wlCount === 1 ? 'y' : 'ies'}`,
        type: 'WATCHING',
      },
    ],
  });

export const getParameters = (interaction: BaseCommandInteraction) => {
  const { value: userCountRaw } = interaction.options.get('wl-count', true);
  const { value: projectNameRaw } = interaction.options.get('project', true);
  const { value: discordUrlRaw } = interaction.options.get('discord-link') ?? {
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

  console.log({ emojiRaw });

  return {
    winnerCount: Number(userCountRaw),
    projectName: String(projectNameRaw),
    discordUrl: ensureDiscordUrl(String(discordUrlRaw)),
    maxEntries: Number(maxEntriesRaw),
    durationMs: Number(durationRaw) * 60 * 60 * 1000,
    emoji: String(emojiRaw),
  };
};

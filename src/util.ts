import {
  BaseCommandInteraction,
  Client,
  MessageEmbed,
  MessagePayload,
  TextBasedChannel,
  User,
  WebhookEditMessageOptions,
} from 'discord.js';
import { getActiveWhitelists, removeWhitelist } from './mongo';
import {
  ApplyMessageEventsProps,
  CreateEmbedProps,
  HandleMessageReactionsProps,
  MessageEventsProps,
  NotifyWinnersProps,
  OnCollectHandler,
  OnEndHandler,
  SelectWinnersProps,
} from './types';

export const ensureDiscordUrl = (discordUrl: string) => {
  if (discordUrl.startsWith('discord' || discordUrl.startsWith('www')))
    return 'https://' + discordUrl;
  else if (discordUrl.trim() !== '') return 'https://discord.gg/' + discordUrl;
  return discordUrl;
};

const NONE_MESSAGE = '\nNone? 🥲';

export const notifyWinners = async ({
  message,
  discordUrl,
  winners,
  interaction,
  creatorUser,
  projectName,
  description,
  sendDm = true,
}: NotifyWinnersProps) => {
  const discordMessage = discordUrl
    ? `\n\n**Join discord: ${discordUrl}**`
    : '';

  // Message for creator of WL to easily copy all the discord names with #
  let winnersMessage =
    winners.length === 0
      ? NONE_MESSAGE
      : winners.reduce(
          (acc, { username, discriminator }) =>
            `${acc}\n${username}#${discriminator}`,
          ''
        );

  winnersMessage = `\n**===== ${projectName} WINNERS =====**${winnersMessage}\n**===== ${projectName} END =====**`;

  // Message to ping users
  const publicWinnersMessage =
    winners.length === 0
      ? NONE_MESSAGE
      : winners.reduce(
          (acc, user) => `${acc} ${user.toString()}`,
          '\n🏆 Winners 🏆\n'
        );

  const desc = description ? `\n\n${description}` : '';

  const winnerReply = await message.reply(
    `**${projectName} whitelist completed**\n${
      publicWinnersMessage + desc + discordMessage
    }\n\n🎉 _Congratulations!_ 🎉`
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
    if (interaction) {
      await editInteractionReply(
        interaction,
        `${projectName}: ${winners.length} winners selected`
      );
    }
    try {
      const dm = await creatorUser.createDM(true);
      await dm.send(winnersMessage);
    } catch {
      if (interaction) {
        await editInteractionReply(
          interaction,
          "Attempted to DM you winners, but I couldn't.\n" + winnersMessage
        );
      }
    }
  } else {
    if (interaction) {
      await editInteractionReply(interaction, winnersMessage);
    }
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

export const DEFAULT_DURATION = 86400000;

export const handleMessageReactions = async ({
  interaction,
  embed,
  projectName,
  dropType,
  client,
  maxEntries,
  durationMs = DEFAULT_DURATION,
  onCollect,
  onEnd,
  emoji,
}: HandleMessageReactionsProps) => {
  const channel = (await client.channels.fetch(
    interaction.channelId
  )) as TextBasedChannel;

  if (!channel || !channel.isText) {
    console.error('No channel found ' + interaction.channelId);
    await editInteractionReply(
      interaction,
      'An error occurred, invalid channel.'
    );
    return false;
  }

  const message = await channel.send({ embeds: [embed] });

  try {
    await message.react(emoji);
  } catch (e: any) {
    if (e.message === 'Unknown Emoji') {
      await message.delete();
      await editInteractionReply(
        interaction,
        `**Invalid custom emoji - WL Cancelled**\n\nThe bot cannot use ${emoji} because it is probably from a server the bot is not in. To be safe, only use standard emojis or custome ones from the current server.`
      );
      return false;
    } else {
      throw e;
    }
  }

  applyMessageEvents({
    message,
    emoji,
    maxEntries,
    durationMs,
    interaction,
    creatorUser: interaction.user,
    client,
    projectName,
    dropType,
    onCollect,
    onEnd,
  });

  return message.id;
};

export const applyMessageEvents = async ({
  message,
  emoji,
  maxEntries = 0,
  durationMs,
  interaction,
  client,
  projectName,
  dropType,
  creatorUser,
  onCollect,
  onEnd,
  existingUsers = [],
}: ApplyMessageEventsProps) => {
  const cancelEmoji = '❌';
  const entries: User[] = [...existingUsers];

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
    time: durationMs, // 24 hours force end
  });

  endEarlyCollector.on('collect', async ({ emoji }, user) => {
    log('onCancelCollect', { emoji: emoji.name, userId: user.id });
    if (user.id === creatorUser.id) {
      subtractWl(client);
      await removeWhitelist(message.id);
      await message.delete();
      await editInteractionReply(
        interaction,
        `${projectName} ${dropType} removed.`
      );
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

  await editInteractionReply(
    interaction,
    `${projectName}: ${dropType} WL drop created.`
  );
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

export const fcfsOnCollect =
  ({
    winnerCount,
    discordUrl,
    interaction,
    projectName,
    description,
    client,
    creatorUser,
  }: MessageEventsProps): OnCollectHandler =>
  async (user, winners, message) => {
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
          description,
          message,
          creatorUser,
        });
        subtractWl(client);
        await removeWhitelist(message.id);
      }
    }
  };

export const raffleEvents = ({
  client,
  interaction,
  creatorUser,
  discordUrl,
  winnerCount,
  projectName,
  description,
  maxEntries = 0,
}: MessageEventsProps): {
  onCollect: OnCollectHandler;
  onEnd: OnEndHandler;
} => {
  let complete = false;
  return {
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
            creatorUser,
          });
          complete = true;
          subtractWl(client);
          await removeWhitelist(message.id);
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
          creatorUser,
        });
        subtractWl(client);
        await removeWhitelist(message.id);
      }
    },
  };
};

export const setupActiveWhitelists = async (client: Client) => {
  const whitelists = await getActiveWhitelists();

  console.log(`${whitelists.length} existing whitelists found. Loading...`);

  whitelists.forEach(async (whitelist) => {
    const creatorUser = await client.users.fetch(whitelist.userId);
    const channel = (await client.channels.fetch(
      whitelist.channelId
    )) as TextBasedChannel;

    const message = await channel.messages.fetch(whitelist._id);

    if (!message || !creatorUser) {
      console.error(
        `An orphaned whitelist was found \n${JSON.stringify(
          whitelist,
          null,
          2
        )}`
      );
      // await removeWhitelist(whitelist._id);
      return;
    }
    wlCount++;

    // Get users who have reacted
    let users: User[] = [];
    const reactionUsersRaw = message.reactions.cache.get(
      whitelist.emoji
    )?.users;

    if (reactionUsersRaw) {
      reactionUsersRaw.fetch({});
      const userIdsRaw = reactionUsersRaw.cache.keys();

      if (userIdsRaw) {
        const userIds = Array.from(userIdsRaw);
        users = userIds
          .filter((id) => id !== message.author.id)
          .map((id) => reactionUsersRaw.cache.get(id)!)
          .filter((u) => !!u)
          .slice(0, whitelist.maxEntries ?? 99999);
      }
    }

    const durationMs = whitelist.endTime - Date.now();

    if (durationMs <= 0) {
      log('Overdue Whitelist', whitelist);
      if (whitelist.dropType === 'raffle') {
        const winners = selectWinners({
          winnerCount: whitelist.winnerCount,
          entries: users,
        });
        notifyWinners({
          ...whitelist,
          message,
          winners,
          creatorUser: creatorUser,
        });
      } else if (whitelist.dropType === 'FCFS') {
        notifyWinners({
          ...whitelist,
          message,
          winners: users,
          creatorUser,
        });
      }
      await removeWhitelist(whitelist._id);
    } else {
      log('Active Whitelist', whitelist);
      const events =
        whitelist.dropType === 'raffle'
          ? raffleEvents({
              ...whitelist,
              client,
              creatorUser,
            })
          : {
              onCollect: fcfsOnCollect({
                ...whitelist,
                client,
                creatorUser,
              }),
            };
      applyMessageEvents({
        client,
        ...whitelist,
        ...events,
        message,
        creatorUser,
        existingUsers: users,
        durationMs,
      });
    }
  });

  console.log('Whitelists loaded.');
};

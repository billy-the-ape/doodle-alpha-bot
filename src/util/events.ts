import { MessageReaction, TextBasedChannel, User } from 'discord.js';
import {
  DEFAULT_DURATION,
  editInteractionReply,
  log,
  notifyWinners,
  selectWinners,
  subtractDrop,
} from '.';
import {
  completeWhitelist,
  getServer,
  getServerFromCache,
  removeWhitelist,
} from '../mongo';
import {
  ApplyMessageEventsProps,
  HandleMessageReactionsProps,
  MessageEventsProps,
  OnCollectHandler,
  OnEndHandler,
} from '../types';

let banlist: string[];

export const mapUser = ({ id, username, discriminator }: User) => ({
  id,
  name: `${username}#${discriminator}`,
});

const userIsBanned = (userId: string, reaction: MessageReaction) => {
  if (!banlist) {
    banlist = process.env.BANLIST ? String(process.env.BANLIST).split(',') : [];
  }
  if (banlist.includes(userId)) {
    try {
      reaction.users.remove(userId);
    } catch {}
    return true;
  }
  return false;
};

export const fcfsOnCollect =
  ({
    emoji,
    winnerCount,
    discordUrl,
    projectName,
    client,
    creatorUser,
  }: MessageEventsProps): OnCollectHandler =>
  async (user, winners, message, reaction) => {
    if (
      user.id !== message.author.id &&
      winners.length < winnerCount &&
      !winners.find(({ id }) => id === user.id)
    ) {
      if (!userIsBanned(user.id, reaction)) {
        winners.push(user);

        if (winners.length === winnerCount) {
          const usersToStore = winners.map(mapUser);

          await notifyWinners({
            emoji,
            discordUrl,
            winners,
            projectName,
            message,
            creatorUser,
          });
          subtractDrop(client);
          await completeWhitelist(message.id, usersToStore, usersToStore);
        }
      }
    }
  };

export const raffleEvents = ({
  emoji,
  client,
  creatorUser,
  discordUrl,
  winnerCount,
  projectName,
  maxEntries = 0,
}: MessageEventsProps): {
  onCollect: OnCollectHandler;
  onEnd: OnEndHandler;
} => {
  let complete = false;
  return {
    onCollect: async (user, entries, message, reaction) => {
      if (!userIsBanned(user.id, reaction)) {
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
              emoji,
              winners,
              projectName,
              message,
              creatorUser,
            });
            complete = true;
            subtractDrop(client);
            await completeWhitelist(
              message.id,
              winners.map(mapUser),
              entries.map(mapUser)
            );
          }
        }
      }
    },
    onEnd: async (entries, message) => {
      if (!complete) {
        const winners = selectWinners({ winnerCount, entries });
        await notifyWinners({
          emoji,
          discordUrl,
          winners,
          projectName,
          message,
          creatorUser,
        });
        subtractDrop(client);
        await completeWhitelist(
          message.id,
          winners.map(mapUser),
          entries.map(mapUser)
        );
      }
    },
  };
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
  requireWallet,
  guildId,
  onCollect,
  onEnd,
  existingUsers = [],
}: ApplyMessageEventsProps) => {
  const cancelEmoji = '❌';
  const entries: User[] = [...existingUsers];
  if (requireWallet) {
    await getServer(guildId);
  }

  const collector = message.createReactionCollector({
    filter: (reaction, user) => {
      const wallets = getServerFromCache(guildId) ?? ({} as any);
      const isEmoji =
        reaction.emoji.name === emoji ||
        `<:${reaction.emoji.name}:${reaction.emoji.id}>` === emoji || // Custom emoji
        (!!reaction.emoji.animated &&
          `<a:${reaction.emoji.name}:${reaction.emoji.id}>` === emoji); // Animated emoji

      const isWalletSubmitted = !requireWallet || !!wallets[user.id];

      if (!isWalletSubmitted) {
        reaction.users.remove(user);
      }

      return isEmoji && isWalletSubmitted;
    },
    max: maxEntries === 0 ? undefined : 1 + maxEntries,
    time: durationMs,
  });

  const endEarlyCollector = message.createReactionCollector({
    filter: (reaction) => reaction.emoji.name === cancelEmoji,
    max: 1 + maxEntries,
    time: durationMs,
  });

  endEarlyCollector.on('collect', async ({ emoji }, user) => {
    log('onCancelCollect', { emoji: emoji.name, userId: user.id });
    if (user.id === creatorUser.id) {
      subtractDrop(client);
      await removeWhitelist(message.id);
      await message.delete();
      await editInteractionReply(
        interaction,
        `${projectName} ${dropType} removed.`
      );
    }
  });

  collector.on('collect', (reaction, user) => {
    log('onCollect', { emoji: reaction.emoji.name, userId: user.id });
    onCollect(user, entries, message, reaction);
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
};

export const createDropMessage = async ({
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
  requireWallet,
}: HandleMessageReactionsProps): Promise<string | false> => {
  const channel = (await client.channels.fetch(
    interaction.channelId
  )) as TextBasedChannel;

  if (!channel || !channel.isText) {
    console.error('No channel found ' + interaction.channelId);
    await editInteractionReply(
      interaction,
      'An error occurred, invalid channel.',
      true
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
        `**Invalid custom emoji - Drop Cancelled**\n\nThe bot cannot use ${emoji} because it is probably from a server the bot is not in. To be safe, only use standard emojis or custome ones from the current server.`,
        true
      );
      return false;
    } else {
      throw e;
    }
  }

  await applyMessageEvents({
    message,
    emoji,
    maxEntries,
    durationMs,
    interaction,
    creatorUser: interaction.user,
    client,
    projectName,
    dropType,
    requireWallet,
    guildId: interaction.guildId ?? '',
    onCollect,
    onEnd,
  });

  await editInteractionReply(
    interaction,
    `${projectName} ${dropType} created successfully! ${emoji}`
  );

  return message.id;
};

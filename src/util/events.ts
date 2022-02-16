import { TextBasedChannel, User } from 'discord.js';
import { editInteractionReply, log, notifyWinners, selectWinners } from '.';
import { removeWhitelist } from '../mongo';
import {
  ApplyMessageEventsProps,
  HandleMessageReactionsProps,
  MessageEventsProps,
  OnCollectHandler,
  OnEndHandler,
} from '../types';
import { DEFAULT_DURATION } from './constants';
import { subtractWl } from './setup';

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

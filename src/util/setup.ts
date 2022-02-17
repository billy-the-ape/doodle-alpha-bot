import { Client, TextBasedChannel, User } from 'discord.js';
import { log, notifyWinners, selectWinners } from '.';
import { getActiveWhitelists, removeWhitelist } from '../mongo';
import { applyMessageEvents, fcfsOnCollect, raffleEvents } from './events';

const MIN_MAX_ENTRIES = 99999;
let dropCount = 0;

export const addDrop = (client: Client) => {
  dropCount++;

  setStatusOngoing(client);
};

export const subtractDrop = (client: Client) => {
  dropCount--;

  setStatusOngoing(client);
};

export const setStatusOngoing = (client: Client) =>
  client.user?.setPresence({
    status: dropCount <= 0 ? 'idle' : 'online',
    activities: [
      {
        name: `${dropCount} opportunit${dropCount === 1 ? 'y' : 'ies'}`,
        type: 'WATCHING',
      },
    ],
  });

export const setupActiveWhitelists = async (client: Client) => {
  const whitelists = await getActiveWhitelists();

  console.log(
    `doodle-alpha-bot: ${whitelists.length} existing whitelists found. Loading...`
  );

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
      await removeWhitelist(whitelist._id);
      return;
    }
    dropCount++;

    // Get users who have reacted
    let users: User[] = [];

    const maxEntries =
      (whitelist.maxEntries ?? 0) <= 0
        ? MIN_MAX_ENTRIES
        : whitelist.maxEntries ?? MIN_MAX_ENTRIES;
    const reactionUsersRaw = message.reactions.cache.get(
      whitelist.emoji
    )?.users;

    if (reactionUsersRaw) {
      const userIdsRaw = await reactionUsersRaw.fetch();

      if (userIdsRaw) {
        const userIds = Array.from(userIdsRaw);
        users = userIds
          .filter(([id, user]) => id !== message.author.id && !user.bot)
          .map(([_, user]) => user)
          .slice(0, maxEntries);
      }
    }

    const durationMs = whitelist.endTime - Date.now();

    if (durationMs <= 0 || users.length >= maxEntries) {
      log('Overdue Drop', whitelist);
      if (whitelist.dropType === 'raffle') {
        await notifyWinners({
          ...whitelist,
          message,
          creatorUser: creatorUser,
          winners: selectWinners({
            winnerCount: whitelist.winnerCount,
            entries: users,
          }),
        });
      } else if (whitelist.dropType === 'FCFS') {
        await notifyWinners({
          ...whitelist,
          message,
          winners: users,
          creatorUser,
        });
      }
      await removeWhitelist(whitelist._id);
    } else {
      // log('Active Drop', whitelist);
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

  console.log('doodle-alpha-bot: Whitelists loaded.');
};

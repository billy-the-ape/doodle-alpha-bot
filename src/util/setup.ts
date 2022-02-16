import { Client, TextBasedChannel, User } from 'discord.js';
import { notifyWinners, selectWinners } from '.';
import { getActiveWhitelists, removeWhitelist } from '../mongo';
import { applyMessageEvents, fcfsOnCollect, raffleEvents } from './events';

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
      // log('Overdue Whitelist', whitelist);
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
      // log('Active Whitelist', whitelist);
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

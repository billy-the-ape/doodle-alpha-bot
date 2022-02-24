import { MessageEmbed, User } from 'discord.js';
import { NONE_MESSAGE } from '.';
import { getServer } from '../mongo';
import {
  CreateEmbedProps,
  NotifyWinnersProps,
  SelectWinnersProps,
  WinnerData,
} from '../types';
import { generateCsv } from './fs';

export const notifyWinners = async ({
  emoji,
  message,
  discordUrl,
  winners,
  creatorUser,
  projectName,
  pin,
  sendDm = true,
}: NotifyWinnersProps) => {
  try {
    const discordMessage = discordUrl
      ? `\n\n**Join discord: <${discordUrl}>**`
      : '';

    const winnerData = await hydrateWinnerWallets({
      winners,
      serverId: message.guildId!,
    });

    // Message to become CSV data to DM to creator
    let winnersMessage =
      winnerData.length === 0
        ? NONE_MESSAGE
        : winnerData.reduce(
            (acc, { username, wallet }) => `${acc}\n"${username}","${wallet}"`,
            ''
          );
    winnersMessage = `"${projectName} Drop Winners","Wallet"${winnersMessage}`;

    // Message to ping users
    const publicWinnersMessage =
      winners.length === 0
        ? NONE_MESSAGE
        : winners.reduce(
            (acc, user) => `${acc} ${user.toString()}`,
            '\n🏆 Winners 🏆\n'
          );

    const winnerReply = await message.reply(
      `**${projectName} whitelist completed**\n${
        publicWinnersMessage + discordMessage
      }\n\n${emoji} _Congratulations!_ ${emoji}`
    );
    winnerReply.suppressEmbeds(true);

    message.embeds[0]
      .setDescription(`Ended <t:${Math.round(Date.now() / 1000)}>`)
      .setFooter({
        text: 'Ended',
      });

    await message.edit({
      embeds: [message.embeds[0]],
    });

    if (pin) {
      await message.unpin();
    }

    if (sendDm) {
      const csv = await generateCsv(projectName, winnersMessage);
      const dm = await creatorUser.createDM(true);
      await dm.send({
        content: `\`${projectName}\` whitelist drop complete. \`${winners.length}\` winners selected. Full list attached below.`,
        files: [csv],
      });
    }
  } catch (e) {
    console.error('Error (noftifyWinners)', e);
  }
};

export const hydrateWinnerWallets = async ({
  winners,
  serverId,
}: {
  winners: User[];
  serverId: string;
}): Promise<WinnerData[]> => {
  const memberAddresses = await getServer(serverId);
  return winners.map(({ id, username, discriminator }) => ({
    username: `${username}#${discriminator}`,
    wallet: memberAddresses?.[id] ?? '',
  }));
};

export const selectWinners = ({ winnerCount, entries }: SelectWinnersProps) => {
  if (winnerCount >= entries.length) {
    return entries;
  }

  const arr = [...entries];
  const winners: User[] = [];

  while (winners.length < winnerCount) {
    const random = Math.floor(Math.random() * arr.length);

    winners.push(...arr.splice(random, 1));
  }

  return winners;
};

export const createEmbed = ({
  winnerCount,
  dropType,
  projectName,
  member,
  description,
  timeStamp,
  footerText,
  emoji,
  imageUrl,
  requireWallet,
}: CreateEmbedProps) =>
  new MessageEmbed({
    title: `__${projectName} - ${winnerCount} spot${
      winnerCount === 1 ? '' : 's'
    } - ${dropType}__`,
    author: {
      name: member.displayName,
      iconURL: member.displayAvatarURL(),
    },
    description: `${description ?? ''}${
      requireWallet
        ? '\n\n **YOUR WALLET MUST BE SUBMITTED USING `/wl-wallet` FOR THIS ONE!!**'
        : ''
    }\n\n**React with ${emoji} to enter**`,
    footer: { text: footerText },
  })
    .setTimestamp(timeStamp)
    .setImage(imageUrl);

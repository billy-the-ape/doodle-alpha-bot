import { MessageEmbed, User } from 'discord.js';
import { editInteractionReply, NONE_MESSAGE } from '.';
import {
  CreateEmbedProps,
  NotifyWinnersProps,
  SelectWinnersProps,
} from '../types';

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

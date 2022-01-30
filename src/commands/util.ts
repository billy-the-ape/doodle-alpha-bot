import {
  User,
  BaseCommandInteraction,
  CacheType,
  TextBasedChannel,
  MessageEmbed,
  Message,
} from 'discord.js';

type NotifyWinnersProps = {
  message: Message<boolean>;
  discordUrl: string;
  winners: User[];
  interaction: BaseCommandInteraction<CacheType>,
  projectName: string;
}

type SelectWinnersProps = {
  winnerCount: number;
  entries: User[];
}

type CreateEmbedProps = {
  winnerCount: number | string;
  dropType: string;
  projectName: string;
  user: User;
  footerText: string;
  description?: string;
  timeStamp?: Date;
}

export const notifyWinners = ({
  message,
  discordUrl,
  winners,
  interaction,
  projectName,
}: NotifyWinnersProps) => {
  const discordMessage = discordUrl ? `\n\n**Join discord: ${discordUrl}**` : '';

  // Message for creator of WL to easily copy all the discord names with #
  const winnersMessage = winners.reduce((
    acc,
    { username, discriminator },
  ) => `${acc}\n${username}#${discriminator}`, `\n**===== ${projectName} WINNERS =====**`);

  // Message to ping users
  const publicWinnersMessage = winners.reduce((
    acc,
    user,
  ) => `${acc} ${user.toString()}`, '\n🏆 Winners:\n');

  interaction.editReply(winnersMessage);

  message.reply(`**${projectName} whitelist completed**\n${publicWinnersMessage + discordMessage}\n\n_Congratulations!_`)
}

export const selectWinners = ({
  winnerCount,
  entries
}: SelectWinnersProps) => {
  if (winnerCount >= entries.length) {
    return entries;
  }

  const arr = [...entries];
  const result: User[] = [];

  while(result.length < winnerCount) {
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
}: CreateEmbedProps) => new MessageEmbed({
  title: `__${projectName}__ whitelist opportunity: ${winnerCount} spots, ${dropType}`,
  author: { name: user.username, iconURL: user.displayAvatarURL() },
  description,
  footer: { text: footerText },
}).setTimestamp(timeStamp);
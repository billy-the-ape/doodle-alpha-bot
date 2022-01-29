import {
  User,
  BaseCommandInteraction,
  CacheType,
  TextBasedChannel,
  MessageEmbed,
} from 'discord.js';

type NotifyWinnersProps = {
  discordUrl: string;
  winners: User[];
  interaction: BaseCommandInteraction<CacheType>,
  projectName: string;
  channel: TextBasedChannel;
}

type SelectWinnersProps = {
  winnerCount: number;
  entries: User[];
}

export const notifyWinners = ({
  discordUrl,
  winners,
  interaction,
  projectName,
  channel,
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
  ) => `${acc} ${user.toString()}`, '\n🏆 Winners:');

  interaction.editReply(winnersMessage);

  const embed2 = new MessageEmbed({
    title: `${projectName} whitelist completed`,
    description: publicWinnersMessage + discordMessage,
    author: { name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() },
    footer: { text: 'Congratulations winners!' },
  });

  channel.send({ embeds: [embed2] });
}

export const selectWinners = ({
  winnerCount,
  entries
}: SelectWinnersProps) => {
  const selectedIndexes: number[] = [];

  if (winnerCount >= entries.length) {
    return entries;
  }

  while(selectedIndexes.length < winnerCount) {
    const random = Math.floor(Math.random() * entries.length);
  
    if (!selectedIndexes.includes(random)) {
      selectedIndexes.push(random);
    }
  }

  return selectedIndexes.map((i) => entries[i]);
};
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
  const discordMessage = discordUrl ? `**Join discord: ${discordUrl}\n\n**` : '';
  const winnersMessage = winners.reduce((
    acc,
    { username, discriminator },
  ) => `${acc}\n${username}#${discriminator}`, '===== WINNERS =====');

  const publicWinnersMessage = winners.reduce((
    acc,
    { username, discriminator },
  ) => `${acc}\n${username}#${discriminator}`, '🏆 Winners:');

  interaction.editReply(`${projectName} FCFS drop complete!\n\n${winnersMessage}`);

  const embed2 = new MessageEmbed({
    title: `${projectName} WL Completed`,
    description: discordMessage + publicWinnersMessage,
    author: { name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() },
    footer: { text: 'Congratulations winners!' },
  }).setTimestamp();

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
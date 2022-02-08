import {
  User,
  BaseCommandInteraction,
  CacheType,
  TextBasedChannel,
  MessageEmbed,
  Message,
  Client,
  MessageReaction,
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

export type HandleMessageReactionsProps = {
  interaction: BaseCommandInteraction,
  embed: MessageEmbed,
  projectName: string,
  dropType: string,
  client: Client,
  discordUrl?: string,
  winnerCount: number,
  maxEntries?: number,
  onCollect: (reaction: MessageReaction, user: User, entries: User[], message: Message<boolean>) => void,
  onEnd?: (entries: User[], message: Message<boolean>) => void,
};

export const handleMessageReactions = async ({
  interaction,
  embed,
  projectName,
  dropType,
  client,
  discordUrl,
  winnerCount,
  maxEntries,
  onCollect,
  onEnd,
}: HandleMessageReactionsProps) => {
  
  const channel = await client.channels.fetch(interaction.channelId) as TextBasedChannel;

  if (!channel || !channel.isText) {
    console.error('No channel found ' + interaction.channelId);
    interaction.editReply('An error occurred, invalid channel.');
    return;
  }
  interaction.editReply(`Collecting entries for ${projectName} WL ${dropType}`);

  const message = await channel.send({ embeds: [embed] });
  const emoji = '🎉';
  const cancelEmoji = '❌';
  const entries: User[] = [];

  await message.react(emoji);

  maxEntries = maxEntries ?? winnerCount;

  const collector = message.createReactionCollector({
    filter: (reaction) => reaction.emoji.name === emoji,
    max: 1 + maxEntries,
    time: 86400000, // 24 hours force end
  });

  const endEarlyCollector = message.createReactionCollector({
    filter: (reaction) => reaction.emoji.name === cancelEmoji,
    max: 1 + maxEntries,
    time: 86400000, // 24 hours force end
  });

  endEarlyCollector.on('collect', async (_, user) => {
    if(user.id === interaction.user.id){
      await message.delete();
      interaction.editReply(`${projectName} ${dropType} removed.`);
    }
  });

  collector.on('collect', (...args) => onCollect(...args, entries, message));

  if(onEnd) {
    collector.on('end', onEnd);
  }

  collector.on('remove', (_, user) => {
    const index = entries.findIndex(({ id }) => id === user.id);
    entries.splice(index, 1);
  });
}
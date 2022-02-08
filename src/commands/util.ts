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

export const notifyWinners = async ({
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
  ) => `${acc} ${user.toString()}`, '\n🏆 Winners 🏆\n');

  interaction.editReply(winnersMessage);

  const winnerReply = await message.reply(`**${projectName} whitelist completed**\n${publicWinnersMessage + discordMessage}\n\n🎉🎉 _Congratulations!_ 🎉🎉`)
  winnerReply.suppressEmbeds(true);
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
  winnerCount: number,
  maxEntries?: number,
  emoji?: string,
  onCollect: (user: User, entries: User[], message: Message<boolean>) => void | Promise<void>,
  onEnd?: (entries: User[], message: Message<boolean>) => void | Promise<void>,
};

export const handleMessageReactions = async ({
  interaction,
  embed,
  projectName,
  dropType,
  client,
  winnerCount,
  maxEntries,
  onCollect,
  onEnd,
  emoji = '🎉'
}: HandleMessageReactionsProps) => {
  
  const channel = await client.channels.fetch(interaction.channelId) as TextBasedChannel;

  if (!channel || !channel.isText) {
    console.error('No channel found ' + interaction.channelId);
    interaction.editReply('An error occurred, invalid channel.');
    return;
  }
  interaction.editReply(`Collecting entries for ${projectName} WL ${dropType}`);

  const message = await channel.send({ embeds: [embed] });
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

  endEarlyCollector.on('collect', async ({ emoji }, user) => {
    log('onCancelCollect', { emoji, userId: user.id });
    if(user.id === interaction.user.id) {
      await message.delete();
      interaction.editReply(`${projectName} ${dropType} removed.`);
    }
  });

  collector.on('collect', ({ emoji }, user) => {
    log('onCollect', { emoji, userId: user.id });
    onCollect(user, entries, message)
  });

  if(onEnd) {
    collector.on('end', (a, b) => {
      log('onEnd', { entries: a.entries.length, reason: b });
      onEnd(entries, message);
    });
  }

  collector.on('remove', ({ emoji }, user) => {
    log('onRemove', { emoji, userId: user.id });
    const index = entries.findIndex(({ id }) => id === user.id);
    entries.splice(index, 1);
  });
}

export const log = (message?: any, ...optionalParams: any[]) => {
  if(process.env.NODE_ENV === 'dev') {
    console.log(message, ...optionalParams);
  }
}
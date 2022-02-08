import { BaseCommandInteraction, Client } from "discord.js";
import { addWl, createEmbed, ensureDiscordUrl, handleMessageReactions, notifyWinners, subtractWl } from "../util";

export const run = async (client: Client, interaction: BaseCommandInteraction) => {
  try {
    addWl(client);

    const { value: userCountRaw } = interaction.options.get('wl-count', true);
    const { value: projectNameRaw } = interaction.options.get('project', true);
    const { value: discordUrlRaw } = interaction.options.get('discord-link') ?? { value: '' };

    const dropType = 'FCFS';
    const userCount = Number(userCountRaw);
    const projectName = String(projectNameRaw);
    const discordUrl = ensureDiscordUrl(String(discordUrlRaw));

    const embed = createEmbed({
      projectName,
      dropType,
      winnerCount: userCount,
      user: interaction.user,
      footerText: 'Good luck!',
    });

    const success = await handleMessageReactions({
      projectName,
      dropType,
      embed,
      client,
      interaction,
      winnerCount: userCount,
      onCollect: async (user, winners, message) => {
        if (
          user.id !== message.author.id &&
          winners.length < userCount &&
          !winners.find(({ id }) => id === user.id)
        ) {
          winners.push(user);
    
          if (winners.length === userCount) {
            await notifyWinners({
              discordUrl,
              winners,
              interaction,
              projectName,
              message,
            });
            subtractWl(client);
          }
        }
      },
      onEnd: () => {
        subtractWl(client);
      }
    });

    if(!success) {
      subtractWl(client);
    }
  } catch (e: any) {
    subtractWl(client);
    console.error('Error: ', e);
    interaction.editReply(`An unexpected error occurred: ${e.message}`);
  }
};

import { Constants, BaseCommandInteraction, Client } from "discord.js";
import { Command } from "../types";
import { createEmbed, handleMessageReactions, notifyWinners } from "./util";

const run = async (client: Client, interaction: BaseCommandInteraction) => {
  try {
    const { value: userCountRaw } = interaction.options.get('wl-count', true);
    const { value: projectNameRaw } = interaction.options.get('project', true);
    const { value: discordUrlRaw } = interaction.options.get('discord-link') ?? { value: '' };

    const userCount = Number(userCountRaw);
    const projectName = String(projectNameRaw);
    const dropType = 'FCFS';
    let discordUrl = String(discordUrlRaw);
    if (discordUrl.startsWith('discord' || discordUrl.startsWith('www'))) discordUrl = 'https://' + discordUrl;
    else if (discordUrl.trim() !== '') discordUrl = 'https://discord.gg/' + discordUrl;

    const embed = createEmbed({
      projectName,
      dropType,
      winnerCount: userCount,
      user: interaction.user,
      footerText: 'Good luck!',
    });


    await handleMessageReactions({
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
          }
        }
      },
    });

  } catch (e: any) {
    console.error('Error: ', e);
    interaction.editReply(`An unexpected error occurred: ${e.message}`);
  }
};

export const Fcfs: Command = {
  name: "wl-fcfs",
  description: "First come first serve whitelist drop (50 max)",
  type: "CHAT_INPUT",
  options: [
    {
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      name: 'wl-count',
      description: 'Number of entries available for the whitelist. Max 50.',
      required: true,
      maxValue: 50,
    },
    {
      type: Constants.ApplicationCommandOptionTypes.STRING,
      name: 'project',
      description: 'Name of the project providing the whitelist.',
      required: true,
    },
    {
      type: Constants.ApplicationCommandOptionTypes.STRING,
      name: 'discord-link',
      description: 'Link to project discord, optional.',
      required: false,
    },
  ],
  run,
};
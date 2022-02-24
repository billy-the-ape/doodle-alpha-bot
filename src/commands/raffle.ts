import { Constants } from 'discord.js';
import { run } from '../handlers/raffle';
import { Command } from '../types';

export const Raffle: Command = {
  name: 'wl-raffle',
  description: 'Raffle reaction whitelist drop (50 max)',
  type: 'CHAT_INPUT',
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
      name: 'description',
      description: 'Additional info about the WL drop, optional.',
      required: false,
    },
    {
      type: Constants.ApplicationCommandOptionTypes.NUMBER,
      name: 'duration-hrs',
      description: 'Duration (in hours) for raffle. Optional, default 1 hr.',
      required: false,
    },
    {
      type: Constants.ApplicationCommandOptionTypes.STRING,
      name: 'discord-link',
      description: 'Link to project discord, optional.',
      required: false,
    },
    {
      type: Constants.ApplicationCommandOptionTypes.INTEGER,
      name: 'max-entries',
      description: 'Max number of entries for the raffle, optional.',
      required: false,
    },
    {
      type: Constants.ApplicationCommandOptionTypes.STRING,
      name: 'emoji',
      description: 'Emoji reaction to use for entries, optional.',
      required: false,
    },
    {
      type: Constants.ApplicationCommandOptionTypes.STRING,
      name: 'image-url',
      description: 'Image url for embed, optional.',
      required: false,
    },
    {
      type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
      name: 'require-wallet',
      description: 'Require user to have submitted wallet to enter, optional.',
      required: false,
    },
    {
      type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
      name: 'pin',
      description: 'Pin raffle message, optional.',
      required: false,
    },
  ],
  run,
};

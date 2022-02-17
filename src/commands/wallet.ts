import { Constants } from 'discord.js';
import { run, runCheck } from '../handlers/wallet';
import { Command } from '../types';

export const Wallet: Command = {
  run,
  name: 'wl-wallet',
  description: 'Submit your wallet(s) for raffles',
  type: 'CHAT_INPUT',
  options: [
    {
      type: Constants.ApplicationCommandOptionTypes.STRING,
      name: 'mint-wallet',
      description: 'Wallet you would like to use to mint',
      required: true,
    },
  ],
};

export const WalletCheck: Command = {
  run: runCheck,
  name: 'wl-wallet-check',
  description: 'Check what wallet you have submitted to the bot.',
  type: 'CHAT_INPUT',
};

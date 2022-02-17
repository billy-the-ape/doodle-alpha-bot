import { BaseCommandInteraction, Client } from 'discord.js';
import { addToServer, getServer } from '../mongo';
import { editInteractionReply } from '../util';

const ETH_WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;

export const run = async (_: Client, interaction: BaseCommandInteraction) => {
  try {
    const { value: mintWalletRaw } = interaction.options.get(
      'mint-wallet',
      true
    );
    const mintWallet = String(mintWalletRaw);

    if (!ETH_WALLET_REGEX.test(mintWallet)) {
      editInteractionReply(
        interaction,
        `"${mintWallet}" is not a valid ETH address. Please try the \`/wl-wallet\` command again.`,
        true
      );
      return;
    }

    await addToServer(interaction.guildId!, {
      [interaction.user.id]: mintWallet,
    });

    interaction.editReply(`Wallet \`${mintWallet}\` submitted successfully.`);
  } catch (e) {
    console.error('Error (wl-wallet): ', e);
    await editInteractionReply(interaction, `An unexpected error occurred.`);
  }
};

export const runCheck = async (
  _: Client,
  interaction: BaseCommandInteraction
) => {
  try {
    const server = await getServer(interaction.guildId!);

    if (server !== null && server[interaction.user.id]) {
      editInteractionReply(
        interaction,
        `You have submitted \`${
          server[interaction.user.id]
        }\` as your wallet. Run \`/wl-wallet\` to update to a new one.`
      );
    } else {
      editInteractionReply(
        interaction,
        `You have not submitted a wallet. Run \`/wl-wallet\` to submit one.`,
        true
      );
    }
  } catch (e) {
    console.error('Error (wl-wallet-check): ', e);
    await editInteractionReply(interaction, `An unexpected error occurred.`);
  }
};

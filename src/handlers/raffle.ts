import { BaseCommandInteraction, Client, GuildMember } from 'discord.js';
import { addWhitelist } from '../mongo';
import { BaseDrop } from '../mongo/types';
import {
  addDrop,
  createDropMessage,
  createEmbed,
  editInteractionReply,
  getBaseDrop,
  raffleEvents,
  subtractDrop,
} from '../util';

export const run = async (
  client: Client,
  interaction: BaseCommandInteraction
) => {
  let drop: BaseDrop | null = null;
  try {
    addDrop(client);

    const dropType = 'raffle';
    drop = getBaseDrop(interaction, { dropType });

    const timeStamp = new Date();
    timeStamp.setTime(drop.endTime);

    const timeMessage = `Ends <t:${Math.floor(timeStamp.getTime() / 1000)}:R>`;
    const maxEntriesMessage =
      drop.maxEntries > 0 ? `\nMaximum **${drop.maxEntries}** entries.` : '';

    const embed = createEmbed({
      ...drop,
      timeStamp,
      member: interaction.member as GuildMember,
      description:
        (drop.description ? `${drop.description}\n\n` : '') +
        timeMessage +
        maxEntriesMessage,
      footerText: 'Good luck! | Ends',
    });

    const _id = await createDropMessage({
      ...drop,
      embed,
      client,
      interaction,
      ...raffleEvents({
        ...drop,
        client,
        interaction,
        creatorUser: interaction.user,
      }),
    });

    if (_id === false) {
      subtractDrop(client);
      return;
    }

    await addWhitelist({ ...drop, _id, completed: false });
  } catch (error: any) {
    console.error('Error (wl-raffle): ', { error, drop });
    await editInteractionReply(
      interaction,
      `An unexpected error occurred: ${error.message}`
    );
  }
};

import { BaseDrop } from '@/mongo/types';
import { BaseCommandInteraction, Client, GuildMember } from 'discord.js';
import { addWhitelist } from '../mongo';
import {
  addDrop,
  createDropMessage,
  createEmbed,
  DEFAULT_DURATION,
  editInteractionReply,
  fcfsOnCollect,
  getBaseDrop,
  subtractDrop,
} from '../util';

export const run = async (
  client: Client,
  interaction: BaseCommandInteraction
) => {
  let drop: BaseDrop | null = null;
  try {
    addDrop(client);

    const dropType = 'FCFS';

    drop = getBaseDrop(interaction, {
      dropType,
      endTime: Date.now() + DEFAULT_DURATION,
    });

    const embed = createEmbed({
      ...drop,
      member: interaction.member as GuildMember,
      footerText: 'Good luck!',
    });

    const _id = await createDropMessage({
      ...drop,
      embed,
      client,
      interaction,
      maxEntries: drop.winnerCount,
      onCollect: fcfsOnCollect({
        ...drop,
        client,
        interaction,
        creatorUser: interaction.user,
      }),
    });

    if (!_id) {
      subtractDrop(client);
      return;
    }

    await addWhitelist({ ...drop, _id, completed: false });
  } catch (error: any) {
    subtractDrop(client);
    console.error('Error (wl-fcfs): ', { error, drop });
    await editInteractionReply(
      interaction,
      `An unexpected error occurred: ${error.message}`
    );
  }
};

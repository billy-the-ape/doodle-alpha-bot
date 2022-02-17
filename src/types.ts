import {
  BaseCommandInteraction,
  ChatInputApplicationCommandData,
  Client,
  GuildMember,
  Message,
  MessageEmbed,
  MessageReaction,
  User,
} from 'discord.js';

export interface Command extends ChatInputApplicationCommandData {
  run: (client: Client, interaction: BaseCommandInteraction) => void;
}

export type OnCollectHandler = (
  user: User,
  entries: User[],
  message: Message<boolean>,
  reaction: MessageReaction
) => void | Promise<void>;

export type OnEndHandler = (
  entries: User[],
  message: Message<boolean>
) => void | Promise<void>;

export type ApplyMessageEventsProps = {
  message: Message;
  emoji: string;
  maxEntries?: number;
  durationMs: number;
  client: Client;
  projectName: string;
  dropType: DropTypes;
  creatorUser: User;

  existingUsers?: User[];
  interaction?: BaseCommandInteraction;

  // Event handlers
  onCollect: OnCollectHandler;
  onEnd?: OnEndHandler;
};

export type DropTypes = 'FCFS' | 'raffle';

export type NotifyWinnersProps = {
  emoji: string;
  message: Message<boolean>;
  winners: User[];
  projectName: string;
  creatorUser: User;

  //optional
  sendDm?: boolean;
  discordUrl?: string;
};

export type WinnerData = {
  username: string;
  wallet: string;
};

export type SelectWinnersProps = {
  winnerCount: number;
  entries: User[];
};

export type CreateEmbedProps = {
  winnerCount: number | string;
  dropType: DropTypes;
  projectName: string;
  member: GuildMember;
  user: User;
  footerText: string;
  emoji: string;
  imageUrl: string;

  // Optional
  description?: string;
  timeStamp?: Date;
};

export type HandleMessageReactionsProps = {
  interaction: BaseCommandInteraction;
  embed: MessageEmbed;
  projectName: string;
  dropType: DropTypes;
  client: Client;
  emoji: string;
  maxEntries: number;

  // Optional
  durationMs?: number;

  // Event handlers
  onCollect: OnCollectHandler;
  onEnd?: OnEndHandler;
};

export type MessageEventsProps = {
  emoji: string;
  client: Client;
  interaction?: BaseCommandInteraction;
  winnerCount: number;
  projectName: string;
  discordUrl?: string;
  maxEntries?: number;
  creatorUser: User;
};

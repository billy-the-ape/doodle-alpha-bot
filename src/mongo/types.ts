import { Db, MongoClient } from 'mongodb';
import { DropTypes } from '../types';

export type ConnType = {
  client: MongoClient;
  db: Db;
};

export type CachedType = {
  conn: ConnType | null;
  promise: Promise<ConnType> | null;
};

export type BaseDrop = {
  emoji: string;
  dropType: DropTypes;
  winnerCount: number;
  projectName: string;
  imageUrl: string;
  durationMs: number;
  startTime: number;
  endTime: number;
  maxEntries: number;
  guildId: string;
  channelId: string;
  userId: string;
  requireWallet: boolean;

  // optional
  discordUrl?: string;
  description?: string;
};

export type StoredUser = {
  id: string;
  name: string;
};

export type Drop = BaseDrop & {
  _id: string; // MessageId required
  completed: boolean;
};

export type CompletedDrop = Drop & {
  completed: true;
  winners: StoredUser[];
  entries: StoredUser[];
};

export type Server = {
  _id: string;
  [key: string]: string;
};

export type CollectionTypeMap = {
  whitelist: Drop;
  server: Server;
};

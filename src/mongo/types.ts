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

  // optional
  discordUrl?: string;
  description?: string;
};

export type Drop = BaseDrop & {
  _id: string; // MessageId required
};

export type Server = {
  _id: string;
  [key: string]: string;
};

export type CollectionTypeMap = {
  whitelist: Drop;
  server: Server;
};

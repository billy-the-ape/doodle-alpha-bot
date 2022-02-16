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

export type Whitelist = {
  _id: string; // MessageId
  endTime: number;
  dropType: DropTypes;
  winnerCount: number;
  projectName: string;
  guildId: string;
  channelId: string;
  interactionId: string;
  userId: string;
  emoji: string;

  // optional
  discordUrl?: string;
  maxEntries?: number;
  description?: string;
};

export type CollectionTypeMap = {
  whitelist: Whitelist;
};

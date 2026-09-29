import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { Deployment, HindsightBank, HindsightMemory } from '../src/types/reactor.js';

export const deployments = pgTable('deployments', {
  id: text('id').primaryKey(),
  number: integer('number').notNull().unique(),
  data: jsonb('data').$type<Deployment>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const hindsightBanks = pgTable('hindsight_banks', {
  id: text('id').primaryKey(),
  data: jsonb('data').$type<HindsightBank>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const hindsightMemories = pgTable('hindsight_memories', {
  id: text('id').primaryKey(),
  bankId: text('bank_id').notNull(),
  data: jsonb('data').$type<HindsightMemory>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

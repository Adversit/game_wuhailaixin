import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const gameSaves = sqliteTable('game_saves', {
  userId: text('user_id').primaryKey(),
  stateJson: text('state_json').notNull(),
  revision: integer('revision').notNull(),
  operationId: text('operation_id').notNull(),
  updatedAt: text('updated_at').notNull(),
});

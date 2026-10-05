import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const gameSaves = sqliteTable("game_saves", {
  userId: text("user_id").primaryKey(),
  payload: text("payload").notNull(),
  revision: integer("revision").notNull().default(1),
  writeId: text("write_id").notNull(),
  updatedAt: text("updated_at").notNull(),
});

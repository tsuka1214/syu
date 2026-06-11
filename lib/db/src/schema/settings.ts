import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  weeklyDigestDay: integer("weekly_digest_day").notNull().default(1), // 0=日, 1=月, ... 6=土
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Settings = typeof settingsTable.$inferSelect;

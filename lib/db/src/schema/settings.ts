import { pgTable, serial, integer, timestamp, text } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  weeklyDigestDay: integer("weekly_digest_day").notNull().default(1), // 過去の互換性保存（今は使わない）
  // weekdayTimes: JSON string {"0":"09:00","1":"15:15",...}  (日曜開始)
  weekdayTimes: text("weekday_times").notNull().default('{"0":"08:45","1":"15:15","2":"15:15","3":"15:15","4":"15:15","5":"15:15","6":"08:45"}'),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Settings = typeof settingsTable.$inferSelect;

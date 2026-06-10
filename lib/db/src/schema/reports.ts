import { pgTable, text, serial, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  type: text("type", { enum: ["absence", "late", "earlyLeave", "other"] }).notNull(),
  senderName: text("sender_name").notNull(),
  reason: text("reason").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  expectedTime: text("expected_time"),
  channelId: text("channel_id"),
  status: text("status", { enum: ["sent", "failed", "pending"] }).notNull().default("pending"),
  lineWorksMessageId: text("line_works_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;

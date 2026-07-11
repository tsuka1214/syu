import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  lineWorksUserId: text("line_works_user_id").notNull().unique(),
  name: text("name").notNull(),
  department: text("department"),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;

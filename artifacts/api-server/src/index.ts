import app from "./app";
import { logger } from "./lib/logger";
import cron from "node-cron";
import { and, eq, gte } from "drizzle-orm";
import { db, reportsTable } from "@workspace/db";
import { sendDailyDigest } from "./lib/lineworks";
import { format } from "date-fns";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// 毎朝9:00に当日分の未送信連絡をまとめてLINE WORKSへ送信
cron.schedule("0 9 * * *", async () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const todayStart = new Date(`${today}T00:00:00`);

  try {
    const pending = await db
      .select()
      .from(reportsTable)
      .where(and(gte(reportsTable.createdAt, todayStart), eq(reportsTable.status, "pending")));

    if (pending.length === 0) {
      logger.info({ today }, "Daily digest: no pending reports");
      return;
    }

    const messageId = await sendDailyDigest(pending, today);

    await db
      .update(reportsTable)
      .set({ status: "sent", lineWorksMessageId: messageId })
      .where(and(gte(reportsTable.createdAt, todayStart), eq(reportsTable.status, "pending")));

    logger.info({ today, count: pending.length }, "Daily digest sent");
  } catch (err) {
    logger.error({ err }, "Daily digest cron failed");
  }
}, { timezone: "Asia/Tokyo" });

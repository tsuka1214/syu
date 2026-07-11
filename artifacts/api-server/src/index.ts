import app from "./app";
import { logger } from "./lib/logger";
import cron from "node-cron";
import { and, eq, gte } from "drizzle-orm";
import { db, reportsTable, settingsTable } from "@workspace/db";
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

async function runDailyDigest() {
  try {
    const now = new Date();
    const today = format(now, "yyyy-MM-dd");

    const pending = await db
      .select()
      .from(reportsTable)
      .where(and(eq(reportsTable.date, today), eq(reportsTable.status, "pending")));

    if (pending.length === 0) {
      logger.info("Daily digest: no pending reports for today");
      return;
    }

    const messageId = await sendDailyDigest(pending, today);

    await db
      .update(reportsTable)
      .set({ status: "sent", lineWorksMessageId: messageId })
      .where(and(eq(reportsTable.date, today), eq(reportsTable.status, "pending")));

    logger.info({ count: pending.length }, "Daily digest sent");
  } catch (err) {
    logger.error({ err }, "Daily digest cron failed");
  }
}

// 月〜金: 毎日15:15に実行
cron.schedule("15 15 * * 1-5", () => runDailyDigest(), { timezone: "Asia/Tokyo" });

// 土・日: 8:45に実行
cron.schedule("45 8 * * 0,6", () => runDailyDigest(), { timezone: "Asia/Tokyo" });

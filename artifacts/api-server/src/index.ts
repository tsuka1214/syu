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

async function runWeeklyDigestIfConfigured(overrideDay?: number) {
  try {
    const [settings] = await db.select().from(settingsTable).limit(1);
    const configuredDay = settings?.weeklyDigestDay ?? 1;

    const now = new Date();
    const todayDay = overrideDay ?? now.getDay();

    if (todayDay !== configuredDay) {
      logger.info({ todayDay, configuredDay }, "Weekly digest: not today, skipping");
      return;
    }

    const since = new Date(now);
    since.setDate(since.getDate() - 7);

    const pending = await db
      .select()
      .from(reportsTable)
      .where(and(gte(reportsTable.createdAt, since), eq(reportsTable.status, "pending")));

    if (pending.length === 0) {
      logger.info("Weekly digest: no pending reports");
      return;
    }

    const rangeLabel = `${format(since, "yyyy/MM/dd")}〜${format(now, "yyyy/MM/dd")}`;
    const messageId = await sendDailyDigest(pending, rangeLabel);

    await db
      .update(reportsTable)
      .set({ status: "sent", lineWorksMessageId: messageId })
      .where(and(gte(reportsTable.createdAt, since), eq(reportsTable.status, "pending")));

    logger.info({ count: pending.length }, "Weekly digest sent");
  } catch (err) {
    logger.error({ err }, "Weekly digest cron failed");
  }
}

// 日〜金: 毎日15:15に実行
cron.schedule("15 15 * * 0-5", () => runWeeklyDigestIfConfigured(), { timezone: "Asia/Tokyo" });

// 土曜のみ: 8:45に実行
cron.schedule("45 8 * * 6", () => runWeeklyDigestIfConfigured(6), { timezone: "Asia/Tokyo" });

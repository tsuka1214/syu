import app from "./app";
import { logger } from "./lib/logger";
import cron from "node-cron";
import { and, eq } from "drizzle-orm";
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

async function checkScheduledDigest() {
  try {
    const now = new Date();
    const day = String(now.getDay());
    const timeStr = format(now, "HH:mm");

    const [settings] = await db.select().from(settingsTable).limit(1);
    let weekdayTimes: Record<string, string> = {};
    try {
      weekdayTimes = JSON.parse(settings?.weekdayTimes ?? "{}") as Record<string, string>;
    } catch {
      weekdayTimes = {};
    }

    const scheduled = weekdayTimes[day];
    if (!scheduled || scheduled !== timeStr) return;

    logger.info({ day, time: timeStr }, "Scheduled digest triggered");
    await runDailyDigest();
  } catch (err) {
    logger.error({ err }, "Scheduled digest check failed");
  }
}

// 毎分チェックして設定時間に一致すれば実行
cron.schedule("* * * * *", () => checkScheduledDigest(), { timezone: "Asia/Tokyo" });

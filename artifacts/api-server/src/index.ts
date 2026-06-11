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

// 毎日15:15に実行し、設定された曜日であれば今週の未送信連絡をまとめてLINE WORKSへ送信
cron.schedule("15 15 * * *", async () => {
  try {
    const [settings] = await db.select().from(settingsTable).limit(1);
    const configuredDay = settings?.weeklyDigestDay ?? 1; // デフォルト月曜

    const now = new Date();
    const todayDay = now.getDay(); // 0=日, 1=月, ...

    if (todayDay !== configuredDay) {
      logger.info({ todayDay, configuredDay }, "Weekly digest: not today, skipping");
      return;
    }

    // 過去7日間の未送信連絡を取得
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
}, { timezone: "Asia/Tokyo" });

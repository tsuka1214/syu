import { Router, type IRouter } from "express";
import { gte, and, eq } from "drizzle-orm";
import { db, reportsTable } from "@workspace/db";
import { ListChannelsResponse } from "@workspace/api-zod";
import { getChannels, sendDailyDigest } from "../lib/lineworks";
import { handleWebhookEvent } from "../lib/lineworks-webhook";
import { format } from "date-fns";

const router: IRouter = Router();

router.post("/lineworks/digest", async (req, res): Promise<void> => {
  const today = format(new Date(), "yyyy-MM-dd");

  const pending = await db
    .select()
    .from(reportsTable)
    .where(
      and(
        eq(reportsTable.date, today),
        eq(reportsTable.status, "pending")
      )
    );

  if (pending.length === 0) {
    res.status(400).json({ error: "本日対象日の未送信連絡がありません" });
    return;
  }

  let messageId: string | null = null;
  try {
    messageId = await sendDailyDigest(pending, today);
  } catch (err) {
    req.log.error({ err }, "Failed to send LINE WORKS digest");
    res.status(502).json({ error: "LINE WORKSへの送信に失敗しました" });
    return;
  }

  await db
    .update(reportsTable)
    .set({ status: "sent", lineWorksMessageId: messageId })
    .where(
      and(
        eq(reportsTable.date, today),
        eq(reportsTable.status, "pending")
      )
    );

  res.json({ sentCount: pending.length, date: today, messageId });
});

router.post("/lineworks/webhook", async (req, res): Promise<void> => {
  res.status(200).end();
  const event = req.body;
  if (!event) return;
  try {
    await handleWebhookEvent(event);
  } catch (err) {
    req.log.error({ err }, "Webhook event handler failed");
  }
});

router.get("/lineworks/channels", async (req, res): Promise<void> => {
  try {
    const channels = await getChannels();
    res.json(ListChannelsResponse.parse(channels));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch LINE WORKS channels");
    res.status(502).json({ error: "LINE WORKSチャンネルの取得に失敗しました" });
  }
});

export default router;

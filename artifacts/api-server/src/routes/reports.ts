import { Router, type IRouter } from "express";
import { desc, eq, count, sql } from "drizzle-orm";
import { db, reportsTable } from "@workspace/db";
import {
  CreateReportBody,
  GetReportParams,
  GetReportResponse,
  ListReportsQueryParams,
  ListReportsResponse,
  GetReportSummaryResponse,
} from "@workspace/api-zod";
import { sendLineWorksMessage } from "../lib/lineworks";

const router: IRouter = Router();

router.get("/reports/summary", async (req, res): Promise<void> => {
  const [totals] = await db
    .select({
      total: count(),
      absenceCount: sql<number>`COUNT(*) FILTER (WHERE type = 'absence')`,
      lateCount: sql<number>`COUNT(*) FILTER (WHERE type = 'late')`,
      earlyLeaveCount: sql<number>`COUNT(*) FILTER (WHERE type = 'earlyLeave')`,
      otherCount: sql<number>`COUNT(*) FILTER (WHERE type = 'other')`,
    })
    .from(reportsTable);

  const recentReports = await db
    .select()
    .from(reportsTable)
    .orderBy(desc(reportsTable.createdAt))
    .limit(5);

  const summary = {
    total: Number(totals.total),
    absenceCount: Number(totals.absenceCount),
    lateCount: Number(totals.lateCount),
    earlyLeaveCount: Number(totals.earlyLeaveCount),
    otherCount: Number(totals.otherCount),
    recentReports: recentReports.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  };

  res.json(GetReportSummaryResponse.parse(summary));
});

router.get("/reports", async (req, res): Promise<void> => {
  const query = ListReportsQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 50) : 50;
  const offset = query.success ? (query.data.offset ?? 0) : 0;

  const reports = await db
    .select()
    .from(reportsTable)
    .orderBy(desc(reportsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(
    ListReportsResponse.parse(
      reports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
    )
  );
});

router.post("/reports", async (req, res): Promise<void> => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid report input");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, senderName, reason, date, expectedTime, channelId } = parsed.data;

  const [report] = await db
    .insert(reportsTable)
    .values({
      type,
      senderName,
      reason,
      date,
      expectedTime: expectedTime ?? null,
      channelId: channelId ?? null,
      status: "pending",
    })
    .returning();

  let messageId: string | null = null;
  let status: "sent" | "failed" = "sent";

  try {
    messageId = await sendLineWorksMessage({
      channelId,
      type,
      senderName,
      date,
      reason,
      expectedTime,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to send LINE WORKS message");
    status = "failed";
  }

  const [updated] = await db
    .update(reportsTable)
    .set({ status, lineWorksMessageId: messageId })
    .where(eq(reportsTable.id, report.id))
    .returning();

  if (status === "failed") {
    res.status(502).json({ error: "LINE WORKSへの送信に失敗しました。連絡は記録されています。" });
    return;
  }

  res.status(201).json(
    GetReportResponse.parse({ ...updated, createdAt: updated.createdAt.toISOString() })
  );
});

router.get("/reports/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetReportParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [report] = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.id, params.data.id));

  if (!report) {
    res.status(404).json({ error: "連絡が見つかりません" });
    return;
  }

  res.json(GetReportResponse.parse({ ...report, createdAt: report.createdAt.toISOString() }));
});

export default router;

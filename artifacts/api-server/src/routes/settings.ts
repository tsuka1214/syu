import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";

const router: IRouter = Router();

const DEFAULT_TIMES = { "0": "08:45", "1": "15:15", "2": "15:15", "3": "15:15", "4": "15:15", "5": "15:15", "6": "08:45" };

function parseTimes(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (let i = 0; i <= 6; i++) {
    const v = obj[String(i)];
    if (typeof v !== "string") return null;
    if (!/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(v)) return null;
    result[String(i)] = v;
  }
  return result;
}

async function ensureSettings() {
  const [row] = await db.select().from(settingsTable).limit(1);
  if (row) return row;
  const [created] = await db.insert(settingsTable).values({ weeklyDigestDay: 1 }).returning();
  return created;
}

router.get("/settings", async (req, res): Promise<void> => {
  const settings = await ensureSettings();
  let times: Record<string, string>;
  try {
    times = JSON.parse(settings.weekdayTimes) as Record<string, string>;
  } catch {
    times = DEFAULT_TIMES;
  }
  res.json({ weeklyDigestDay: settings.weeklyDigestDay, weekdayTimes: times });
});

router.patch("/settings", async (req, res): Promise<void> => {
  const body = req.body as { weeklyDigestDay?: unknown; weekdayTimes?: unknown };
  const updates: Partial<{ weeklyDigestDay: number; weekdayTimes: string }> = {};

  if (body.weekdayTimes !== undefined) {
    const times = parseTimes(body.weekdayTimes);
    if (!times) {
      res.status(400).json({ error: "weekdayTimes は { \"0\":\"HH:MM\", ..., \"6\":\"HH:MM\" } の形式で指定してください" });
      return;
    }
    updates.weekdayTimes = JSON.stringify(times);
  }

  if (body.weeklyDigestDay !== undefined) {
    const day = Number(body.weeklyDigestDay);
    if (!Number.isFinite(day) || day < 0 || day > 6) {
      res.status(400).json({ error: "weeklyDigestDay は 0〜6 の整数で指定してください" });
      return;
    }
    updates.weeklyDigestDay = day;
  }

  const existing = await ensureSettings();
  const [updated] = await db
    .update(settingsTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(settingsTable.id, existing.id))
    .returning();

  let times: Record<string, string>;
  try {
    times = JSON.parse(updated.weekdayTimes) as Record<string, string>;
  } catch {
    times = DEFAULT_TIMES;
  }

  res.json({ weeklyDigestDay: updated.weeklyDigestDay, weekdayTimes: times });
});

export default router;
export { ensureSettings };

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";

const router: IRouter = Router();

async function ensureSettings() {
  const [row] = await db.select().from(settingsTable).limit(1);
  if (row) return row;
  const [created] = await db.insert(settingsTable).values({ weeklyDigestDay: 1 }).returning();
  return created;
}

router.get("/settings", async (req, res): Promise<void> => {
  const settings = await ensureSettings();
  res.json({ weeklyDigestDay: settings.weeklyDigestDay });
});

router.patch("/settings", async (req, res): Promise<void> => {
  const { weeklyDigestDay } = req.body as { weeklyDigestDay?: unknown };
  if (weeklyDigestDay === undefined || typeof weeklyDigestDay !== "number" || weeklyDigestDay < 0 || weeklyDigestDay > 6) {
    res.status(400).json({ error: "weeklyDigestDay は 0〜6 の整数で指定してください" });
    return;
  }

  const existing = await ensureSettings();
  const [updated] = await db
    .update(settingsTable)
    .set({ weeklyDigestDay, updatedAt: new Date() })
    .where(eq(settingsTable.id, existing.id))
    .returning();

  res.json({ weeklyDigestDay: updated.weeklyDigestDay });
});

export default router;
export { ensureSettings };

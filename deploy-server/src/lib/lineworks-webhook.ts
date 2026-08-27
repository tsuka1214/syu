import { format } from "date-fns";
import { db, reportsTable } from "@workspace/db";
import { sendBotMessage } from "./lineworks";
import { logger } from "./logger";

// ---- 会話セッション ----
interface Session {
  step: "type" | "name" | "date" | "reason" | "time";
  data: Partial<{
    type: string;
    senderName: string;
    date: string;
    reason: string;
    expectedTime: string;
  }>;
}

const sessions = new Map<string, Session>();

// ---- 定数 ----
const TYPE_LOOKUP: Record<string, string> = {
  "1": "absence", "欠席": "absence",
  "2": "late",    "遅刻": "late",
  "3": "earlyLeave", "早退": "earlyLeave",
  "4": "other",   "その他": "other",
};

const TYPE_LABELS: Record<string, string> = {
  absence: "欠席", late: "遅刻", earlyLeave: "早退", other: "その他",
};

const MENU_TEXT = [
  "勤怠連絡を受け付けます。",
  "種別を入力してください：",
  "1 または 欠席",
  "2 または 遅刻",
  "3 または 早退",
  "4 または その他",
].join("\n");

// ---- イベントハンドラ ----
export async function handleWebhookEvent(event: unknown): Promise<void> {
  const ev = event as Record<string, unknown>;
  const source = ev.source as Record<string, string> | undefined;
  const userId = source?.userId;
  if (!userId) return;

  // テキスト取得（messageイベント or postback）
  let text = "";
  if (ev.type === "message") {
    const msg = ev.message as Record<string, string> | undefined;
    if (msg?.type !== "text") return; // 画像などは無視
    text = (msg.text ?? "").trim();
  } else if (ev.type === "postback") {
    text = ((ev.data as string) ?? "").trim();
  } else {
    return;
  }

  const session = sessions.get(userId);

  // セッションなし → 新規開始
  if (!session) {
    sessions.set(userId, { step: "type", data: {} });
    await sendBotMessage(userId, MENU_TEXT);
    return;
  }

  try {
    await processStep(userId, session, text);
  } catch (err) {
    logger.error({ err, userId, step: session.step }, "Webhook session error");
    sessions.delete(userId);
    await sendBotMessage(userId, "エラーが発生しました。もう一度最初からやり直してください。");
  }
}

async function processStep(userId: string, session: Session, text: string): Promise<void> {
  switch (session.step) {
    case "type": {
      const type = TYPE_LOOKUP[text];
      if (!type) {
        await sendBotMessage(userId, "1〜4、または「欠席」「遅刻」「早退」「その他」と入力してください。");
        return;
      }
      session.data.type = type;
      session.step = "name";
      sessions.set(userId, session);
      await sendBotMessage(userId, "お名前を入力してください。");
      break;
    }

    case "name": {
      if (!text) { await sendBotMessage(userId, "名前を入力してください。"); return; }
      session.data.senderName = text;
      session.step = "date";
      sessions.set(userId, session);
      await sendBotMessage(
        userId,
        `対象日を入力してください。\n例：${format(new Date(), "yyyy-MM-dd")}（「今日」でも可）`
      );
      break;
    }

    case "date": {
      let date: string;
      if (text === "今日") {
        date = format(new Date(), "yyyy-MM-dd");
      } else {
        const normalized = text.replace(/\//g, "-");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
          await sendBotMessage(userId, `日付の形式が正しくありません。\n例：${format(new Date(), "yyyy-MM-dd")} または 今日`);
          return;
        }
        date = normalized;
      }
      session.data.date = date;
      session.step = "reason";
      sessions.set(userId, session);
      await sendBotMessage(userId, "理由を入力してください。");
      break;
    }

    case "reason": {
      if (!text) { await sendBotMessage(userId, "理由を入力してください。"); return; }
      session.data.reason = text;

      const needsTime = session.data.type === "late" || session.data.type === "earlyLeave";
      if (needsTime) {
        const timeLabel = session.data.type === "late" ? "到着予定時刻" : "早退予定時刻";
        session.step = "time";
        sessions.set(userId, session);
        await sendBotMessage(userId, `${timeLabel}を入力してください。\n例：10:30（不明な場合は「スキップ」）`);
      } else {
        await finishReport(userId, session);
      }
      break;
    }

    case "time": {
      if (text !== "スキップ" && text) {
        session.data.expectedTime = text;
      }
      await finishReport(userId, session);
      break;
    }
  }
}

async function finishReport(userId: string, session: Session): Promise<void> {
  const { type, senderName, date, reason, expectedTime } = session.data;

  await db.insert(reportsTable).values({
    type: type!,
    senderName: senderName!,
    date: date!,
    reason: reason!,
    expectedTime: expectedTime ?? null,
    channelId: null,
    status: "pending",
  });

  sessions.delete(userId);

  const typeLabel = TYPE_LABELS[type!] ?? type;
  let msg = `✅ 連絡を受け付けました！\n\n`;
  msg += `種別：${typeLabel}\n`;
  msg += `氏名：${senderName}\n`;
  msg += `日付：${date}\n`;
  msg += `理由：${reason}`;
  if (expectedTime) msg += `\n時刻：${expectedTime}`;

  await sendBotMessage(userId, msg);
  logger.info({ userId, type, senderName, date }, "Report saved via Bot webhook");
}

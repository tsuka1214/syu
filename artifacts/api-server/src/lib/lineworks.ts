import jwt from "jsonwebtoken";
import { logger } from "./logger";

const CLIENT_ID = process.env.LINEWORKS_CLIENT_ID!;
const CLIENT_SECRET = process.env.LINEWORKS_CLIENT_SECRET!;
const SERVICE_ACCOUNT = process.env.LINEWORKS_SERVICE_ACCOUNT!;
const PRIVATE_KEY = process.env.LINEWORKS_PRIVATE_KEY!;
const BOT_ID = process.env.LINEWORKS_BOT_ID!;
const DEFAULT_CHANNEL_ID = process.env.LINEWORKS_CHANNEL_ID!;

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const now = Math.floor(Date.now() / 1000);

  const jwtPayload = {
    iss: CLIENT_ID,
    sub: SERVICE_ACCOUNT,
    iat: now,
    exp: now + 3600,
  };

  let privateKey = PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
  if (!privateKey.includes("\n")) {
    const begin = "-----BEGIN PRIVATE KEY-----";
    const end = "-----END PRIVATE KEY-----";
    const body = privateKey
      .replace(begin, "")
      .replace(end, "")
      .trim()
      .replace(/ /g, "");
    const chunked = body.match(/.{1,64}/g)?.join("\n") ?? body;
    privateKey = `${begin}\n${chunked}\n${end}`;
  }

  const assertion = jwt.sign(jwtPayload, privateKey, { algorithm: "RS256" });

  const params = new URLSearchParams({
    assertion,
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "bot",
  });

  const response = await fetch("https://auth.worksmobile.com/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error({ status: response.status, body: text }, "Failed to get LINE WORKS access token");
    throw new Error(`LINE WORKS auth failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as TokenResponse;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

const TYPE_LABELS: Record<string, string> = {
  absence: "欠席",
  late: "遅刻",
  earlyLeave: "早退",
  other: "その他",
};

export interface SendMessageOptions {
  channelId?: string;
  type: string;
  senderName: string;
  date: string;
  reason: string;
  expectedTime?: string | null;
}

export async function sendLineWorksMessage(opts: SendMessageOptions): Promise<string> {
  const token = await getAccessToken();
  const channelId = opts.channelId || DEFAULT_CHANNEL_ID;
  const typeLabel = TYPE_LABELS[opts.type] || opts.type;

  let text = `【${typeLabel}連絡】\n`;
  text += `氏名: ${opts.senderName}\n`;
  text += `日付: ${opts.date}\n`;
  text += `理由: ${opts.reason}`;
  if (opts.type === "late" && opts.expectedTime) {
    text += `\n到着予定時刻: ${opts.expectedTime}`;
  }

  const body = {
    content: {
      type: "text",
      text,
    },
  };

  const url = `https://www.worksapis.com/v1.0/bots/${BOT_ID}/channels/${channelId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error({ status: response.status, body: text }, "Failed to send LINE WORKS message");
    throw new Error(`LINE WORKS message send failed: ${response.status} ${text}`);
  }

  const result = (await response.json()) as { messageId?: string };
  return result.messageId ?? "";
}

const TYPE_ORDER = ["absence", "late", "earlyLeave", "other"] as const;

export interface DigestReport {
  id: number;
  type: string;
  senderName: string;
  date: string;
  reason: string;
  expectedTime?: string | null;
}

export async function sendDailyDigest(reports: DigestReport[], date: string): Promise<string> {
  const token = await getAccessToken();

  const grouped: Record<string, DigestReport[]> = {};
  for (const r of reports) {
    (grouped[r.type] ??= []).push(r);
  }

  let text = `【勤怠連絡まとめ】${date}\n\n`;
  let total = 0;
  for (const type of TYPE_ORDER) {
    const items = grouped[type];
    if (!items?.length) continue;
    total += items.length;
    text += `■ ${TYPE_LABELS[type]}（${items.length}件）\n`;
    for (const r of items) {
      text += `・${r.senderName} — ${r.reason}`;
      if (type === "late" && r.expectedTime) {
        text += `（${r.expectedTime}到着予定）`;
      }
      text += "\n";
    }
    text += "\n";
  }
  text += `合計 ${total}件`;

  const body = { content: { type: "text", text } };
  const url = `https://www.worksapis.com/v1.0/bots/${BOT_ID}/channels/${DEFAULT_CHANNEL_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    logger.error({ status: response.status, body: errText }, "Failed to send LINE WORKS digest");
    throw new Error(`LINE WORKS digest send failed: ${response.status} ${errText}`);
  }

  const result = (await response.json()) as { messageId?: string };
  return result.messageId ?? "";
}

export async function getChannels(): Promise<Array<{ id: string; name: string; type: string | null }>> {
  const defaultChannel = {
    id: DEFAULT_CHANNEL_ID,
    name: "デフォルトチャンネル",
    type: null,
  };

  if (!DEFAULT_CHANNEL_ID) {
    return [];
  }

  return [defaultChannel];
}

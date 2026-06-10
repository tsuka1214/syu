import { ReportType, ReportStatus } from "@workspace/api-client-react";

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  absence: "欠席",
  late: "遅刻",
  earlyLeave: "早退",
  other: "その他",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  sent: "送信済み",
  failed: "送信失敗",
  pending: "送信中",
};

export const REPORT_TYPE_COLORS: Record<ReportType, string> = {
  absence: "bg-destructive/10 text-destructive border-destructive/20",
  late: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  earlyLeave: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  other: "bg-muted text-muted-foreground border-border",
};

export const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  sent: "bg-primary/10 text-primary border-primary/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-muted text-muted-foreground border-border",
};

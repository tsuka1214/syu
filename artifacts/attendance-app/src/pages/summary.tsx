import { useGetReportSummary, useSendDigest, useGetSettings, useUpdateSettings, getListReportsQueryKey, getGetReportSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Clock, CalendarX, LogOut, CheckCircle2, Send, Loader2, Settings } from "lucide-react";

const DAY_LABELS = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

export default function Summary() {
  const { data: summary, isLoading } = useGetReportSummary();
  const { data: settings, isLoading: isLoadingSettings } = useGetSettings();
  const sendDigest = useSendDigest();
  const updateSettings = useUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSendDigest = () => {
    sendDigest.mutate(undefined, {
      onSuccess: (data) => {
        toast({
          title: "送信完了",
          description: `${data.sentCount}件 の連絡をまとめてLINE WORKSへ送信しました。`,
        });
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetReportSummaryQueryKey() });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "送信失敗",
          description: error.error || "エラーが発生しました。",
        });
      },
    });
  };

  const handleDayChange = (value: string) => {
    updateSettings.mutate(
      { data: { weeklyDigestDay: Number(value) } },
      {
        onSuccess: (data) => {
          toast({
            title: "設定を保存しました",
            description: `毎週${DAY_LABELS[data.weeklyDigestDay ?? 1]}に自動送信します。`,
          });
        },
        onError: () => {
          toast({ variant: "destructive", title: "保存失敗", description: "設定の保存に失敗しました。" });
        },
      }
    );
  };

  const stats = [
    { title: "総連絡数", value: summary?.total ?? 0, icon: FileText, description: "システム経由で送信された全連絡", color: "text-primary" },
    { title: "欠席", value: summary?.absenceCount ?? 0, icon: CalendarX, description: "欠席連絡", color: "text-destructive" },
    { title: "遅刻", value: summary?.lateCount ?? 0, icon: Clock, description: "遅刻連絡", color: "text-orange-500" },
    { title: "早退", value: summary?.earlyLeaveCount ?? 0, icon: LogOut, description: "早退連絡", color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">サマリー</h2>
          <p className="text-muted-foreground mt-1">勤怠連絡の集計情報です。</p>
        </div>
        <Button onClick={handleSendDigest} disabled={sendDigest.isPending} className="shrink-0">
          {sendDigest.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />送信中...</>
          ) : (
            <><Send className="mr-2 h-4 w-4" />今すぐまとめて送信</>
          )}
        </Button>
      </div>

      {/* 週次自動送信の曜日設定 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">自動送信の設定</CardTitle>
          </div>
          <CardDescription>
            設定した曜日の15:15（土曜日は8:45）に、その週の未送信連絡をまとめてLINE WORKSへ自動送信します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium whitespace-nowrap">送信曜日</span>
            {isLoadingSettings ? (
              <Skeleton className="h-9 w-36" />
            ) : (
              <Select
                value={String(settings?.weeklyDigestDay ?? 1)}
                onValueChange={handleDayChange}
                disabled={updateSettings.isPending}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_LABELS.map((label, i) => (
                    <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {updateSettings.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium"><Skeleton className="h-4 w-16" /></CardTitle>
                  <Skeleton className="h-4 w-4 rounded-full" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold"><Skeleton className="h-8 w-12" /></div>
                  <Skeleton className="h-3 w-32 mt-1" />
                </CardContent>
              </Card>
            ))
          : stats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}件</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>直近のアクティビティ</CardTitle>
          <CardDescription>最近送信された連絡</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="ml-4 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))
            ) : summary?.recentReports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">最近の連絡はありません。</p>
            ) : (
              summary?.recentReports.map((report) => (
                <div key={report.id} className="flex items-center">
                  <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted/50 items-center justify-center">
                    {report.type === 'absence' && <CalendarX className="h-5 w-5 text-destructive" />}
                    {report.type === 'late' && <Clock className="h-5 w-5 text-orange-500" />}
                    {report.type === 'earlyLeave' && <LogOut className="h-5 w-5 text-amber-500" />}
                    {report.type === 'other' && <FileText className="h-5 w-5 text-muted-foreground" />}
                  </span>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {report.senderName}さんが{report.date}の連絡を送信しました
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{report.reason}</p>
                  </div>
                  <div className="ml-auto text-xs flex items-center gap-1 shrink-0">
                    {report.status === 'sent' && (
                      <span className="font-medium text-primary flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> 送信済み
                      </span>
                    )}
                    {report.status === 'pending' && (
                      <span className="text-muted-foreground">未送信</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

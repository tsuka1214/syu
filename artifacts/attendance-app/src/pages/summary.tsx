import { useState } from "react";
import { useGetReportSummary, useSendDigest, getListReportsQueryKey, getGetReportSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Clock, CalendarX, LogOut, CheckCircle2, Send, Loader2 } from "lucide-react";

export default function Summary() {
  const { data: summary, isLoading } = useGetReportSummary();
  const sendDigest = useSendDigest();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSendDigest = () => {
    sendDigest.mutate(undefined, {
      onSuccess: (data) => {
        toast({
          title: "送信完了",
          description: `本日の連絡 ${data.sentCount}件 をまとめてLINE WORKSへ送信しました。`,
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

  const stats = [
    {
      title: "総連絡数",
      value: summary?.total ?? 0,
      icon: FileText,
      description: "システム経由で送信された全連絡",
      color: "text-primary",
    },
    {
      title: "欠席",
      value: summary?.absenceCount ?? 0,
      icon: CalendarX,
      description: "本日の欠席連絡",
      color: "text-destructive",
    },
    {
      title: "遅刻",
      value: summary?.lateCount ?? 0,
      icon: Clock,
      description: "本日の遅刻連絡",
      color: "text-orange-500",
    },
    {
      title: "早退",
      value: summary?.earlyLeaveCount ?? 0,
      icon: LogOut,
      description: "本日の早退連絡",
      color: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">サマリー</h2>
          <p className="text-muted-foreground mt-1">
            本日の勤怠連絡の集計情報です。
          </p>
        </div>
        <Button
          onClick={handleSendDigest}
          disabled={sendDigest.isPending}
          className="shrink-0"
        >
          {sendDigest.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              送信中...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              今日の連絡をまとめて送信
            </>
          )}
        </Button>
      </div>

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
                  <p className="text-xs text-muted-foreground mt-1"><Skeleton className="h-3 w-32" /></p>
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
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {report.reason}
                    </p>
                  </div>
                  {report.status === 'sent' && (
                    <div className="ml-auto font-medium text-xs text-primary flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> 送信済み
                    </div>
                  )}
                  {report.status === 'pending' && (
                    <div className="ml-auto font-medium text-xs text-muted-foreground flex items-center gap-1">
                      未送信
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

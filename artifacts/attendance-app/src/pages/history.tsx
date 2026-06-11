import { useState } from "react";
import { useListReports, useDeleteReport, getListReportsQueryKey, getGetReportSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";
import { REPORT_TYPE_LABELS, REPORT_STATUS_LABELS, REPORT_TYPE_COLORS, REPORT_STATUS_COLORS } from "@/lib/constants";

type Report = { id: number; status: string; senderName: string; type: string; date: string; reason: string; expectedTime?: string | null; createdAt: string };

export default function History() {
  const { data: reports, isLoading } = useListReports({ limit: 50 });
  const deleteReport = useDeleteReport();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [target, setTarget] = useState<Report | null>(null);

  const handleConfirmDelete = () => {
    if (!target) return;
    deleteReport.mutate(
      { id: target.id },
      {
        onSuccess: () => {
          toast({ title: "取り消し完了", description: "連絡を削除しました。" });
          queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetReportSummaryQueryKey() });
          setTarget(null);
        },
        onError: () => {
          toast({ variant: "destructive", title: "エラー", description: "削除に失敗しました。" });
          setTarget(null);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">送信履歴</h2>
        <p className="text-muted-foreground mt-1">
          これまでに送信された勤怠連絡の一覧です。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>履歴一覧</CardTitle>
          <CardDescription>直近50件の連絡を表示しています。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">送信日時</TableHead>
                  <TableHead className="w-[100px]">状態</TableHead>
                  <TableHead className="w-[100px]">種別</TableHead>
                  <TableHead className="w-[120px]">対象日</TableHead>
                  <TableHead className="w-[150px]">氏名</TableHead>
                  <TableHead className="min-w-[200px]">理由 / 予定</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : reports?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      履歴がありません。
                    </TableCell>
                  </TableRow>
                ) : (
                  reports?.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(report.createdAt), "yyyy/MM/dd HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-normal ${REPORT_STATUS_COLORS[report.status]}`}>
                          {REPORT_STATUS_LABELS[report.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-normal ${REPORT_TYPE_COLORS[report.type]}`}>
                          {REPORT_TYPE_LABELS[report.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{report.date}</TableCell>
                      <TableCell className="text-sm font-medium">{report.senderName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="line-clamp-2" title={report.reason}>
                          {report.reason}
                        </div>
                        {report.expectedTime && (
                          <div className="text-xs text-orange-600 mt-1">
                            予定: {report.expectedTime}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setTarget(report as Report)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!target} onOpenChange={(open) => { if (!open) setTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>連絡を取り消しますか？</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  <span className="font-medium text-foreground">{target?.senderName}</span> さんの{" "}
                  <span className="font-medium text-foreground">{target?.date}</span> の連絡を削除します。
                </p>
                {target?.status === "sent" && (
                  <p className="text-amber-600 text-sm">
                    ※ すでにLINE WORKSへ送信済みのメッセージは取り消せません。履歴からの削除のみ行われます。
                  </p>
                )}
                {target?.status === "pending" && (
                  <p className="text-sm">
                    まだ未送信のため、削除するとLINE WORKSへ送信されなくなります。
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

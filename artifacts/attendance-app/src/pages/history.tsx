import { useListReports } from "@workspace/api-client-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { REPORT_TYPE_LABELS, REPORT_STATUS_LABELS, REPORT_TYPE_COLORS, REPORT_STATUS_COLORS } from "@/lib/constants";

export default function History() {
  const { data: reports, isLoading } = useListReports({ limit: 50 });

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : reports?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

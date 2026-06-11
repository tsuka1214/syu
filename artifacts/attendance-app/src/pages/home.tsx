import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  useCreateReport,
  getListReportsQueryKey,
  getGetReportSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { REPORT_TYPE_LABELS } from "@/lib/constants";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";

const formSchema = z.object({
  type: z.enum(["absence", "late", "earlyLeave", "other"], {
    required_error: "種別を選択してください",
  }),
  senderName: z.string().min(1, "氏名を入力してください"),
  date: z.string().min(1, "日付を入力してください"),
  reason: z.string().min(1, "理由を入力してください"),
  expectedTime: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createReport = useCreateReport();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "absence",
      senderName: "",
      date: format(new Date(), "yyyy-MM-dd"),
      reason: "",
      expectedTime: "",
    },
  });

  const watchType = form.watch("type");

  const onSubmit = (data: FormValues) => {
    const payload = { ...data };
    if (payload.type !== "late" && payload.type !== "earlyLeave") {
      delete payload.expectedTime;
    }
    createReport.mutate(
      { data: payload as any },
      {
        onSuccess: () => {
          toast({
            title: "送信完了",
            description: "連絡を送信しました。",
          });
          form.reset({
            type: "absence",
            senderName: data.senderName, // keep name
            date: format(new Date(), "yyyy-MM-dd"),
            reason: "",
            expectedTime: "",
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
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">勤怠連絡の作成</h2>
        <p className="text-muted-foreground mt-1">
          LINE WORKSのチームチャンネルに連絡を送信します。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>連絡フォーム</CardTitle>
          <CardDescription>必要な情報を入力してください。</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>種別</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col sm:flex-row gap-4"
                      >
                        {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                          <FormItem key={value} className="flex items-center space-x-2 space-y-0 bg-muted/50 p-3 rounded-md border border-border">
                            <FormControl>
                              <RadioGroupItem value={value} />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer w-full">{label}</FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="senderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>氏名</FormLabel>
                      <FormControl>
                        <Input placeholder="山田 太郎" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>日付</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {(watchType === "late" || watchType === "earlyLeave") && (
                <FormField
                  control={form.control}
                  name="expectedTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {watchType === "late" ? "到着予定時刻" : "早退予定時刻"}
                      </FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>理由</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="体調不良のため、本日はお休みをいただきます。"
                        className="min-h-[100px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={createReport.isPending}
              >
                {createReport.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    連絡を送信する
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

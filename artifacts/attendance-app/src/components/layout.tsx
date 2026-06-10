import { Link, useLocation } from "wouter";
import { LayoutDashboard, History, Send, Activity } from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();

  const navigation = [
    { name: "連絡作成", href: "/", icon: Send },
    { name: "送信履歴", href: "/history", icon: History },
    { name: "サマリー", href: "/summary", icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <nav className="w-full md:w-64 border-b md:border-r border-border bg-card flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <span className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <Activity className="w-5 h-5" />
            </span>
            勤怠連絡
          </h1>
          <p className="text-xs text-muted-foreground mt-2">LINE WORKS連携</p>
        </div>
        <div className="flex-1 px-4 pb-4 md:py-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors whitespace-nowrap md:whitespace-normal font-medium text-sm ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
        {health && (
          <div className="hidden md:block p-4 border-t border-border mt-auto">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${health.status === 'ok' ? 'bg-primary' : 'bg-destructive'}`} />
              システム: {health.status === 'ok' ? '正常稼働中' : '異常あり'}
            </div>
          </div>
        )}
      </nav>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

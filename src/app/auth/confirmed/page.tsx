import Link from "next/link";
import { CheckCircle2, CircleAlert, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ConfirmedPageProps = {
  searchParams?: {
    status?: string;
    reason?: string;
    next?: string;
  };
};

function getReasonLabel(reason?: string) {
  if (!reason) return "Подтверждение не выполнено.";
  if (reason === "missing_token") {
    return "Ссылка подтверждения неполная. Запросите новое письмо.";
  }
  return "Ссылка недействительна или устарела. Запросите новое подтверждение.";
}

export default function AuthConfirmedPage({ searchParams }: ConfirmedPageProps) {
  const status = searchParams?.status;
  const next = searchParams?.next && searchParams.next.startsWith("/") ? searchParams.next : "/";
  const success = status === "success";

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-xl border-slate-200 bg-white/95 shadow-sm">
        <CardHeader>
          <div className="mb-3">
            {success ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            ) : (
              <CircleAlert className="h-6 w-6 text-rose-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {success ? "Email подтвержден" : "Не удалось подтвердить email"}
          </CardTitle>
          <p className="text-sm text-slate-600">
            {success
              ? "Аккаунт активирован. Можете перейти в систему и продолжить работу."
              : getReasonLabel(searchParams?.reason)}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <Button asChild className="w-full">
              <Link href={next}>Перейти в CRM</Link>
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link href="/signup">
                <MailCheck className="mr-1.5 h-4 w-4" />
                Вернуться к регистрации
              </Link>
            </Button>
          )}

          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Открыть вход</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


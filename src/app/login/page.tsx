"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (signInError) {
      setError("Не удалось войти. Проверьте email и пароль.");
      return;
    }

    const next = searchParams.get("next");
    window.location.href = next && next.startsWith("/") ? next : "/";
  }

  return (
    <Card className="w-full max-w-md border-slate-200 bg-white/95 shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Вход в систему</CardTitle>
        <p className="text-sm text-slate-600">
          Войдите, чтобы управлять касаниями и сделками.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.kz"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Нет аккаунта?{" "}
          <Link href="/signup" className="font-medium text-teal-700 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

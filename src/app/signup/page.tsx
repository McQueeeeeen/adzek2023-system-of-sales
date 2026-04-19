"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    setLoading(false);
    if (signUpError) {
      setError("Не удалось создать аккаунт. Проверьте данные и повторите.");
      return;
    }

    setSuccess("Аккаунт создан. Теперь войдите в систему.");
    setTimeout(() => {
      window.location.href = "/login";
    }, 1200);
  }

  return (
    <Card className="w-full max-w-md border-slate-200 bg-white/95 shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Регистрация</CardTitle>
        <p className="text-sm text-slate-600">
          Создайте доступ к CRM для ежедневной работы с клиентами.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Имя</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Emin"
              required
            />
          </div>
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Создание..." : "Создать аккаунт"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-medium text-teal-700 hover:underline">
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isSafeNextPath(value: string | null) {
  return Boolean(value && value.startsWith("/"));
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = request.nextUrl.searchParams.get("next");

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/auth/confirmed";
  redirectUrl.search = "";

  if (!tokenHash || !type) {
    redirectUrl.searchParams.set("status", "error");
    redirectUrl.searchParams.set("reason", "missing_token");
    return NextResponse.redirect(redirectUrl);
  }

  if (isSafeNextPath(next)) {
    redirectUrl.searchParams.set("next", next!);
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) {
      redirectUrl.searchParams.set("status", "error");
      redirectUrl.searchParams.set("reason", error.message);
      return NextResponse.redirect(redirectUrl);
    }

    redirectUrl.searchParams.set("status", "success");
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    redirectUrl.searchParams.set("status", "error");
    redirectUrl.searchParams.set(
      "reason",
      error instanceof Error ? error.message : "unknown_error"
    );
    return NextResponse.redirect(redirectUrl);
  }
}


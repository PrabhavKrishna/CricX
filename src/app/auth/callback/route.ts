import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const errorName = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  console.log("=== OAuth Callback Received ===");

  if (errorName || errorDescription) {
    const msg = errorDescription || errorName || "Unknown OAuth error";
    console.error("OAuth Error from Provider:", msg);
    return NextResponse.redirect(`${origin}/auth/login?error=OAuth-failed&message=${encodeURIComponent(msg)}`);
  }

  if (code) {
    console.log("Exchanging code for session...");
    const supabase = await createClient();

    // Handle case where Supabase client is not available
    if (!supabase) {
      console.error("Supabase client not available");
      return NextResponse.redirect(`${origin}/auth/login?error=OAuth-failed&message=Service+unavailable`);
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      console.log("Success! Redirecting to dashboard.");
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Auth Exchange Error:", error.message);
    return NextResponse.redirect(`${origin}/auth/login?error=OAuth-failed&message=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/auth/login?error=OAuth-failed&message=No+code+received`);
}

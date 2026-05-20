"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleGoogleLogin = async () => {
    alert("Google button clicked - starting auth...");
    console.log("Google login clicked");
    setError("");
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError("Google sign-in failed. Please try again.");
      }
    } catch (e) {
      console.error("Google login error:", e);
      setError("Google sign-in failed. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="w-full">
      {/* Logo */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-[#10B981] flex items-center justify-center">
          <span className="text-2xl">🏏</span>
        </div>
        <span className="text-2xl font-bold text-[#F1F5F9]">CricX</span>
      </div>

      {/* Card */}
      <div className="bg-[#1A1D27] border border-[#2D3748] rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-[#F1F5F9] mb-2">Welcome back</h1>
        <p className="text-sm text-[#64748B] mb-8">Sign in to continue scoring</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="input-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="input-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg px-4 py-3 text-sm text-[#EF4444]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2D3748]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#1A1D27] text-[#64748B]">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { console.log("clicked"); handleGoogleLogin(); }}
            disabled={loading}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-white text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer relative z-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[#64748B]">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-[#10B981] hover:text-[#34D399] font-semibold">
            Sign up free
          </Link>
        </div>
      </div>

      {/* Demo credentials */}
      <div className="mt-6 bg-[#232738] border border-[#2D3748] rounded-xl p-4">
        <p className="text-xs text-[#64748B] mb-2 text-center">Demo credentials (for testing)</p>
        <div className="flex flex-col gap-1 text-xs text-[#64748B]">
          <div className="flex justify-between">
            <span>Email:</span>
            <span className="font-mono text-[#94A3B8]">demo@cricx.app</span>
          </div>
          <div className="flex justify-between">
            <span>Password:</span>
            <span className="font-mono text-[#94A3B8]">demo1234</span>
          </div>
        </div>
      </div>
    </div>
  );
}
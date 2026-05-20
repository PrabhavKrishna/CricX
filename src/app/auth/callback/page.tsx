"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Callback() {
  const router = useRouter();
  const [message, setMessage] = useState("Processing...");

  useEffect(() => {
    // Get tokens from URL hash (implicit flow)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    console.log("=== OAuth Callback ===");
    console.log("Access token in hash:", !!accessToken);

    if (accessToken) {
      // Store tokens in localStorage
      localStorage.setItem("sb-access-token", accessToken);
      localStorage.setItem("sb-refresh-token", refreshToken || "");
      
      // Store in cookies for server-side
      document.cookie = `sb-access-token=${accessToken}; path=/; max-age=3600; SameSite=Lax`;
      if (refreshToken) {
        document.cookie = `sb-refresh-token=${refreshToken}; path=/; max-age=3600; SameSite=Lax`;
      }
      
      // Also set session storage for extra persistence
      sessionStorage.setItem("sb-access-token", accessToken);
      sessionStorage.setItem("sb-refresh-token", refreshToken || "");
      
      console.log("Tokens stored in localStorage and cookies");
      console.log("Cookies now:", document.cookie);
      
      setMessage("Signed in! Redirecting...");
      
      // Full reload to let app reinitialize
      setTimeout(() => window.location.href = "/", 1000);
      return;
    }

    // No tokens - redirect to login
    console.log("No token found in hash");
    setMessage("No token found. Redirecting...");
    setTimeout(() => router.push("/auth/login"), 2000);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#F1F5F9]">{message}</p>
      </div>
    </div>
  );
}
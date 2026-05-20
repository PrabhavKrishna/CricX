import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — CricX",
  description: "Sign in to your CricX account",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
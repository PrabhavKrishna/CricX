import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import DashboardNav from "@/components/dashboard/dashboard-nav";
import { PageTransition } from "@/components/ui/page-transition";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-[#0F1117] flex">
      <DashboardNav />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
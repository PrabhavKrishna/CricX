import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

export default async function RulesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rules } = await supabase
    .from("custom_rules")
    .select("*")
    .eq("created_by", user?.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#F1F5F9]">My Rules</h1>
        <Link href="/dashboard/create/rule" className="btn btn-primary">Create Rule</Link>
      </div>

      {rules && rules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((r: any) => (
            <div key={r.id} className="card">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl mr-2">{r.icon}</div>
                <div>
                  <div className="font-semibold text-[#F1F5F9]">{r.name}</div>
                  <div className="text-sm text-[#64748B]">{r.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">⚡</div>
          <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">No custom rules</h3>
          <p className="text-[#64748B] mb-6">Create rules to modify scoring dynamically</p>
          <Link href="/dashboard/create/rule" className="btn btn-primary">Create Rule</Link>
        </div>
      )}
    </div>
  );
}

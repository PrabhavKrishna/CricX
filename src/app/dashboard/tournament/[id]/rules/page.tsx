import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

export default async function TournamentRulesPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { id } = params;

  const { data: rules } = await supabase
    .from("tournament_rules")
    .select("*")
    .eq("tournament_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#F1F5F9]">Tournament Rules</h1>
        <Link href={`/dashboard/tournament/${id}/rules/create`} className="btn btn-primary">Add Rule</Link>
      </div>

      {rules && rules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((r: any) => (
            <div key={r.id} className="card">
              <div className="font-semibold text-[#F1F5F9]">{r.name}</div>
              <div className="text-sm text-[#64748B]">{JSON.stringify(r.config)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-8">No rules yet</div>
      )}
    </div>
  );
}

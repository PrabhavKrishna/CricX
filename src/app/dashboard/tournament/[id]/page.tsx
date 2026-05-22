import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

export default async function TournamentPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { id } = params;

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  const { data: rules } = await supabase
    .from("tournament_rules")
    .select("*")
    .eq("tournament_id", id)
    .order("created_at", { ascending: false });

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <p className="text-[#64748B]">Tournament not found</p>
        <Link href="/dashboard" className="text-[#10B981] mt-4 inline-block">← Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F1F5F9]">{tournament.name}</h1>
          <div className="text-sm text-[#64748B]">{tournament.description}</div>
        </div>
        <Link href={`/dashboard/tournament/${id}/rules`} className="btn btn-ghost">Manage Rules</Link>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#F1F5F9]">Tournament Rules</h2>
        {rules && rules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {rules.map((r: any) => (
              <div key={r.id} className="card">
                <div className="font-semibold text-[#F1F5F9]">{r.name}</div>
                <div className="text-sm text-[#64748B]">{r.description}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8 mt-4">
            <p className="text-[#64748B]">No tournament-specific rules yet.</p>
            <Link href={`/dashboard/tournament/${id}/rules/create`} className="btn btn-primary mt-4">Add Rule</Link>
          </div>
        )}
      </div>
    </div>
  );
}

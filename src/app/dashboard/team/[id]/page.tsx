import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import type { Team, Player } from "@/types";

export default async function TeamPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { id } = params;

  const { data: team } = await supabase
    .from("teams")
    .select(`*, players (*)`)
    .eq("id", id)
    .single();

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-[#64748B]">Team not found</p>
        <Link href="/dashboard" className="text-[#10B981] mt-4 inline-block">← Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F1F5F9]">{team.name}</h1>
          <div className="text-sm text-[#64748B]">{team.players?.length || 0} players</div>
        </div>
        <Link href={`/dashboard/team/${team.id}/edit`} className="btn btn-ghost">Edit Team</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(team.players || []).map((p: Player) => (
          <div key={p.id} className="card">
            <div className="text-xl font-bold">{p.name}</div>
            <div className="text-sm text-[#64748B]">{p.batting_style || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

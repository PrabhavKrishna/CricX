import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { CricketBallIcon, PlusIcon } from "@/components/ui/icons";

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: matches } = await supabase
    .from("matches")
    .select(`
      *,
      match_teams (
        team_id,
        team:teams (name, color)
      ),
      custom_rules (count)
    `)
    .eq("created_by", user?.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#F1F5F9]">Matches</h1>
        <Link href="/dashboard/create/match" className="btn btn-primary">
          <PlusIcon className="w-4 h-4" />
          New Match
        </Link>
      </div>

      {matches && matches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((match: any) => (
            <Link
              key={match.id}
              href={`/dashboard/match/${match.id}`}
              className="card flex items-center justify-between hover:border-[#3D4758] transition-all"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                    match.status === "live"
                      ? "bg-[#10B981]/20"
                      : match.status === "completed"
                      ? "bg-[#8B5CF6]/20"
                      : "bg-[#232738]"
                  }`}
                >
                  🏏
                </div>
                <div>
                  <h3 className="font-semibold text-[#F1F5F9]">{match.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-[#64748B]">
                    <span
                      className={`badge ${
                        match.status === "live"
                          ? "badge-primary"
                          : match.status === "completed"
                          ? "badge-accent"
                          : "badge-secondary"
                      }`}
                    >
                      {match.status}
                    </span>
                    <span>{match.overs_limit} overs</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono text-[#64748B]">{match.format}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">🏏</div>
          <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">No matches yet</h3>
          <p className="text-[#64748B] mb-6">Create your first match to start scoring</p>
           <Link href="/dashboard/create/match" className="btn btn-primary">
            <PlusIcon className="w-4 h-4" />
            Create Match
          </Link>
        </div>
      )}
    </div>
  );
}

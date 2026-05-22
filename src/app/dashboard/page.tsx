import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { PlusIcon, CricketBallIcon, TrophyIcon } from "@/components/ui/icons";

type TeamWithPlayerCount = {
  id: string;
  name: string;
  color: string;
  players?: { count: number }[];
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // Handle case where Supabase client is not available (e.g., during build time)
  if (!supabase) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#F1F5F9]">Dashboard</h1>
            <p className="text-[#64748B] mt-1">Welcome back — ready to score?</p>
          </div>
          <Link href="/create/match" className="btn btn-primary">
            <PlusIcon className="w-4 h-4" />
            New Match
          </Link>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: "Matches", value: 0, icon: CricketBallIcon, color: "text-[#10B981]" },
            { label: "Teams", value: 0, icon: TrophyIcon, color: "text-[#F59E0B]" },
            { label: "Custom Rules", value: 0, icon: TrophyIcon, color: "text-[#8B5CF6]" },
          ].map((stat) => (
            <div key={stat.label} className="card">
              <div className={`w-10 h-10 rounded-xl bg-[#232738] ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="text-3xl font-bold text-[#F1F5F9]">{stat.value}</div>
              <div className="text-sm text-[#64748B]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/create/match" className="card p-6 hover:border-[#10B981]/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#10B981]/10 flex items-center justify-center mb-4 group-hover:bg-[#10B981]/20 transition-colors">
              <CricketBallIcon className="w-6 h-6 text-[#10B981]" />
            </div>
            <h3 className="text-lg font-semibold text-[#F1F5F9] mb-1">Create Match</h3>
            <p className="text-sm text-[#64748B]">Start a new cricket match with custom rules</p>
          </Link>

          <Link href="/create/team" className="card p-6 hover:border-[#F59E0B]/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center mb-4 group-hover:bg-[#F59E0B]/20 transition-colors">
              <TrophyIcon className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <h3 className="text-lg font-semibold text-[#F1F5F9] mb-1">Build a Team</h3>
            <p className="text-sm text-[#64748B]">Create a team with players and stats</p>
          </Link>

          <Link href="/create/rule" className="card p-6 hover:border-[#8B5CF6]/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center mb-4 group-hover:bg-[#8B5CF6]/20 transition-colors">
              <TrophyIcon className="w-6 h-6 text-[#8B5CF6]" />
            </div>
            <h3 className="text-lg font-semibold text-[#F1F5F9] mb-1">Create a Rule</h3>
            <p className="text-sm text-[#64748B]">Design a custom scoring rule for your matches</p>
          </Link>
        </div>

        {/* Recent matches */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#F1F5F9]">Recent Matches</h2>
            <Link href="/dashboard/matches" className="text-sm text-[#10B981] hover:text-[#34D399]">
              View all →
            </Link>
          </div>

          <div className="card text-center py-12">
            <div className="text-4xl mb-4">🏏</div>
            <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">No matches yet</h3>
            <p className="text-[#64748B] mb-6">Create your first match to start scoring</p>
            <Link href="/create/match" className="btn btn-primary">
              <PlusIcon className="w-4 h-4" />
              Create Match
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch recent matches and teams
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
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: teams } = await supabase
    .from("teams")
    .select("*, players (count)")
    .eq("owner_id", user?.id)
    .limit(3);

  const stats = {
    matches: matches?.length || 0,
    teams: teams?.length || 0,
    rules: matches?.reduce((acc, m) => acc + (m.custom_rules?.[0]?.count || 0), 0) || 0,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F1F5F9]">Dashboard</h1>
          <p className="text-[#64748B] mt-1">Welcome back — ready to score?</p>
        </div>
        <Link href="/create/match" className="btn btn-primary">
          <PlusIcon className="w-4 h-4" />
          New Match
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: "Matches", value: stats.matches, icon: CricketBallIcon, color: "text-[#10B981]" },
          { label: "Teams", value: stats.teams, icon: TrophyIcon, color: "text-[#F59E0B]" },
          { label: "Custom Rules", value: stats.rules, icon: TrophyIcon, color: "text-[#8B5CF6]" },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <div className={`w-10 h-10 rounded-xl bg-[#232738] ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="text-3xl font-bold text-[#F1F5F9]">{stat.value}</div>
            <div className="text-sm text-[#64748B]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/create/match" className="card p-6 hover:border-[#10B981]/50 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-[#10B981]/10 flex items-center justify-center mb-4 group-hover:bg-[#10B981]/20 transition-colors">
            <CricketBallIcon className="w-6 h-6 text-[#10B981]" />
          </div>
          <h3 className="text-lg font-semibold text-[#F1F5F9] mb-1">Create Match</h3>
          <p className="text-sm text-[#64748B]">Start a new cricket match with custom rules</p>
        </Link>

        <Link href="/create/team" className="card p-6 hover:border-[#F59E0B]/50 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center mb-4 group-hover:bg-[#F59E0B]/20 transition-colors">
            <TrophyIcon className="w-6 h-6 text-[#F59E0B]" />
          </div>
          <h3 className="text-lg font-semibold text-[#F1F5F9] mb-1">Build a Team</h3>
          <p className="text-sm text-[#64748B]">Create a team with players and stats</p>
        </Link>

        <Link href="/create/rule" className="card p-6 hover:border-[#8B5CF6]/50 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center mb-4 group-hover:bg-[#8B5CF6]/20 transition-colors">
            <TrophyIcon className="w-6 h-6 text-[#8B5CF6]" />
          </div>
          <h3 className="text-lg font-semibold text-[#F1F5F9] mb-1">Create a Rule</h3>
          <p className="text-sm text-[#64748B]">Design a custom scoring rule for your matches</p>
        </Link>
      </div>

      {/* Recent matches */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#F1F5F9]">Recent Matches</h2>
          <Link href="/dashboard/matches" className="text-sm text-[#10B981] hover:text-[#34D399]">
            View all →
          </Link>
        </div>

        {matches && matches.length > 0 ? (
          <div className="space-y-3">
            {matches.map((match) => (
              <Link
                key={match.id}
                href={`/match/${match.id}`}
                className="card flex items-center justify-between hover:border-[#3D4758] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                    match.status === "live" ? "bg-[#10B981]/20" : match.status === "completed" ? "bg-[#8B5CF6]/20" : "bg-[#232738]"
                  }`}>
                    🏏
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#F1F5F9]">{match.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-[#64748B]">
                      <span className={`badge ${
                        match.status === "live" ? "badge-primary" : match.status === "completed" ? "badge-accent" : "badge-secondary"
                      }`}>
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
            <Link href="/create/match" className="btn btn-primary">
              <PlusIcon className="w-4 h-4" />
              Create Match
            </Link>
          </div>
        )}
      </div>

      {/* Recent teams */}
      {teams && teams.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#F1F5F9]">Your Teams</h2>
            <Link href="/dashboard/teams" className="text-sm text-[#10B981] hover:text-[#34D399]">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {teams.map((team: TeamWithPlayerCount) => (
              <Link
                key={team.id}
                href={`/team/${team.id}`}
                className="card hover:border-[#3D4758] transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full"
                    style={{ backgroundColor: team.color || "#10B981" }}
                  />
                  <h3 className="font-semibold text-[#F1F5F9] truncate">{team.name}</h3>
                </div>
                <div className="text-sm text-[#64748B]">
                  {team.players?.[0]?.count || 0} players
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
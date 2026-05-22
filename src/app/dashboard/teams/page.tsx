import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { PlusIcon } from "@/components/ui/icons";

export default async function TeamsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: teams } = await supabase
    .from("teams")
    .select(`*, players (count)`)
    .eq("owner_id", user?.id)
    .order("name");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#F1F5F9]">Teams</h1>
        <Link href="/dashboard/create/team" className="btn btn-primary">
          <PlusIcon className="w-4 h-4" />
          New Team
        </Link>
      </div>

      {teams && teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {teams.map((team: any) => (
            <Link key={team.id} href={`/dashboard/team/${team.id}`} className="card hover:border-[#3D4758] transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full" style={{ backgroundColor: team.color || "#10B981" }} />
                <h3 className="font-semibold text-[#F1F5F9] truncate">{team.name}</h3>
              </div>
              <div className="text-sm text-[#64748B]">{team.players?.[0]?.count || 0} players</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">No teams yet</h3>
          <p className="text-[#64748B] mb-6">Create a team to add players and start competing</p>
           <Link href="/dashboard/create/team" className="btn btn-primary">
            <PlusIcon className="w-4 h-4" />
            Create Team
          </Link>
        </div>
      )}
    </div>
  );
}

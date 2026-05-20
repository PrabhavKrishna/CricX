"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";

export default function CreateTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState({
    name: "",
    color: "#10B981",
    is_public: false,
  });
  const [players, setPlayers] = useState<{ name: string; batting_style: string; bowling_style: string }[]>([
    { name: "", batting_style: "RHB", bowling_style: "" },
  ]);

  const addPlayer = () => {
    setPlayers([...players, { name: "", batting_style: "RHB", bowling_style: "" }]);
  };

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const updatePlayer = (index: number, updates: Partial<typeof players[0]>) => {
    const newPlayers = [...players];
    newPlayers[index] = { ...newPlayers[index], ...updates };
    setPlayers(newPlayers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team.name) return;

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: newTeam, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: team.name,
        color: team.color,
        is_public: team.is_public,
        owner_id: user.id,
      })
      .select()
      .single();

    if (teamError || !newTeam) {
      setLoading(false);
      return;
    }

    const validPlayers = players.filter((p) => p.name.trim());
    if (validPlayers.length > 0) {
      await supabase.from("players").insert(
        validPlayers.map((p) => ({
          ...p,
          team_id: newTeam.id,
        }))
      );
    }

    router.push("/dashboard/teams");
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#F1F5F9]">Create Team</h1>
        <p className="text-[#64748B] mt-1">Build your team roster with players</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Team details */}
        <div className="card">
          <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Team Info</h2>
          <div className="space-y-4">
            <div>
              <label className="input-label">Team Name *</label>
              <input
                type="text"
                value={team.name}
                onChange={(e) => setTeam({ ...team, name: e.target.value })}
                className="input"
                placeholder="Mumbai Strikers"
                required
              />
            </div>
            <div>
              <label className="input-label">Team Color</label>
              <div className="flex items-center gap-3">
                {["#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#3B82F6", "#EC4899"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTeam({ ...team, color })}
                    className={`w-10 h-10 rounded-full transition-all ${
                      team.color === color ? "ring-2 ring-offset-2 ring-offset-[#1A1D27] scale-110" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={team.is_public}
                onChange={(e) => setTeam({ ...team, is_public: e.target.checked })}
                className="w-5 h-5 rounded border-[#2D3748] bg-[#232738] accent-[#10B981]"
              />
              <div>
                <div className="text-[#F1F5F9] font-medium">Public Team</div>
                <div className="text-sm text-[#64748B]">Others can discover and follow</div>
              </div>
            </label>
          </div>
        </div>

        {/* Players */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#F1F5F9]">Players ({players.length})</h2>
            <button type="button" onClick={addPlayer} className="btn btn-secondary text-sm py-2">
              <PlusIcon className="w-4 h-4" />
              Add Player
            </button>
          </div>

          <div className="space-y-3">
            {players.map((player, index) => (
              <div key={index} className="flex items-center gap-3 p-4 bg-[#232738] rounded-xl">
                <span className="text-xs text-[#64748B] w-6">{index + 1}</span>
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => updatePlayer(index, { name: e.target.value })}
                  className="input py-2 flex-1"
                  placeholder="Player name"
                />
                <select
                  value={player.batting_style}
                  onChange={(e) => updatePlayer(index, { batting_style: e.target.value })}
                  className="input py-2 w-24"
                >
                  <option value="RHB">RHB</option>
                  <option value="LHB">LHB</option>
                </select>
                <input
                  type="text"
                  value={player.bowling_style}
                  onChange={(e) => updatePlayer(index, { bowling_style: e.target.value })}
                  className="input py-2 w-32"
                  placeholder="Bowling style"
                />
                <button
                  type="button"
                  onClick={() => removePlayer(index)}
                  className="p-2 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full py-4 text-base disabled:opacity-50"
        >
          {loading ? "Creating Team..." : "Create Team →"}
        </button>
      </form>
    </div>
  );
}
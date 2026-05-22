"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { TrophyIcon, UsersIcon, ShieldIcon, PlusIcon } from "@/components/ui/icons";
import { BulkPlayerManager } from "@/components/team/bulk-player-manager";

export default function CreateTeamPage() {
  const router = useRouter();
  const searchParams = useSearchParams ? useSearchParams() : null;
  const tournamentId = searchParams?.get("tournamentId");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [teamData, setTeamData] = useState({
    name: "",
    color: "#10B981",
    is_public: true,
  });
  const [teamId, setTeamId] = useState<string | null>(null);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("teams")
      .insert({
        ...teamData,
        owner_id: user.id,
        tournament_id: tournamentId || null,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else {
      setTeamId(data.id);
      setStep(2);
      setLoading(false);
    }
  };

  const handleSavePlayers = async (players: any[]) => {
    if (!teamId) return;
    setLoading(true);

    const supabase = createClient();
    const playersToInsert = players.map(p => ({
      ...p,
      team_id: teamId,
    }));

    const { error: playerError } = await supabase
      .from("players")
      .insert(playersToInsert);

    if (playerError) {
      setError(playerError.message);
      setLoading(false);
    } else {
      router.push(`/dashboard/team/${teamId}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-12 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black text-text text-glow-primary mb-3"
        >
          {step === 1 ? "Build Your Squad" : "Recruit Players"}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-text-muted text-lg"
        >
          {step === 1 ? "Define your team's identity and colors." : "Add your championship roster below."}
        </motion.p>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.form
            key="team-form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={handleCreateTeam}
            className="space-y-8"
          >
            <div className="card p-8 border-primary/20 bg-primary/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="input-label">Team Name</label>
                    <input
                      type="text"
                      required
                      value={teamData.name}
                      onChange={(e) => setTeamData({ ...teamData, name: e.target.value })}
                      className="input input-marvelous text-xl font-bold"
                      placeholder="e.g. Mumbai Mavericks"
                    />
                  </div>
                  <div>
                    <label className="input-label">Primary Color</label>
                    <div className="flex gap-3">
                      {["#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899"].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setTeamData({ ...teamData, color: c })}
                          className={`w-10 h-10 rounded-full border-2 transition-all ${teamData.color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center items-center p-6 bg-surface/40 rounded-2xl border border-border/40">
                  <div 
                    className="w-32 h-32 rounded-full mb-4 flex items-center justify-center text-4xl shadow-2xl transition-all duration-500"
                    style={{ backgroundColor: teamData.color, boxShadow: `0 0 40px ${teamData.color}33` }}
                  >
                    {teamData.name ? teamData.name.charAt(0).toUpperCase() : "🏏"}
                  </div>
                  <span className="text-sm font-bold text-text-muted uppercase tracking-widest">Team Preview</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                className={`card cursor-pointer transition-all ${teamData.is_public ? 'border-primary bg-primary/5' : 'border-border'}`}
                onClick={() => setTeamData({ ...teamData, is_public: true })}
              >
                <div className="flex items-center gap-4">
                  <ShieldIcon className={`w-8 h-8 ${teamData.is_public ? 'text-primary' : 'text-text-muted'}`} />
                  <div>
                    <h3 className="font-bold">Public Team</h3>
                    <p className="text-xs text-text-muted">Visible to the community</p>
                  </div>
                </div>
              </div>
              <div 
                className={`card cursor-pointer transition-all ${!teamData.is_public ? 'border-primary bg-primary/5' : 'border-border'}`}
                onClick={() => setTeamData({ ...teamData, is_public: false })}
              >
                <div className="flex items-center gap-4">
                  <ShieldIcon className={`w-8 h-8 ${!teamData.is_public ? 'text-primary' : 'text-text-muted'}`} />
                  <div>
                    <h3 className="font-bold">Private Team</h3>
                    <p className="text-xs text-text-muted">Only you can see this team</p>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full py-5 text-lg">
              {loading ? "Creating Team..." : "Continue to Roster"}
            </button>
          </motion.form>
        ) : (
          <motion.div
            key="player-manager"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <BulkPlayerManager onSave={handleSavePlayers} />
            <button 
            onClick={() => router.push(`/dashboard/team/${teamId}`)}
              className="btn btn-ghost w-full mt-4 text-text-muted"
            >
              Skip for now
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mt-6 p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}

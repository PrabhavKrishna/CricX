"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { 
  CricketBallIcon, 
  PlusIcon, 
  TrophyIcon, 
  CalendarIcon, 
  ShieldIcon,
  ChevronRightIcon
} from "@/components/ui/icons";
import type { Team } from "@/types";

export default function CreateMatchPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [fetchingTeams, setFetchingTeams] = useState(true);
  const [form, setForm] = useState({
    name: "",
    format: "T20" as "T20" | "T10" | "Custom",
    overs_limit: 20,
    venue: "",
    match_date: "",
    is_public: false,
    team1_id: "",
    team2_id: "",
  });

  useEffect(() => {
    const loadTeams = async () => {
      if (!user) return;
      
      setFetchingTeams(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", user.id)
        .order("name");
      
      if (error) {
        console.error("Error loading teams:", error);
      } else if (data) {
        setTeams(data);
      }
      setFetchingTeams(false);
    };

    loadTeams();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.team1_id || !form.team2_id) {
      alert("Please select both teams");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data: match, error } = await supabase
      .from("matches")
      .insert({
        name: form.name,
        format: form.format,
        overs_limit: form.overs_limit,
        venue: form.venue,
        match_date: new Date(form.match_date).toISOString(),
        is_public: form.is_public,
        created_by: user.id,
        status: "upcoming",
      })
      .select()
      .single();

    if (error || !match) {
      console.error("Error creating match:", error);
      setLoading(false);
      return;
    }

    // Insert teams
    const matchTeams = [
      { match_id: match.id, team_id: form.team1_id, batting_order: 1 },
      { match_id: match.id, team_id: form.team2_id, batting_order: 2 }
    ];

    await supabase.from("match_teams").insert(matchTeams);

    router.push(`/match/${match.id}`);
  };

  const formats = [
    { id: "T20", label: "T20 Match", icon: "🏏", overs: 20, desc: "Standard 20 overs" },
    { id: "T10", label: "T10 Blast", icon: "⚡", overs: 10, desc: "Fast-paced 10 overs" },
    { id: "Custom", label: "Custom", icon: "🎯", overs: 5, desc: "Your own limits" },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black text-text text-glow-primary mb-2"
        >
          Initialize Match
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-text-muted text-lg"
        >
          Define the arena and summon the contenders.
        </motion.p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Match Identity */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
              <CricketBallIcon className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-text">Match Identity</h2>
          </div>

          <div className="card bg-primary/5 border-primary/20 p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="input-label">Battle Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input input-marvelous text-xl font-bold"
                  placeholder="e.g. Sunday Night Showdown"
                />
              </div>
              <div>
                <label className="input-label">The Venue</label>
                <input
                  type="text"
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  className="input input-marvelous"
                  placeholder="e.g. Lords Cricket Ground"
                />
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="input-label">Date & Time</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="datetime-local"
                    required
                    value={form.match_date}
                    onChange={(e) => setForm({ ...form, match_date: e.target.value })}
                    className="input input-marvelous pl-12"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface/40 rounded-xl border border-border/40">
                <div>
                  <h4 className="font-bold text-sm">Public Visibility</h4>
                  <p className="text-xs text-text-muted">Broadcast this match to the world</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_public: !form.is_public })}
                  className={`w-14 h-8 rounded-full transition-all relative ${form.is_public ? 'bg-primary' : 'bg-surface-2'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${form.is_public ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* The Format */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent border border-accent/30">
              <ShieldIcon className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-text">Battle Format</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formats.map((fmt) => (
              <div
                key={fmt.id}
                onClick={() => setForm({ ...form, format: fmt.id as any, overs_limit: fmt.overs })}
                className={`card cursor-pointer group transition-all ${form.format === fmt.id ? 'border-accent bg-accent/5' : 'border-border'}`}
              >
                <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center text-2xl transition-all ${form.format === fmt.id ? 'bg-accent text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]' : 'bg-surface-2 text-text-muted group-hover:bg-surface'}`}>
                  {fmt.icon}
                </div>
                <h3 className="font-bold text-lg">{fmt.label}</h3>
                <p className="text-xs text-text-muted">{fmt.desc}</p>
                {form.format === fmt.id && (
                  <motion.div layoutId="format-active" className="absolute top-4 right-4 text-accent">
                    <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_#8B5CF6]" />
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          {form.format === "Custom" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="card bg-accent/5 border-accent/20">
              <label className="input-label text-accent">Overs per Innings</label>
              <input
                type="number"
                min="1"
                max="100"
                value={isNaN(form.overs_limit) ? "" : form.overs_limit}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setForm({ ...form, overs_limit: isNaN(val) ? 0 : val });
                }}
                className="input input-marvelous text-2xl font-black text-accent"
              />
            </motion.div>
          )}
        </section>

        {/* The Contenders */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center text-secondary border border-secondary/30">
              <TrophyIcon className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-text">The Contenders</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {/* Team 1 */}
            <div className="space-y-4">
              <label className="input-label">Squad Alpha (Batting First)</label>
              <div className="relative">
                <select
                  required
                  value={form.team1_id}
                  onChange={(e) => setForm({ ...form, team1_id: e.target.value })}
                  className="input input-marvelous appearance-none h-16 text-lg font-bold pr-12"
                >
                  <option value="">Select Squad Alpha</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-6 h-6 rounded-full bg-surface-2 flex items-center justify-center text-text-muted">
                    ▼
                  </div>
                </div>
              </div>
              {form.team1_id && (
                <div className="flex items-center gap-3 p-3 bg-surface/30 rounded-xl border border-border/20">
                   <div 
                    className="w-10 h-10 rounded-full" 
                    style={{ backgroundColor: teams.find(t => t.id === form.team1_id)?.color }} 
                  />
                  <span className="font-bold">Active Roster Confirmed</span>
                </div>
              )}
            </div>

            {/* VS Divider */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-12 h-12 rounded-full bg-surface-2 border-2 border-border flex items-center justify-center font-black text-text-muted italic shadow-2xl">
                VS
              </div>
            </div>

            {/* Team 2 */}
            <div className="space-y-4">
              <label className="input-label">Squad Omega (Bowling First)</label>
              <div className="relative">
                <select
                  required
                  value={form.team2_id}
                  onChange={(e) => setForm({ ...form, team2_id: e.target.value })}
                  className="input input-marvelous appearance-none h-16 text-lg font-bold pr-12"
                >
                  <option value="">Select Squad Omega</option>
                  {teams
                    .filter(t => t.id !== form.team1_id)
                    .map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-6 h-6 rounded-full bg-surface-2 flex items-center justify-center text-text-muted">
                    ▼
                  </div>
                </div>
              </div>
              {form.team2_id && (
                <div className="flex items-center gap-3 p-3 bg-surface/30 rounded-xl border border-border/20">
                   <div 
                    className="w-10 h-10 rounded-full" 
                    style={{ backgroundColor: teams.find(t => t.id === form.team2_id)?.color }} 
                  />
                  <span className="font-bold">Active Roster Confirmed</span>
                </div>
              )}
            </div>
          </div>

          {!fetchingTeams && teams.length === 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card border-secondary/30 bg-secondary/5 text-center py-8">
              <h3 className="text-xl font-bold text-secondary mb-2">No Squads Found</h3>
              <p className="text-text-muted mb-6">You must create at least two squads to initiate a match.</p>
              <Link href="/create/team" className="btn btn-secondary border-secondary/40 hover:border-secondary">
                <PlusIcon className="w-4 h-4 mr-2" />
                Build a Squad
              </Link>
            </motion.div>
          )}

          {fetchingTeams && (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          )}
        </section>

        {/* Submit */}
        <div className="pt-8">
          <button
            type="submit"
            disabled={loading || teams.length < 2}
            className="btn btn-primary w-full py-6 text-xl shadow-[0_0_30px_rgba(16,185,129,0.2)]"
          >
            {loading ? (
              <span className="flex items-center gap-3">
                <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
                Initializing Arena...
              </span>
            ) : (
              <span className="flex items-center gap-3">
                Commence Battle
                <ChevronRightIcon className="w-6 h-6" />
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

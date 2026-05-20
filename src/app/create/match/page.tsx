"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Team } from "@/types";

export default function CreateMatchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [form, setForm] = useState({
    name: "",
    format: "T20",
    overs_limit: 20,
    venue: "",
    match_date: "",
    is_public: false,
    team1_id: "",
    team2_id: "",
  });

  useEffect(() => {
    const loadTeams = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from("teams")
          .select("*")
          .eq("owner_id", user.id)
          .order("name");
        
        if (data) setTeams(data);
      }
    };
    loadTeams();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();

    const { data: match, error } = await supabase
      .from("matches")
      .insert({
        name: form.name,
        format: form.format,
        overs_limit: form.overs_limit,
        venue: form.venue,
        match_date: new Date(form.match_date).toISOString(),
        is_public: form.is_public,
        created_by: user?.id,
        status: "upcoming",
      })
      .select()
      .single();

    if (error || !match) {
      setLoading(false);
      return;
    }

    if (form.team1_id) {
      await supabase.from("match_teams").insert({
        match_id: match.id,
        team_id: form.team1_id,
        batting_order: 1,
      });
    }

    if (form.team2_id && form.team2_id !== form.team1_id) {
      await supabase.from("match_teams").insert({
        match_id: match.id,
        team_id: form.team2_id,
        batting_order: 2,
      });
    }

    router.push(`/match/${match.id}`);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#F1F5F9]">Create New Match</h1>
        <p className="text-[#64748B] mt-1">Set up your match details and teams</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Match name */}
        <div className="card">
          <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Match Info</h2>
          <div className="space-y-4">
            <div>
              <label className="input-label">Match Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="Sunday League Final"
                required
              />
            </div>

            <div>
              <label className="input-label">Venue</label>
              <input
                type="text"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                className="input"
                placeholder="City Cricket Ground"
              />
            </div>

            <div>
              <label className="input-label">Date & Time</label>
              <input
                type="datetime-local"
                value={form.match_date}
                onChange={(e) => setForm({ ...form, match_date: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>
        </div>

        {/* Format */}
        <div className="card">
          <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Format</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {["T20", "T10", "Custom"].map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => {
                  setForm({
                    ...form,
                    format: fmt,
                    overs_limit: fmt === "T20" ? 20 : fmt === "T10" ? 10 : form.overs_limit,
                  });
                }}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  form.format === fmt
                    ? "border-[#10B981] bg-[#10B981]/10 text-[#10B981]"
                    : "border-[#2D3748] text-[#64748B] hover:border-[#3D4758]"
                }`}
              >
                <div className="text-2xl mb-1">
                  {fmt === "T20" ? "🏏" : fmt === "T10" ? "⚡" : "🎯"}
                </div>
                <div className="font-semibold">{fmt}</div>
              </button>
            ))}
          </div>

          <div>
            <label className="input-label">Overs Limit</label>
            <input
              type="number"
              min="1"
              max="50"
              value={form.overs_limit}
              onChange={(e) => setForm({ ...form, overs_limit: parseInt(e.target.value) })}
              className="input"
            />
          </div>
        </div>

        {/* Teams */}
        <div className="card">
          <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Teams</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Team 1 (Batting First)</label>
              <select
                value={form.team1_id}
                onChange={(e) => setForm({ ...form, team1_id: e.target.value })}
                className="input"
              >
                <option value="">Select team...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <Link href="/create/team" className="text-xs text-[#10B981] hover:underline mt-2 inline-block">
                + Create new team
              </Link>
            </div>
            <div>
              <label className="input-label">Team 2</label>
              <select
                value={form.team2_id}
                onChange={(e) => setForm({ ...form, team2_id: e.target.value })}
                className="input"
              >
                <option value="">Select team...</option>
                {teams
                  .filter((t) => t.id !== form.team1_id)
                  .map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          {teams.length === 0 && (
            <div className="mt-4 p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl">
              <p className="text-sm text-[#F59E0B]">
                You need to create teams before creating a match.{" "}
                <Link href="/create/team" className="underline font-semibold">
                  Create a team now
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Visibility */}
        <div className="card">
          <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Visibility</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
              className="w-5 h-5 rounded border-[#2D3748] bg-[#232738] accent-[#10B981]"
            />
            <div>
              <div className="text-[#F1F5F9] font-medium">Public Match</div>
              <div className="text-sm text-[#64748B]">Anyone can discover and follow this match</div>
            </div>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full py-4 text-base disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Match →"}
        </button>
      </form>
    </div>
  );
}
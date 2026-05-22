"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function CreateTournamentRule({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const tournamentId = params.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/auth/login");

    const { error } = await supabase.from("tournament_rules").insert({
      tournament_id: tournamentId,
      name,
      description,
      config: {},
      created_at: new Date().toISOString(),
    });

    setLoading(false);
    if (!error) {
      router.push(`/dashboard/tournament/${tournamentId}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <label className="input-label">Rule Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" required />
      </div>
      <div>
        <label className="input-label">Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Rule'}</button>
    </form>
  );
}

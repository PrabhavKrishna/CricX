"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { TrophyIcon, CalendarIcon, UsersIcon, ShieldIcon } from "@/components/ui/icons";

export default function CreateTournamentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    is_public: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
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
      .from("tournaments")
      .insert({
        ...formData,
        created_by: user.id,
        status: "upcoming",
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else {
      router.push(`/tournament/${data.id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-text text-glow-primary mb-2">Host Tournament</h1>
        <p className="text-text-muted text-lg">Create a legendary championship with custom rules.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="card border-primary/20 bg-primary/5 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
              <TrophyIcon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-text">Tournament Details</h2>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="input-label">Tournament Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input input-marvelous text-lg font-semibold"
                placeholder="e.g. Summer Premier League 2026"
              />
            </div>

            <div>
              <label className="input-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input input-marvelous min-h-[100px]"
                placeholder="Tell players about the format, prizes, and rules..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="input-label">Start Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input input-marvelous pl-12"
                  />
                </div>
              </div>
              <div>
                <label className="input-label">End Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="input input-marvelous pl-12"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div 
            className={`card cursor-pointer transition-all ${formData.is_public ? 'border-primary bg-primary/5' : 'border-border'}`}
            onClick={() => setFormData({ ...formData, is_public: true })}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.is_public ? 'bg-primary text-black' : 'bg-surface text-text-muted'}`}>
                <ShieldIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">Public Tournament</h3>
                <p className="text-xs text-text-muted">Anyone can discover and join</p>
              </div>
            </div>
          </div>

          <div 
            className={`card cursor-pointer transition-all ${!formData.is_public ? 'border-primary bg-primary/5' : 'border-border'}`}
            onClick={() => setFormData({ ...formData, is_public: false })}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!formData.is_public ? 'bg-primary text-black' : 'bg-surface text-text-muted'}`}>
                <ShieldIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">Invite Only</h3>
                <p className="text-xs text-text-muted">Private link required to join</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 p-4 rounded-xl text-danger text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full py-5 text-lg shadow-xl shadow-primary/20"
        >
          {loading ? "Creating Championship..." : "Initialize Tournament"}
        </button>
      </form>
    </div>
  );
}

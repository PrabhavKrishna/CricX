"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useMatchStore } from "@/store/match-store";
import { ScorerPanel } from "@/components/scorer/scorer-panel";
import Link from "next/link";
import { ChevronRightIcon, PlayIcon } from "@/components/ui/icons";
import type { Match, CustomRule, Team, Player, Innings } from "@/types";

type MatchWithExtras = Match & {
  custom_rules?: CustomRule[];
  innings?: Innings[];
};

type TeamWithPlayers = Team & {
  players?: Player[];
};

export default function MatchScoringPage() {
  const params = useParams();
  const matchId = params.id as string;
  const [match, setMatch] = useState<MatchWithExtras | null>(null);
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [customRules, setCustomRules] = useState<CustomRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"scoring" | "scorecard">("scoring");
  const [currentInnings, setCurrentInnings] = useState<Innings | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const { initMatch, setInningsId } = useMatchStore();

  const loadMatch = async () => {
    const supabase = createClient();

    const { data: matchData } = await supabase
      .from("matches")
      .select(`
        *,
        custom_rules (*),
        innings (*)
      `)
      .eq("id", matchId)
      .single();

    if (matchData) {
      setMatch(matchData);
      setCustomRules(matchData.custom_rules || []);

      if (matchData.innings && matchData.innings.length > 0) {
        setCurrentInnings(matchData.innings[0] as Innings);
        setInningsId((matchData.innings[0] as Innings).id);
      }

      const { data: matchTeams } = await supabase
        .from("match_teams")
        .select(`
          *,
          team:teams (
            *,
            players (*)
          )
        `)
        .eq("match_id", matchId);

      if (matchTeams) {
        const teamsWithPlayers = matchTeams.map((mt: { team: TeamWithPlayers }) => mt.team as TeamWithPlayers);
        setTeams(teamsWithPlayers);

        initMatch(matchData, teamsWithPlayers as TeamWithPlayers[], matchData.custom_rules || []);
        
        if (matchData.status === "upcoming") {
          setShowSetup(true);
        }
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadMatch();
  }, [matchId]);

  const startMatch = async () => {
    const supabase = createClient();
    
    const battingTeam = teams[0];
    const innings = {
      match_id: matchId,
      batting_team_id: battingTeam.id,
      innings_number: 1,
      total_runs: 0,
      total_wickets: 0,
      overs_bowled: "0.0",
      is_completed: false,
    };

    const { data: newInnings } = await supabase
      .from("innings")
      .insert(innings)
      .select()
      .single();

    if (newInnings) {
      await supabase
        .from("matches")
        .update({ status: "live" })
        .eq("id", matchId);

      setCurrentInnings(newInnings);
      setInningsId(newInnings.id);
      setShowSetup(false);
      
      loadMatch();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[#64748B]">Loading match...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-20">
        <p className="text-[#64748B]">Match not found</p>
        <Link href="/dashboard" className="text-[#10B981] mt-4 inline-block">← Back to dashboard</Link>
      </div>
    );
  }

  if (showSetup && teams.length > 0) {
    return (
      <MatchSetupScreen
        match={match}
        teams={teams}
        onStart={startMatch}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-[#64748B] mb-1">
            <Link href="/dashboard" className="hover:text-[#F1F5F9]">Dashboard</Link>
            <ChevronRightIcon className="w-3 h-3" />
            <span>Match</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F1F5F9]">{match.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`badge ${match.status === "live" ? "badge-primary" : "badge-secondary"}`}>
              {match.status}
            </span>
            <span className="text-sm text-[#64748B]">{match.overs_limit} overs • {match.format}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#232738] rounded-xl p-1">
          <button
            onClick={() => setActiveTab("scoring")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "scoring"
                ? "bg-[#10B981] text-[#0F1117]"
                : "text-[#64748B] hover:text-[#F1F5F9]"
            }`}
          >
            Scoring
          </button>
          <button
            onClick={() => setActiveTab("scorecard")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "scorecard"
                ? "bg-[#10B981] text-[#0F1117]"
                : "text-[#64748B] hover:text-[#F1F5F9]"
            }`}
          >
            Scorecard
          </button>
        </div>
      </div>

      {/* Custom rules indicator */}
      {customRules.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
          <span className="text-sm text-[#8B5CF6] font-semibold">
            {customRules.length} custom rule{customRules.length > 1 ? "s" : ""} active
          </span>
          <span className="text-xs text-[#8B5CF6]/70 ml-auto">
            Tap special balls panel to see triggered rules
          </span>
        </div>
      )}

      {/* Main content */}
      {activeTab === "scoring" ? (
        <ScorerPanel
          match={match}
          teams={teams}
          customRules={customRules}
          inningsId={currentInnings?.id}
        />
      ) : (
        <ScorecardView teams={teams} matchId={matchId} />
      )}
    </div>
  );
}

function MatchSetupScreen({ 
  match, 
  teams, 
  onStart 
}: { 
  match: Match; 
  teams: TeamWithPlayers[]; 
  onStart: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8 text-center">
        <div className="text-6xl mb-6">🏏</div>
        <h1 className="text-3xl font-bold text-[#F1F5F9] mb-2">Ready to Start?</h1>
        <p className="text-[#64748B] mb-8">
          {match.name} at {match.venue || "TBD"}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {teams.map((team) => (
            <div key={team.id} className="bg-[#232738] rounded-xl p-4">
              <div
                className="w-12 h-12 rounded-full mx-auto mb-3"
                style={{ backgroundColor: team.color || "#10B981" }}
              />
              <h3 className="font-semibold text-[#F1F5F9]">{team.name}</h3>
              <p className="text-xs text-[#64748B] mt-1">
                {team.players?.length || 0} players
              </p>
            </div>
          ))}
        </div>

        {teams.length < 2 && (
          <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-[#F59E0B]">
              You need at least 2 teams to start scoring.{" "}
              <Link href={`/create/match`} className="underline">
                Add teams to this match
              </Link>
            </p>
          </div>
        )}

        <button
          onClick={onStart}
          disabled={teams.length < 2}
          className="btn btn-primary text-lg px-8 py-4 disabled:opacity-50"
        >
          <PlayIcon className="w-5 h-5" />
          Start Match
        </button>
      </div>
    </div>
  );
}

function ScorecardView({ teams, matchId }: { teams: TeamWithPlayers[]; matchId: string }) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Team scores */}
      <div className="grid grid-cols-2 gap-4">
        {teams.map((team, i) => (
          <div key={i} className="card">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full"
                style={{ backgroundColor: team.color || "#10B981" }}
              />
              <div>
                <h3 className="font-semibold text-[#F1F5F9]">{team.name}</h3>
                <span className="text-xs text-[#64748B]">Batting</span>
              </div>
            </div>
            <div className="text-4xl font-mono font-bold text-[#F1F5F9]">
              0<span className="text-2xl text-[#64748B]">-0</span>
            </div>
            <div className="text-sm text-[#64748B] mt-1">0.0 overs</div>
          </div>
        ))}
      </div>

      {/* Batting table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Batting</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#64748B] text-left border-b border-[#2D3748]">
                <th className="pb-3 font-medium">Batsman</th>
                <th className="pb-3 font-medium text-center">Dismissal</th>
                <th className="pb-3 font-medium text-right">R</th>
                <th className="pb-3 font-medium text-right">B</th>
                <th className="pb-3 font-medium text-right">4s</th>
                <th className="pb-3 font-medium text-right">6s</th>
                <th className="pb-3 font-medium text-right">SR</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-row">
                <td className="py-3 text-[#F1F5F9]">
                  <span className="text-[#10B981] mr-2">*</span>
                  Select batsmen
                </td>
                <td className="py-3 text-center text-[#64748B]">—</td>
                <td className="py-3 text-right text-[#F1F5F9] font-mono">0</td>
                <td className="py-3 text-right text-[#64748B] font-mono">0</td>
                <td className="py-3 text-right text-[#64748B] font-mono">0</td>
                <td className="py-3 text-right text-[#64748B] font-mono">0</td>
                <td className="py-3 text-right text-[#64748B] font-mono">0.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bowling table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Bowling</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#64748B] text-left border-b border-[#2D3748]">
                <th className="pb-3 font-medium">Bowler</th>
                <th className="pb-3 font-medium text-right">O</th>
                <th className="pb-3 font-medium text-right">M</th>
                <th className="pb-3 font-medium text-right">R</th>
                <th className="pb-3 font-medium text-right">W</th>
                <th className="pb-3 font-medium text-right">Eco</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-row">
                <td className="py-3 text-[#F1F5F9]">Select bowler</td>
                <td className="py-3 text-right text-[#64748B] font-mono">0</td>
                <td className="py-3 text-right text-[#64748B] font-mono">0</td>
                <td className="py-3 text-right text-[#64748B] font-mono">0</td>
                <td className="py-3 text-right text-[#64748B] font-mono">0</td>
                <td className="py-3 text-right text-[#64748B] font-mono">0.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* NRR Calculator */}
      <div className="card">
        <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">NRR Calculator</h2>
        <div className="grid grid-cols-2 gap-6">
          {teams.map((team, i) => (
            <div key={i} className="bg-[#232738] rounded-xl p-4">
              <div className="text-sm text-[#64748B] mb-1">{team.name}</div>
              <div className="text-2xl font-mono font-bold text-[#F1F5F9]">NRR: 0.00</div>
              <div className="text-xs text-[#64748B] mt-2">Runs: 0 / Overs: 0</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
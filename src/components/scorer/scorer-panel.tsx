"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SwapIcon, UndoIcon, PlusIcon } from "@/components/ui/icons";
import { AnimationOverlay, ScoreAnimate } from "./animations";
import { SpecialBallsPanel } from "./special-balls-panel";
import { BallByBallFeed } from "./ball-by-ball-feed";
import { useMatchStore, evaluateRules } from "@/store/match-store";
import { createClient } from "@/lib/supabase";
import type {
  Ball,
  DismissalType,
  ExtraType,
  Match,
  Team,
  CustomRule,
  Player,
} from "@/types";

interface ScorerPanelProps {
  match: Match;
  teams: Team[];
  customRules?: CustomRule[];
  inningsId?: string;
  onBallRecorded?: (ball: Ball, specialBalls: unknown[]) => void;
}

type TeamWithPlayers = Team & {
  players?: Player[];
};

type AnimationType = "four" | "six" | "wicket" | "normal" | null;

export function ScorerPanel({ match, teams, customRules = [], inningsId, onBallRecorded }: ScorerPanelProps) {
  const {
    balls,
    specialBalls,
    strikerId,
    nonStrikerId,
    currentBowlerId,
    currentOverBallCount,
    battingOrder,
    bowlingOrder,
    addBall,
    removeLastBall,
    swapStriker,
    endOver,
    setStriker,
    setNonStriker,
    setBowler,
    setBattingOrderFromPlayers,
    setBowlingOrderFromPlayers,
  } = useMatchStore();

  const [animationType, setAnimationType] = useState<AnimationType>(null);
  const [showDismissalPicker, setShowDismissalPicker] = useState(false);
  const [showExtraPicker, setShowExtraPicker] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [showPlayerSetup, setShowPlayerSetup] = useState(!strikerId && !currentBowlerId);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentWickets, setCurrentWickets] = useState(0);
  const [currentOvers, setCurrentOvers] = useState("0.0");

  const battingTeam = teams[0];
  const bowlingTeam = teams[1];
  const battingPlayers = (battingTeam as TeamWithPlayers)?.players || [];
  const bowlingPlayers = (bowlingTeam as TeamWithPlayers)?.players || [];

  const striker = battingOrder.find((p) => p.id === strikerId);
  const nonStriker = battingOrder.find((p) => p.id === nonStrikerId);
  const bowler = bowlingOrder.find((p) => p.id === currentBowlerId);

  useEffect(() => {
    if (battingPlayers.length > 0 && battingOrder.length === 0) {
      setBattingOrderFromPlayers(battingPlayers);
    }
    if (bowlingPlayers.length > 0 && bowlingOrder.length === 0) {
      setBowlingOrderFromPlayers(bowlingPlayers);
    }
  }, [battingPlayers, bowlingPlayers]);

  const getAnimationType = (runs: number, isWicket: boolean): AnimationType => {
    if (isWicket) return "wicket";
    if (runs === 6) return "six";
    if (runs === 4) return "four";
    return "normal";
  };

  const handleRun = useCallback(
    (runs: number, extras?: { type: ExtraType; runs: number }) => {
      const overNumber = Math.floor(balls.length / 6);
      const ballNumber = (balls.length % 6) + 1;

      const partialBall: Partial<Ball> = {
        runs,
        over_number: overNumber,
        ball_number: ballNumber,
      };

      const context = {
        batsmanRuns: runs,
        totalScore: currentScore + runs,
        overNumber,
        wickets: currentWickets,
      };

      const triggeredRules = evaluateRules(customRules, partialBall, context);

      let finalRuns = runs;
      let specialBallDesc: string | null = null;
      let specialBallAction: string | null = null;

      if (triggeredRules.length > 0) {
        const rule = triggeredRules[0];
        if (rule.action_type === "bonus_runs") {
          finalRuns = runs + Number(rule.action_value);
          specialBallDesc = `${rule.rule_name}: +${rule.action_value} bonus runs`;
          specialBallAction = "bonus_runs";
        } else if (rule.action_type === "modify_runs") {
          finalRuns = Number(rule.action_value);
          specialBallDesc = `${rule.rule_name}: runs modified to ${finalRuns}`;
          specialBallAction = "modify_runs";
        }
      }

      const ball: Ball = {
        id: `ball-${Date.now()}`,
        innings_id: inningsId || "",
        over_number: overNumber,
        ball_number: ballNumber,
        batsman_id: strikerId || "",
        bowler_id: currentBowlerId || "",
        runs: finalRuns,
        extras_type: extras?.type || null,
        extras_runs: extras?.runs || 0,
        dismissal_type: null,
        dismissal_player_id: null,
        custom_rule_triggered_id: triggeredRules[0]?.rule_id || null,
        custom_rule_name: triggeredRules[0]?.rule_name || null,
        special_ball: triggeredRules.length > 0,
        special_ball_description: specialBallDesc,
        special_ball_action: specialBallAction,
        timestamp: new Date().toISOString(),
      };

      const specialBallEvents = triggeredRules.map((r) => ({
        ...r,
        id: `sb-${Date.now()}-${Math.random()}`,
      }));

      addBall(ball, specialBallEvents);
      setCurrentScore((s) => s + finalRuns);

      if (inningsId) {
        const supabase = createClient();
        supabase.from("balls").insert({
          innings_id: inningsId,
          over_number: overNumber,
          ball_number: ballNumber,
          batsman_id: strikerId,
          bowler_id: currentBowlerId,
          runs: finalRuns,
          extras_type: extras?.type || null,
          extras_runs: extras?.runs || 0,
          custom_rule_triggered_id: triggeredRules[0]?.rule_id || null,
          custom_rule_name: triggeredRules[0]?.rule_name || null,
          special_ball: triggeredRules.length > 0,
          special_ball_description: specialBallDesc,
          special_ball_action: specialBallAction,
        });
      }

      const animType = getAnimationType(finalRuns, false);
      setAnimationType(animType);
      setTimeout(() => setAnimationType(null), 600);

      if (runs % 2 === 1 && runs !== 1) {
        swapStriker();
      }

      onBallRecorded?.(ball, specialBallEvents);
    },
    [balls.length, strikerId, currentBowlerId, currentScore, currentWickets, customRules, addBall, swapStriker, onBallRecorded, inningsId]
  );

  const handleWicket = useCallback(
    (dismissalType: DismissalType) => {
      const overNumber = Math.floor(balls.length / 6);
      const ballNumber = (balls.length % 6) + 1;

      const ball: Ball = {
        id: `ball-${Date.now()}`,
        innings_id: inningsId || "",
        over_number: overNumber,
        ball_number: ballNumber,
        batsman_id: strikerId || "",
        bowler_id: currentBowlerId || "",
        runs: 0,
        extras_type: null,
        extras_runs: 0,
        dismissal_type: dismissalType,
        dismissal_player_id: strikerId,
        custom_rule_triggered_id: null,
        custom_rule_name: null,
        special_ball: false,
        special_ball_description: null,
        special_ball_action: null,
        timestamp: new Date().toISOString(),
      };

      addBall(ball, []);
      setCurrentWickets((w) => w + 1);

      if (inningsId) {
        const supabase = createClient();
        supabase.from("balls").insert({
          innings_id: inningsId,
          over_number: overNumber,
          ball_number: ballNumber,
          batsman_id: strikerId,
          bowler_id: currentBowlerId,
          runs: 0,
          dismissal_type: dismissalType,
          dismissal_player_id: strikerId,
        });
      }

      setAnimationType("wicket");
      setTimeout(() => setAnimationType(null), 500);
      setShowDismissalPicker(false);
      onBallRecorded?.(ball, []);
    },
    [balls.length, strikerId, currentBowlerId, addBall, onBallRecorded, inningsId]
  );

  const handleExtra = useCallback(
    (type: ExtraType) => {
      const runs = type === "wide" || type === "no_ball" ? 1 : 0;
      const overNumber = Math.floor(balls.length / 6);
      const ballNumber = (balls.length % 6) + 1;

      const ball: Ball = {
        id: `ball-${Date.now()}`,
        innings_id: inningsId || "",
        over_number: overNumber,
        ball_number: ballNumber,
        batsman_id: strikerId || "",
        bowler_id: currentBowlerId || "",
        runs: runs,
        extras_type: type,
        extras_runs: runs,
        dismissal_type: null,
        dismissal_player_id: null,
        custom_rule_triggered_id: null,
        custom_rule_name: null,
        special_ball: false,
        special_ball_description: `${type === "wide" ? "Wide" : type === "no_ball" ? "No Ball" : type === "bye" ? "Bye" : "Leg Bye"}`,
        special_ball_action: type,
        timestamp: new Date().toISOString(),
      };

      addBall(ball, []);
      setCurrentScore((s) => s + runs);

      if (inningsId) {
        const supabase = createClient();
        supabase.from("balls").insert({
          innings_id: inningsId,
          over_number: overNumber,
          ball_number: ballNumber,
          batsman_id: strikerId,
          bowler_id: currentBowlerId,
          runs: runs,
          extras_type: type,
          extras_runs: runs,
          special_ball_description: `${type === "wide" ? "Wide" : type === "no_ball" ? "No Ball" : type === "bye" ? "Bye" : "Leg Bye"}`,
          special_ball_action: type,
        });
      }

      setAnimationType("normal");
      setShowExtraPicker(false);
      onBallRecorded?.(ball, []);
    },
    [balls.length, strikerId, currentBowlerId, addBall, onBallRecorded, inningsId]
  );

  const handleUndo = useCallback(() => {
    const lastBall = balls[balls.length - 1];
    const lastHadRule = lastBall?.custom_rule_triggered_id;

    if (lastHadRule) {
      setShowUndoConfirm(true);
    } else {
      removeLastBall();
      setCurrentScore(Math.max(0, currentScore - (lastBall?.runs || 0)));
      if (lastBall?.dismissal_type) {
        setCurrentWickets((w) => Math.max(0, w - 1));
      }
    }
  }, [balls, currentScore, removeLastBall]);

  const confirmUndo = () => {
    removeLastBall();
    const lastBall = balls[balls.length - 1];
    setCurrentScore(Math.max(0, currentScore - (lastBall?.runs || 0)));
    if (lastBall?.dismissal_type) {
      setCurrentWickets((w) => Math.max(0, w - 1));
    }
    setShowUndoConfirm(false);
  };

  const isOverComplete = currentOverBallCount >= 6;

  const runRate = balls.length > 0 ? ((currentScore / balls.length) * 6).toFixed(2) : "0.00";
  const formattedOvers = `${Math.floor(balls.length / 6)}.${balls.length % 6}`;

  if (showPlayerSetup || !strikerId || !currentBowlerId) {
    return (
      <PlayerSetupModal
        battingPlayers={battingPlayers}
        bowlingPlayers={bowlingPlayers}
        strikerId={strikerId}
        nonStrikerId={nonStrikerId}
        currentBowlerId={currentBowlerId}
        onSelectStriker={(id) => { setStriker(id); setShowPlayerSetup(false); }}
        onSelectNonStriker={setNonStriker}
        onSelectBowler={setBowler}
        onConfirm={() => setShowPlayerSetup(false)}
      />
    );
  }

  return (
    <div className="relative w-full max-w-5xl mx-auto">
        {/* Animation overlay */}
        <AnimatePresence>
          {animationType && animationType !== "normal" && (
            <AnimationOverlay
              type={animationType}
              onComplete={() => setAnimationType(null)}
            />
          )}
        </AnimatePresence>

      {/* Main scorer card */}
      <div className="bg-[#1A1D27] border border-[#2D3748] rounded-2xl overflow-hidden">
        {/* Team header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2D3748]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#10B981]/20 flex items-center justify-center">
              <span className="text-lg">🏏</span>
            </div>
            <div>
              <h2 className="font-semibold text-[#F1F5F9]">{teams[0]?.name || "Team A"}</h2>
              <span className="text-xs text-[#64748B]">Batting</span>
            </div>
          </div>

          <ScoreAnimate type={animationType || "normal"} className="text-right">
            <div className="flex items-baseline gap-2">
              <span className="score-display text-4xl font-mono">{currentScore}-{currentWickets}</span>
            </div>
            <div className="flex items-center gap-4 justify-end mt-1">
              <span className="text-sm font-mono text-[#64748B]">{formattedOvers} ov</span>
              <span className="text-sm text-[#10B981] font-semibold">RR: {runRate}</span>
            </div>
          </ScoreAnimate>
        </div>

        {/* Current over balls */}
        <div className="px-6 py-4 bg-[#232738]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
              Over {Math.floor(balls.length / 6)}
            </span>
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => {
                const ball = balls[balls.length - 6 + i];
                const ballRuns = ball?.runs || 0;
                const isWicket = !!ball?.dismissal_type;
                const isWide = ball?.extras_type === "wide";
                const isNoball = ball?.extras_type === "no_ball";

                let className = "ball-dot runs-0";
                if (isWicket) className = "ball-dot wicket";
                else if (isWide) className = "ball-dot wide";
                else if (isNoball) className = "ball-dot noball";
                else if (ballRuns === 4) className = "ball-dot runs-4";
                else if (ballRuns === 6) className = "ball-dot runs-6";
                else if (ballRuns > 0) className = `ball-dot runs-${ballRuns}`;

                return (
                  <div
                    key={i}
                    className={className}
                  >
                    {ball ? (
                      isWicket ? "W" : isWide ? "Wd" : isNoball ? "Nb" : ballRuns
                    ) : (
                      <span className="text-[#3D4758]">•</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main content: Batsmen + Special balls panel */}
        <div className="flex">
          {/* Left: Batsmen cards */}
          <div className="flex-1 p-6">
            {/* Batting pair */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Striker */}
              <div className="bg-[#232738] rounded-xl p-4 border-2 border-[#10B981] relative">
                <div className="absolute -top-3 left-4 bg-[#10B981] text-[#0F1117] text-[10px] font-bold px-2 py-0.5 rounded">
                  ON STRIKE
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🏏</span>
                  <span className="font-semibold text-[#F1F5F9] truncate">
                    {striker?.name || "Batsman 1"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-bold text-[#F1F5F9]">
                    {striker?.stats?.runs || 0}
                  </span>
                  <span className="text-sm text-[#64748B]">({striker?.stats?.balls || 0})</span>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-[#64748B]">
                  <span>4s: {striker?.stats?.fours || 0}</span>
                  <span>6s: {striker?.stats?.sixes || 0}</span>
                </div>
              </div>

              {/* Non-striker */}
              <div className="bg-[#232738] rounded-xl p-4 border border-[#2D3748]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🏏</span>
                  <span className="font-semibold text-[#F1F5F9] truncate">
                    {nonStriker?.name || "Batsman 2"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-bold text-[#F1F5F9]">
                    {nonStriker?.stats?.runs || 0}
                  </span>
                  <span className="text-sm text-[#64748B]">({nonStriker?.stats?.balls || 0})</span>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-[#64748B]">
                  <span>4s: {nonStriker?.stats?.fours || 0}</span>
                  <span>6s: {nonStriker?.stats?.sixes || 0}</span>
                </div>
              </div>
            </div>

            {/* Swap button */}
            <div className="flex justify-center mb-4">
              <button
                onClick={swapStriker}
                className="flex items-center gap-2 px-4 py-2 bg-[#232738] rounded-lg text-sm text-[#64748B] hover:bg-[#2D3748] hover:text-[#F1F5F9] transition-all"
              >
                <SwapIcon className="w-4 h-4" />
                Swap Strike
              </button>
            </div>

            {/* Partnership */}
            <div className="bg-[#232738]/50 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#64748B] uppercase">Partnership</span>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-mono font-bold text-[#10B981]">
                    {striker?.stats?.runs !== undefined ? striker.stats.runs + (nonStriker?.stats?.runs || 0) : 0}*
                  </span>
                  <span className="text-xs text-[#64748B]">({balls.length % 6 + Math.floor(balls.length / 6) * 6} balls)</span>
                </div>
              </div>
            </div>

            {/* Bowler */}
            <div className="bg-[#232738] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#64748B] uppercase mb-1 block">Bowler</span>
                  <span className="font-semibold text-[#F1F5F9]">{bowler?.name || "Select Bowler"}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-mono font-bold text-[#F1F5F9]">
                    {Math.floor(balls.filter((b) => b.bowler_id === currentBowlerId).length / 6)}.
                    {balls.filter((b) => b.bowler_id === currentBowlerId).length % 6}
                  </span>
                  <div className="flex gap-3 text-xs text-[#64748B] mt-1">
                    <span>R: {balls.filter((b) => b.bowler_id === currentBowlerId).reduce((a, b) => a + b.runs, 0)}</span>
                    <span>W: {balls.filter((b) => b.bowler_id === currentBowlerId && b.dismissal_type).length}</span>
                    <span className={balls.filter((b) => b.bowler_id === currentBowlerId).length > 0 ? "economy-green" : ""}>
                      Eco: {balls.filter((b) => b.bowler_id === currentBowlerId).length > 0
                        ? ((balls.filter((b) => b.bowler_id === currentBowlerId).reduce((a, b) => a + b.runs, 0) / balls.filter((b) => b.bowler_id === currentBowlerId).length) * 6).toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ball-by-ball feed */}
            <div className="mt-4">
              <BallByBallFeed balls={balls} />
            </div>
          </div>

          {/* Right: Special balls panel */}
          <div className="w-72 border-l border-[#2D3748] p-4 bg-[#232738]/30">
            <SpecialBallsPanel specialBalls={specialBalls} />
          </div>
        </div>

        {/* Run buttons */}
        <div className="border-t border-[#2D3748] p-4 bg-[#232738]">
          <div className="flex items-center gap-3 mb-4">
            {/* Main run buttons */}
            {[0, 1, 2, 3, 4, 6].map((run) => (
              <button
                key={run}
                onClick={() => handleRun(run)}
                className={`run-btn run-btn-${run}`}
              >
                {run}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Extras */}
            {["wide", "no_ball", "bye", "leg_bye"].map((extra) => (
              <button
                key={extra}
                onClick={() => handleExtra(extra as ExtraType)}
                className="run-btn run-btn-extra"
              >
                {extra === "wide" ? "Wd" : extra === "no_ball" ? "Nb" : extra === "bye" ? "By" : "Lb"}
              </button>
            ))}

            {/* Wicket */}
            <button
              onClick={() => setShowDismissalPicker(true)}
              className="run-btn run-btn-wicket"
            >
              W
            </button>

            {/* Undo */}
            <button
              onClick={handleUndo}
              className="ml-auto flex items-center gap-2 px-4 py-3 bg-[#1A1D27] rounded-lg text-sm text-[#64748B] hover:bg-[#2D3748] hover:text-[#F1F5F9] transition-all"
            >
              <UndoIcon className="w-4 h-4" />
              Undo
            </button>
          </div>
        </div>
      </div>

      {/* Dismissal picker modal */}
      <AnimatePresence>
        {showDismissalPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowDismissalPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1D27] border border-[#2D3748] rounded-2xl p-6 w-80"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4">Select Dismissal</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { type: "bowled" as DismissalType, label: "Bowled", icon: "🎯" },
                  { type: "caught" as DismissalType, label: "Caught", icon: "👐" },
                  { type: "lbw" as DismissalType, label: "LBW", icon: "🦵" },
                  { type: "run_out" as DismissalType, label: "Run Out", icon: "🏃" },
                  { type: "stumped" as DismissalType, label: "Stumped", icon: "🧤" },
                  { type: "hit_wicket" as DismissalType, label: "Hit Wicket", icon: "💥" },
                  { type: "obstructing" as DismissalType, label: "Obstructing", icon: "🚫" },
                  { type: "retired_hurt" as DismissalType, label: "Retired Hurt", icon: "🏥" },
                ].map((d) => (
                  <button
                    key={d.type}
                    onClick={() => handleWicket(d.type)}
                    className="flex items-center gap-2 p-3 bg-[#232738] rounded-xl hover:bg-[#2D3748] transition-all"
                  >
                    <span>{d.icon}</span>
                    <span className="text-sm text-[#F1F5F9]">{d.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo confirmation modal */}
      <AnimatePresence>
        {showUndoConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowUndoConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1D27] border border-[#2D3748] rounded-2xl p-6 w-80 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">Undo Rule-Triggered Ball?</h3>
              <p className="text-sm text-[#64748B] mb-6">
                This ball triggered a custom rule. Undoing will remove the rule effect as well.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUndoConfirm(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Keep
                </button>
                <button
                  onClick={confirmUndo}
                  className="flex-1 btn btn-danger"
                >
                  Revert
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayerSetupModal({
  battingPlayers,
  bowlingPlayers,
  strikerId,
  nonStrikerId,
  currentBowlerId,
  onSelectStriker,
  onSelectNonStriker,
  onSelectBowler,
  onConfirm,
}: {
  battingPlayers: Player[];
  bowlingPlayers: Player[];
  strikerId: string | null;
  nonStrikerId: string | null;
  currentBowlerId: string | null;
  onSelectStriker: (id: string) => void;
  onSelectNonStriker: (id: string) => void;
  onSelectBowler: (id: string) => void;
  onConfirm: () => void;
}) {
  const [selectedStriker, setSelectedStriker] = useState(strikerId || "");
  const [selectedNonStriker, setSelectedNonStriker] = useState(nonStrikerId || "");
  const [selectedBowler, setSelectedBowler] = useState(currentBowlerId || "");

  const handleConfirm = () => {
    if (selectedStriker) onSelectStriker(selectedStriker);
    if (selectedNonStriker) onSelectNonStriker(selectedNonStriker);
    if (selectedBowler) onSelectBowler(selectedBowler);
    onConfirm();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-6">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-6 text-center">Select Players</h2>
        
        <div className="space-y-6">
          {/* Striker */}
          <div>
            <label className="input-label">Striker (On Strike)</label>
            <select
              value={selectedStriker}
              onChange={(e) => setSelectedStriker(e.target.value)}
              className="input"
            >
              <option value="">Select striker...</option>
              {battingPlayers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Non-striker */}
          <div>
            <label className="input-label">Non-Striker</label>
            <select
              value={selectedNonStriker}
              onChange={(e) => setSelectedNonStriker(e.target.value)}
              className="input"
            >
              <option value="">Select non-striker...</option>
              {battingPlayers.filter(p => p.id !== selectedStriker).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Bowler */}
          <div>
            <label className="input-label">Bowler</label>
            <select
              value={selectedBowler}
              onChange={(e) => setSelectedBowler(e.target.value)}
              className="input"
            >
              <option value="">Select bowler...</option>
              {bowlingPlayers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selectedStriker || !selectedBowler}
          className="btn btn-primary w-full mt-6 disabled:opacity-50"
        >
          Start Scoring
        </button>
      </div>
    </div>
  );
}
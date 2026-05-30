'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useScoringStore, getOverDisplay } from '../../store/useScoringStore';
import { UltraEdgeStudio, NoBallInspector } from '../../components/drs/DrsComponents';
import {
  Undo2, Zap, Play, Settings, Users, ChevronRight,
  Smartphone, Camera, Mic, CheckCircle2, XCircle, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { HeaderAndDrawer } from '../../components/shared/HeaderAndDrawer';

export default function ScorerConsole() {
  const {
    activeMatchId,
    strikerId,
    nonStrikerId,
    activeBowlerId,
    matches,
    players,
    teams,
    tournaments,
    isFreeHit,
    recordBall,
    undoBall,
    redoBall,
    setActivePlayers,
    swapStrikers,
    startMatch,
    changeStriker,
    changeBowler
  } = useScoringStore();

  const [wicketModalOpen, setWicketModalOpen] = useState(false);
  const [ultraEdgeOpen, setUltraEdgeOpen] = useState(false);
  const [noBallInspectorOpen, setNoBallInspectorOpen] = useState(false);
  const [customBallDropdownOpen, setCustomBallDropdownOpen] = useState(false);

  const [phoneConnected, setPhoneConnected] = useState(false);
  const [setupPhase, setSetupPhase] = useState<'idle' | 'requesting' | 'failed' | 'connected'>('idle');
  const [setupError, setSetupError] = useState('');
  const [micLevel, setMicLevel] = useState(0);

  const setupVideoRef = useRef<HTMLVideoElement | null>(null);
  const setupStreamRef = useRef<MediaStream | null>(null);
  const setupAudioCtxRef = useRef<AudioContext | null>(null);
  const setupAnalyserRef = useRef<AnalyserNode | null>(null);
  const setupMicAnimRef = useRef<number | null>(null);

  const match = matches.find(m => m.id === activeMatchId);
  const tournament = tournaments.find(t => t.id === match?.tournamentId);

  // --- Phone Setup: initiate camera+mic ---
  const startPhoneSetup = useCallback(async () => {
    setSetupPhase('requesting');
    setSetupError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setSetupError('Your browser does not support camera/microphone access. Use a modern phone browser (Safari/Chrome).');
        setSetupPhase('failed');
        return;
      }

      const isSecure = window.isSecureContext;
      if (!isSecure) {
        setSetupError('Camera and microphone require a secure connection (HTTPS). Make sure you are using the https:// URL, not http://');
        setSetupPhase('failed');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true
      });

      setupStreamRef.current = stream;
      if (setupVideoRef.current) {
        setupVideoRef.current.srcObject = stream;
      }

      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        setupAudioCtxRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        setupAnalyserRef.current = analyser;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const readLevel = () => {
          if (!setupAnalyserRef.current) return;
          const data = new Uint8Array(setupAnalyserRef.current.frequencyBinCount);
          setupAnalyserRef.current.getByteTimeDomainData(data);
          const max = Math.max(...Array.from(data)) / 128;
          setMicLevel(max);
          setupMicAnimRef.current = requestAnimationFrame(readLevel);
        };
        readLevel();
      } catch {
        // Mic meter is optional, don't block setup
      }

      setSetupPhase('connected');
    } catch (err: any) {
      const msg = err?.message || err?.toString() || 'Unknown error';
      if (msg.includes('NotAllowedError') || msg.includes('Permission denied')) {
        setSetupError('Camera and microphone access was denied. Go to your phone Settings → Safari → Camera & Microphone and allow access, then try again.');
      } else if (msg.includes('NotFoundError') || msg.includes('device')) {
        setSetupError('No camera or microphone found on this device. Make sure your phone has a working camera and mic.');
      } else if (msg.includes('NotReadableError')) {
        setSetupError('Camera or microphone is in use by another app. Close other apps and try again.');
      } else if (msg.includes('SecurityError') || msg.includes('secure')) {
        setSetupError('Access denied due to security policy. Make sure you are using HTTPS (https:// not http://) and have accepted the certificate warning.');
      } else {
        setSetupError(`${msg}. Try using Safari on iPhone or Chrome on Android.`);
      }
      setSetupPhase('failed');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (setupStreamRef.current) {
        setupStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (setupAudioCtxRef.current) {
        setupAudioCtxRef.current.close();
      }
      if (setupMicAnimRef.current) {
        cancelAnimationFrame(setupMicAnimRef.current);
      }
    };
  }, []);

  if (!match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="p-8 rounded-xl glass-card max-w-sm space-y-4">
          <h2 className="font-medium text-xl">No Active Match</h2>
          <p className="text-muted-foreground text-sm">
            Start a match from the tournaments panel to begin scoring.
          </p>
          <button
            onClick={() => startMatch('m-live')}
            className="w-full py-2.5 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 transition"
          >
            Start Pre-Seeded Match
          </button>
          <Link
            href="/tournaments"
            className="block text-xs text-muted-foreground hover:underline"
          >
            Go to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  // --- Phone Setup Screen (mandatory before scoring) ---
  if (!phoneConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-12">
        <HeaderAndDrawer title="Scorer Setup" activePath="/scorer" />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6">
            <div className="rounded-xl glass-card p-6 text-center space-y-4">
              <Smartphone className="w-12 h-12 mx-auto text-[#00e5ff]" />
              <h2 className="font-display font-bold text-xl">Phone Required</h2>
              <p className="text-sm text-muted-foreground">
                A phone with camera and microphone must be connected to record this match.
              </p>
            </div>

            {setupPhase === 'idle' && (
              <button
                onClick={startPhoneSetup}
                className="w-full py-3 rounded-xl bg-[#00e5ff] text-slate-950 font-bold text-sm hover:opacity-90 transition-colors cursor-pointer flex items-center justify-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <span>Connect Phone</span>
              </button>
            )}

            {setupPhase === 'requesting' && (
              <div className="rounded-xl glass-card p-6 text-center space-y-4">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#00e5ff]" />
                <p className="text-sm text-muted-foreground">
                  Requesting camera and microphone access…
                </p>
              </div>
            )}

            {setupPhase === 'failed' && (
              <div className="rounded-xl glass-card p-6 text-center space-y-4 border-[#ff005b]/30">
                <XCircle className="w-10 h-10 mx-auto text-[#ff005b]" />
                <p className="text-sm text-muted-foreground">
                  {setupError || 'Camera or microphone access was denied.'}
                </p>
                <button
                  onClick={startPhoneSetup}
                  className="w-full py-2.5 rounded-lg bg-[#ff005b]/10 text-[#ff005b] border border-[#ff005b]/30 font-medium text-sm hover:bg-[#ff005b]/20 transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            )}

            {setupPhase === 'connected' && (
              <div className="space-y-4">
                <div className="rounded-xl glass-card p-4 space-y-3">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black/60">
                    <video
                      ref={setupVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 right-2 flex items-center space-x-2 bg-black/60 px-2 py-1 rounded text-[10px] font-mono">
                      <Camera className="w-3 h-3 text-[#00e5ff]" />
                      <span className="text-white">Live</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Mic className="w-3 h-3" />
                      Microphone
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-20 rounded-full bg-foreground/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#00e5ff] transition-all duration-100"
                          style={{ width: `${Math.min(100, micLevel * 60)}%` }}
                        />
                      </div>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00f59b]" />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl glass-card p-4 text-center space-y-2 border-[#00f59b]/30">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-[#00f59b]" />
                  <p className="font-medium text-sm">Phone connected successfully</p>
                  <p className="text-xs text-muted-foreground">
                    Camera and microphone are live. Start scoring to begin.
                  </p>
                </div>

                <button
                  onClick={() => setPhoneConnected(true)}
                  className="w-full py-3 rounded-xl bg-[#00f59b] text-slate-950 font-bold text-sm hover:opacity-90 transition-colors cursor-pointer"
                >
                  Start Scoring
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  const inningsIndex = match.currentInnings - 1;
  const innings = match.innings[inningsIndex];

  const battingTeam = teams.find(t => t.id === innings?.battingTeamId);
  const bowlingTeam = teams.find(t => t.id === (match.homeTeamId === innings?.battingTeamId ? match.awayTeamId : match.homeTeamId));

  const activeStriker = innings?.batters.find(b => b.playerId === strikerId && !b.isOut);
  const activeNonStriker = innings?.batters.find(b => b.playerId === nonStrikerId && !b.isOut);
  const activeBowler = innings?.bowlers.find(b => b.playerId === activeBowlerId);

  const ballsPerOver = tournament?.ballsPerOver || 6;
  const overNumber = Math.floor((innings?.ballsBowled || 0) / ballsPerOver) + 1;

  const handleScoreEvent = (runsBatter: number, runsExtra: number, extraType?: string) => {
    recordBall({ runsBatter, runsExtra, extraType, isWicket: false });
  };

  const handleWicketEvent = (wicketType: any) => {
    recordBall({ runsBatter: 0, runsExtra: 0, isWicket: true, wicketType });
    setWicketModalOpen(false);
  };

  const handleDrsVerdict = (isOut: boolean, wicketType?: any) => {
    if (isOut) {
      recordBall({
        runsBatter: 0, runsExtra: 0, isWicket: true, wicketType: wicketType || 'CAUGHT',
        customCommentary: `DRS confirms dismissal.`
      });
    } else {
      recordBall({
        runsBatter: 0, runsExtra: 0, isWicket: false,
        customCommentary: `DRS: Not out.`
      });
    }
    setUltraEdgeOpen(false);
  };

  const handleNoBallDrsVerdict = (isNoBall: boolean, reason?: string) => {
    if (isNoBall) {
      recordBall({
        runsBatter: 0, runsExtra: tournament?.runsPerNoBall ?? 1, extraType: 'NO_BALL', isWicket: false,
        customCommentary: `No ball: ${reason || 'height'}. Free hit awarded.`
      });
    } else {
      recordBall({
        runsBatter: 0, runsExtra: 0, isWicket: false,
        customCommentary: `Legal delivery confirmed.`
      });
    }
    setNoBallInspectorOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-8">
      <HeaderAndDrawer title={`${battingTeam?.shortName} vs ${bowlingTeam?.shortName}`} activePath="/scorer" />

      <main className="max-w-6xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* Left column */}
        <div className="lg:col-span-8 space-y-4">
          {/* Scoreboard */}
          <div className="p-5 rounded-xl glass-card flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-xs text-muted-foreground">
                  Innings {match.currentInnings} — {battingTeam?.name}
                </span>
                <h1 className="text-3xl font-semibold mt-0.5 tab-nums">
                  {innings?.runs || 0}<span className="text-muted-foreground text-lg font-normal">/{innings?.wickets || 0}</span>
                </h1>
              </div>
              <div className="text-right">
                <span className="text-xs bg-foreground/5 px-2 py-1 rounded-md">
                  Overs <span className="font-semibold tab-nums">{innings?.overs || 0.0}</span>/{match.oversCount}
                </span>
                {match.currentInnings === 2 && match.innings[0] && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Need {match.innings[0].runs + 1 - innings.runs} from {match.oversCount * (tournament?.ballsPerOver || 6) - innings.ballsBowled} balls
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>CRR: <strong className="text-foreground">{(innings?.ballsBowled || 0) > 0 ? ((innings.runs / (innings.ballsBowled / (tournament?.ballsPerOver || 6))).toFixed(2)) : '0.00'}</strong></span>
                {match.currentInnings === 2 && match.innings[0] && (
                  <span>RRR: <strong>{((match.innings[0].runs + 1 - innings.runs) / Math.max(0.1, (match.oversCount - (innings.overs || 0)))).toFixed(2)}</strong></span>
                )}
              </div>
              {isFreeHit && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider">
                  Free Hit
                </span>
              )}
            </div>
          </div>

          {/* Active players */}
          <div className="rounded-xl glass-card p-5 space-y-3">
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Active Players</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-foreground/5 border border-white/5 space-y-2">
                <span className="text-[10px] uppercase text-emerald-400 tracking-wider font-medium">Batting</span>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="font-medium">{activeStriker?.name || 'Striker'}</span>
                  </div>
                  <span className="font-mono text-sm tab-nums">{activeStriker?.runs || 0} <span className="text-xs text-muted-foreground">({activeStriker?.balls || 0})</span></span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="pl-3.5">{activeNonStriker?.name || 'Non-striker'}</span>
                  <span className="font-mono text-sm tab-nums">{activeNonStriker?.runs || 0} <span className="text-xs text-muted-foreground">({activeNonStriker?.balls || 0})</span></span>
                </div>
                <div className="flex justify-end pt-1">
                  <button onClick={swapStrikers} className="px-2.5 py-1 rounded-md bg-foreground/5 text-[10px] font-medium border border-white/5 hover:bg-foreground/10 transition">
                    Rotate strike
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-foreground/5 border border-white/5 space-y-2">
                <span className="text-[10px] uppercase text-muted-foreground tracking-wider font-medium">Bowler</span>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{activeBowler?.name || 'Select bowler'}</span>
                  <span className="font-mono text-sm tab-nums">{activeBowler?.wickets || 0}-{activeBowler?.runs || 0} <span className="text-xs text-muted-foreground">({activeBowler?.overs || 0})</span></span>
                </div>
                <div className="flex justify-end pt-2">
                  <select
                    value={activeBowlerId || ''}
                    onChange={(e) => changeBowler(e.target.value)}
                    className="bg-background border border-white/10 rounded-md px-2 py-1 text-xs text-foreground outline-none"
                  >
                    <option value="" disabled>Change bowler</option>
                    {bowlingTeam?.players.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Keypad */}
          <div className="p-5 rounded-xl glass-card space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Keypad</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2].map(n => (
                <button key={n} onClick={() => handleScoreEvent(n, 0)} className="py-4 rounded-lg bg-foreground/5 text-foreground border border-white/5 hover:bg-foreground/10 font-semibold text-lg transition">
                  {n}
                </button>
              ))}
              <button onClick={undoBall} className="py-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 text-xs font-medium uppercase tracking-wider transition">
                Undo
              </button>

              {[3, 4, 6].map(n => (
                <button key={n} onClick={() => handleScoreEvent(n, 0)} className={`py-4 rounded-lg border font-semibold text-lg transition ${n === 4 || n === 6 ? 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20' : 'bg-foreground/5 text-foreground border-white/5 hover:bg-foreground/10'}`}>
                  {n}
                </button>
              ))}
              <button onClick={() => setWicketModalOpen(true)} className="py-4 rounded-lg bg-red-500 text-white border border-red-500/10 hover:opacity-90 text-xs font-medium uppercase tracking-wider transition">
                Out
              </button>

              {['WIDE', 'NO_BALL', 'BYE', 'OVER_THROW'].map((label, i) => {
                const onClick = label === 'NO_BALL' ? () => setNoBallInspectorOpen(true) : () => handleScoreEvent(0, 1, label);
                return (
                  <button key={label} onClick={onClick} className="py-3.5 rounded-lg border border-white/5 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 text-[11px] font-medium uppercase tracking-wider transition">
                    {label.replace('_', ' ')}
                  </button>
                );
              })}
            </div>

            <div className="relative pt-1">
              <button
                onClick={() => setCustomBallDropdownOpen(!customBallDropdownOpen)}
                className="w-full py-2.5 rounded-lg border border-white/10 bg-foreground/5 text-xs font-medium uppercase tracking-wider hover:bg-foreground/10 transition"
              >
                Custom balls
              </button>
              {customBallDropdownOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-full rounded-xl bg-background border border-white/10 shadow-xl p-2 z-30">
                  <span className="block px-3 py-1 text-[10px] text-muted-foreground uppercase font-medium">Custom rules</span>
                  {tournament?.customBallRules.map(rule => (
                    <button
                      key={rule.id}
                      onClick={() => { handleScoreEvent(0, 0, rule.id); setCustomBallDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-foreground/5 transition flex justify-between items-center"
                    >
                      <span>{rule.label}</span>
                      <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">+{rule.runsModifier}R</span>
                    </button>
                  ))}
                  {(!tournament?.customBallRules || tournament.customBallRules.length === 0) && (
                    <span className="block px-3 py-2 text-xs text-muted-foreground italic">No custom rules</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/5">
              <button onClick={() => setUltraEdgeOpen(true)} className="flex-1 py-2 rounded-lg border border-white/10 bg-foreground/5 text-xs font-medium hover:bg-foreground/10 transition">
                UltraEdge DRS
              </button>
              <button onClick={() => setNoBallInspectorOpen(true)} className="flex-1 py-2 rounded-lg border border-white/10 bg-foreground/5 text-xs font-medium hover:bg-foreground/10 transition">
                No-Ball DRS
              </button>
            </div>
          </div>

          {/* Undo ledger & this over */}
          <div className="p-4 rounded-xl bg-foreground/5 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button onClick={undoBall} className="px-3 py-1.5 rounded-md bg-foreground/5 hover:bg-foreground/10 text-xs font-medium transition flex items-center gap-1.5">
                <Undo2 className="w-3.5 h-3.5" />
                Undo
              </button>
              <button onClick={() => { for (let i = 0; i < 3; i++) undoBall(); }} className="px-3 py-1.5 rounded-md bg-foreground/5 hover:bg-foreground/10 text-xs font-medium transition">
                Undo 3
              </button>
              <button onClick={() => { const thisOverBalls = innings?.ballsList.filter(b => b.overNumber === overNumber) || []; thisOverBalls.forEach(() => undoBall()); }} className="px-3 py-1.5 rounded-md bg-foreground/5 hover:bg-foreground/10 text-xs font-medium transition">
                Undo over
              </button>
            </div>
            <div className="text-right flex items-center gap-2 font-mono text-xs w-full md:w-auto justify-end">
              <span className="text-muted-foreground">This over:</span>
              <div className="flex items-center gap-1">
                {innings?.ballsList.filter(b => b.overNumber === overNumber).map((b, idx) => {
                  let text = String(b.runsBatter);
                  let colorClass = 'bg-foreground/5 text-foreground border-white/5';
                  if (b.isWicket) { text = 'W'; colorClass = 'bg-red-500/10 text-red-400 border-red-500/20 font-bold'; }
                  else if (b.extraType === 'WIDE' || b.extraType === 'NO_BALL') { text = `${b.runsExtra}${b.extraType === 'WIDE' ? 'wd' : 'nb'}`; colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20'; }
                  else if (b.runsBatter === 4 || b.runsBatter === 6) { colorClass = 'bg-sky-500/10 text-sky-400 border-sky-500/20 font-medium'; }
                  return <span key={idx} className={`px-1.5 py-0.5 rounded text-[10px] border ${colorClass} tab-nums`}>{text}</span>;
                })}
                {(!innings?.ballsList || innings.ballsList.filter(b => b.overNumber === overNumber).length === 0) && (
                  <span className="text-muted-foreground italic">None</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-xl glass-card space-y-3">
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Crease scanner</h3>
            <div className="bg-background p-3 rounded-lg border border-white/5 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Status</span>
                <span className="text-emerald-400 font-medium">Online</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Crease limit</span>
                <span>60.00cm</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground border-t border-white/5 pt-2">
                <span>Last ball</span>
                <span className="text-emerald-400 font-medium">58.42cm safe</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic">Auto-checks every delivery.</p>
          </div>

          <div className="p-5 rounded-xl glass-card space-y-3">
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Umpire Appeal</h3>
            <p className="text-xs text-muted-foreground">
              Trigger a height appeal review.
            </p>
            <button onClick={() => setNoBallInspectorOpen(true)} className="w-full py-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs font-medium uppercase tracking-wide hover:bg-amber-500/10 transition">
              Height appeal
            </button>
          </div>
        </div>
      </main>

      {/* Wicket modal */}
      {wicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm p-5 rounded-xl glass-card space-y-3">
            <h3 className="font-medium text-base pb-2 border-b border-white/5">Dismissal type</h3>
            <div className="grid grid-cols-2 gap-2">
              {['BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET', 'RETIRED_HURT'].map(type => (
                <button key={type} onClick={() => { if (type === 'CAUGHT') { setWicketModalOpen(false); setUltraEdgeOpen(true); } else handleWicketEvent(type); }}
                  className="py-2.5 px-2 rounded-lg bg-foreground/5 border border-white/5 text-xs font-medium hover:bg-red-500/10 hover:border-red-500/20 transition uppercase text-center">
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button onClick={() => setWicketModalOpen(false)} className="w-full py-2 rounded-lg bg-foreground/5 text-muted-foreground text-xs font-medium hover:bg-foreground/10 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {ultraEdgeOpen && (
        <UltraEdgeStudio batterName={activeStriker?.name || 'Batsman'} bowlerName={activeBowler?.name || 'Bowler'} onConfirmVerdict={handleDrsVerdict} onClose={() => setUltraEdgeOpen(false)} />
      )}

      {noBallInspectorOpen && (
        <NoBallInspector ballsPerOver={tournament?.ballsPerOver || 6} onResolve={handleNoBallDrsVerdict} onClose={() => setNoBallInspectorOpen(false)} />
      )}
    </div>
  );
}

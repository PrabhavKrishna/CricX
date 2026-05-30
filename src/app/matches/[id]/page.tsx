'use client';

import React, { useState } from 'react';
import { useScoringStore, getOverDisplay } from '../../../store/useScoringStore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { Clock, Award, Edit3, Save, X } from 'lucide-react';
import Link from 'next/link';
import { HeaderAndDrawer } from '../../../components/shared/HeaderAndDrawer';

export default function MatchCenter({ params }: { params: { id: string } }) {
  const { matches, teams, players, tournaments, currentUser, adminOverrideBall } = useScoringStore();
  const matchId = params.id;
  const match = matches.find(m => m.id === matchId);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  const [activeTab, setActiveTab] = useState<'LIVE' | 'COMMENTARY' | 'ANALYTICS' | 'ADMIN'>('LIVE');
  const [editingBallId, setEditingBallId] = useState<string | null>(null);
  const [editRunsBatter, setEditRunsBatter] = useState<number>(0);
  const [editRunsExtra, setEditRunsExtra] = useState<number>(0);
  const [editExtraType, setEditExtraType] = useState<string>('');
  const [editIsWicket, setEditIsWicket] = useState<boolean>(false);
  const [editWicketType, setEditWicketType] = useState<string>('');

  if (!match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-medium mb-2">Match Not Found</h2>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">Return home</Link>
      </div>
    );
  }

  const tournament = tournaments.find(t => t.id === match.tournamentId);
  const team1 = teams.find(t => t.id === match.homeTeamId);
  const team2 = teams.find(t => t.id === match.awayTeamId);
  const activeInnings = match.innings[match.currentInnings - 1];
  const inn1 = match.innings[0];
  const inn2 = match.innings[1];

  const getManhattanData = () => {
    if (!activeInnings) return [];
    const overMap: { [over: number]: number } = {};
    activeInnings.ballsList.forEach(b => {
      const runs = b.runsBatter + b.runsExtra;
      overMap[b.overNumber] = (overMap[b.overNumber] || 0) + runs;
    });
    return Object.keys(overMap).map(o => ({ Over: `${o}`, Runs: overMap[Number(o)] }));
  };

  const getWormData = () => {
    const wormData: any[] = [];
    const maxBalls = match.oversCount * (tournament?.ballsPerOver || 6);
    let inn1Running = 0, inn2Running = 0;
    for (let i = 1; i <= maxBalls; i++) {
      const displayOver = getOverDisplay(i, tournament?.ballsPerOver || 6);
      const b1 = inn1?.ballsList[i - 1];
      if (b1) inn1Running += b1.runsBatter + b1.runsExtra;
      const b2 = inn2?.ballsList[i - 1];
      if (b2) inn2Running += b2.runsBatter + b2.runsExtra;
      if (b1 || b2) {
        wormData.push({
          Over: displayOver,
          [team1?.shortName || 'Home']: b1 ? inn1Running : null,
          [team2?.shortName || 'Away']: b2 ? inn2Running : null
        });
      }
    }
    return wormData;
  };

  const calculateWinProb = () => {
    if (match.status === 'COMPLETED') return match.winnerId === match.homeTeamId ? 100 : 0;
    if (match.status === 'UPCOMING') return 50;
    const score = activeInnings?.runs || 0;
    const wickets = activeInnings?.wickets || 0;
    const balls = activeInnings?.ballsBowled || 0;
    const maxBalls = match.oversCount * (tournament?.ballsPerOver || 6);
    if (match.currentInnings === 1) {
      return Math.min(92, Math.max(8, Math.round(50 + (score * 0.4) - (wickets * 4.5) - ((balls / maxBalls) * 2))));
    } else {
      const target = (inn1?.runs || 0) + 1;
      const runsNeeded = target - score;
      const ballsRemaining = maxBalls - balls;
      if (runsNeeded <= 0) return 0;
      if (ballsRemaining <= 0 || wickets >= 10) return 100;
      const reqRate = (runsNeeded / (ballsRemaining / 6));
      const bowlProb = 15 + (reqRate * 7) + (wickets * 6.5) - ((ballsRemaining / maxBalls) * 5);
      const homeBats = match.homeTeamId === activeInnings?.battingTeamId;
      return Math.min(99, Math.max(1, Math.round(homeBats ? (100 - bowlProb) : bowlProb)));
    }
  };

  const homeWinProb = calculateWinProb();
  const awayWinProb = 100 - homeWinProb;

  const handleAdminSave = (ballId: string, idx: number) => {
    adminOverrideBall(matchId, idx, ballId, {
      runsBatter: editRunsBatter, runsExtra: editRunsExtra, extraType: editExtraType || undefined,
      isWicket: editIsWicket, wicketType: editIsWicket ? (editWicketType as any) : undefined
    });
    setEditingBallId(null);
  };

  const tabs = ['LIVE', 'COMMENTARY', 'ANALYTICS', 'ADMIN'].filter(t => t !== 'ADMIN' || currentUser?.role === 'SUPER_ADMIN');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-12">
      <HeaderAndDrawer title="Match Center" activePath="/matches" />

      <main className="max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6 flex-1">
        {/* Score banner */}
        <section className="rounded-xl glass-card p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="h-14 w-14 rounded-xl bg-foreground/5 border border-white/5 flex items-center justify-center font-semibold text-lg">{team1?.shortName}</div>
            <div>
              <h2 className="font-medium text-base">{team1?.name}</h2>
              {inn1 ? (
                <div className="text-xl font-semibold mt-0.5 tab-nums">
                  {inn1.runs}/{inn1.wickets} <span className="text-xs text-muted-foreground font-normal">({inn1.overs} ov)</span>
                </div>
              ) : <span className="text-xs text-muted-foreground">Yet to bat</span>}
            </div>
          </div>

          <div className="text-center space-y-2">
            {match.status === 'LIVE' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-[11px] font-medium uppercase tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 live-pulse" /> Live
              </div>
            ) : match.status === 'COMPLETED' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-medium uppercase tracking-wide">
                <Award className="w-3 h-3" /> Completed
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground/5 text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                <Clock className="w-3 h-3" /> Upcoming
              </div>
            )}
            {match.status === 'LIVE' && match.currentInnings === 2 && inn1 && (
              <div className="text-xs text-muted-foreground">Target: <strong className="text-emerald-400">{inn1.runs + 1}</strong></div>
            )}
            {match.status === 'COMPLETED' && (
              <div className="text-xs font-medium text-amber-400">
                {match.winnerId === 'TIE' ? 'Tied' : `${teams.find(t => t.id === match.winnerId)?.name} won`}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 flex-row-reverse text-center md:text-right">
            <div className="h-14 w-14 rounded-xl bg-foreground/5 border border-white/5 flex items-center justify-center font-semibold text-lg">{team2?.shortName}</div>
            <div>
              <h2 className="font-medium text-base">{team2?.name}</h2>
              {inn2 ? (
                <div className="text-xl font-semibold mt-0.5 tab-nums">
                  {inn2.runs}/{inn2.wickets} <span className="text-xs text-muted-foreground font-normal">({inn2.overs} ov)</span>
                </div>
              ) : <span className="text-xs text-muted-foreground text-right block">Yet to bat</span>}
            </div>
          </div>
        </section>

        {/* Win probability */}
        {match.status !== 'UPCOMING' && activeInnings && (
          <section className="p-4 rounded-xl bg-foreground/5 border border-white/5 space-y-3">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>CRR: <strong className="text-foreground">{(activeInnings.ballsBowled || 0) > 0 ? ((activeInnings.runs / (activeInnings.ballsBowled / 6)).toFixed(2)) : '0.00'}</strong></span>
              <span>Predicted: <strong className="text-foreground">{Math.round(((activeInnings.runs / Math.max(1, activeInnings.ballsBowled)) * (match.oversCount * 6)))}</strong></span>
              {match.currentInnings === 2 && inn1 && (
                <span>RRR: <strong className="text-foreground">{((inn1.runs + 1 - activeInnings.runs) / Math.max(0.1, (match.oversCount - activeInnings.overs))).toFixed(2)}</strong></span>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{team1?.shortName} {homeWinProb}%</span>
                <span className="uppercase tracking-wider text-[10px]">Win probability</span>
                <span>{team2?.shortName} {awayWinProb}%</span>
              </div>
              <div className="relative h-2 w-full bg-foreground/5 rounded-full overflow-hidden flex">
                <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${homeWinProb}%` }} />
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${awayWinProb}%` }} />
              </div>
            </div>
          </section>
        )}

        {/* Tabs */}
        <div className="flex border-b border-white/5 gap-1">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-2 px-3 text-sm font-medium border-b-2 transition ${activeTab === tab ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {tab === 'LIVE' ? 'Scorecard' : tab === 'COMMENTARY' ? 'Commentary' : tab === 'ANALYTICS' ? 'Charts' : 'Admin'}
            </button>
          ))}
        </div>

        {/* Tab: Scorecard */}
        {activeTab === 'LIVE' && (
          <div className="space-y-4">
            {match.innings.map((inn, idx) => (
              <div key={idx} className="rounded-xl glass-card p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-sm font-medium">{teams.find(t => t.id === inn.battingTeamId)?.name}</h3>
                  <span className="text-sm font-medium tab-nums">{inn.runs}/{inn.wickets} ({inn.overs} ov)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-white/5">
                        <th className="py-1.5 pl-2">Batter</th>
                        <th className="py-1.5 text-right">R</th>
                        <th className="py-1.5 text-right">B</th>
                        <th className="py-1.5 text-right">4s</th>
                        <th className="py-1.5 text-right">6s</th>
                        <th className="py-1.5 text-right">SR</th>
                        <th className="py-1.5 text-right pr-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inn.batters.map((b, bIdx) => (
                        <tr key={bIdx} className="border-b border-white/5">
                          <td className="py-2 pl-2 font-medium">{b.name}</td>
                          <td className="py-2 text-right font-medium tab-nums">{b.runs}</td>
                          <td className="py-2 text-right tab-nums">{b.balls}</td>
                          <td className="py-2 text-right tab-nums">{b.fours}</td>
                          <td className="py-2 text-right tab-nums">{b.sixes}</td>
                          <td className="py-2 text-right tab-nums">{b.strikeRate}</td>
                          <td className="py-2 text-right pr-2 text-muted-foreground">{b.isOut ? `out (${b.outType})` : 'not out'}</td>
                        </tr>
                      ))}
                      {inn.batters.length === 0 && <tr><td colSpan={7} className="py-3 text-center text-muted-foreground italic">Not started</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-white/5">
                        <th className="py-1.5 pl-2">Bowler</th>
                        <th className="py-1.5 text-right">O</th>
                        <th className="py-1.5 text-right">M</th>
                        <th className="py-1.5 text-right">R</th>
                        <th className="py-1.5 text-right">W</th>
                        <th className="py-1.5 text-right pr-2">Econ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inn.bowlers.map((b, bIdx) => (
                        <tr key={bIdx} className="border-b border-white/5">
                          <td className="py-2 pl-2 font-medium">{b.name}</td>
                          <td className="py-2 text-right tab-nums">{b.overs}</td>
                          <td className="py-2 text-right tab-nums">{b.maidens}</td>
                          <td className="py-2 text-right tab-nums">{b.runs}</td>
                          <td className="py-2 text-right font-medium tab-nums">{b.wickets}</td>
                          <td className="py-2 text-right pr-2 tab-nums">{b.economy}</td>
                        </tr>
                      ))}
                      {inn.bowlers.length === 0 && <tr><td colSpan={6} className="py-3 text-center text-muted-foreground italic">No bowlers</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Commentary */}
        {activeTab === 'COMMENTARY' && (
          <div className="rounded-xl glass-card p-5 space-y-3">
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Commentary</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {activeInnings?.ballsList.slice().reverse().map((b, idx) => {
                const isWkt = b.isWicket;
                const isBoundary = (b.runsBatter === 4 || b.runsBatter === 6);
                return (
                  <div key={idx} className={`p-3 rounded-lg border flex items-start gap-3 transition ${isWkt ? 'bg-red-500/5 border-red-500/20' : isBoundary ? 'bg-sky-500/5 border-sky-500/20' : 'bg-foreground/5 border-white/5'}`}>
                    <div className={`h-7 w-7 rounded-full border text-[10px] font-mono font-medium flex items-center justify-center shrink-0 tab-nums ${isWkt ? 'bg-red-500/10 text-red-400 border-red-500/20' : isBoundary ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-foreground/5 border-white/5 text-muted-foreground'}`}>
                      {b.overNumber - 1}.{b.ballNumber}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm leading-relaxed">{b.commentary}</p>
                      <div className="flex gap-1.5">
                        {b.isFreeHit && <span className="text-[9px] font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">FH</span>}
                        {b.extraType && <span className="text-[9px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{b.extraType}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!activeInnings || activeInnings.ballsList.length === 0) && (
                <div className="text-center py-10 text-muted-foreground text-xs italic">No commentary yet</div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Charts */}
        {activeTab === 'ANALYTICS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl glass-card p-5 space-y-3">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Manhattan</h3>
              <div className="h-56">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getManhattanData()}>
                      <XAxis dataKey="Over" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                      <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      <Bar dataKey="Runs" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="text-xs text-muted-foreground">Loading...</div>}
              </div>
            </div>

            <div className="rounded-xl glass-card p-5 space-y-3">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Worm</h3>
              <div className="h-56">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getWormData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                      <XAxis dataKey="Over" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey={team1?.shortName || 'Home'} stroke="#0ea5e9" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey={team2?.shortName || 'Away'} stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="text-xs text-muted-foreground">Loading...</div>}
              </div>
            </div>

            <div className="rounded-xl glass-card p-5 space-y-3 md:col-span-2 max-w-sm mx-auto w-full text-center">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Wagon Wheel</h3>
              <div className="relative aspect-square max-w-[240px] mx-auto rounded-full bg-background border border-white/5 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="90" fill="rgba(15,23,42,0.5)" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                  <circle cx="100" cy="100" r="50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3" />
                  <rect x="96" y="80" width="8" height="40" rx="1" fill="rgba(255,255,255,0.1)" />
                  {activeInnings?.ballsList.filter(b => b.wagonWheelAngle !== undefined).map((b, idx) => {
                    const rad = ((b.wagonWheelAngle || 0) * Math.PI) / 180;
                    const targetX = 100 + 80 * Math.cos(rad);
                    const targetY = 100 + 80 * Math.sin(rad);
                    const runs = b.runsBatter + b.runsExtra;
                    const strokeColor = runs === 6 ? '#f59e0b' : runs === 4 ? '#ef4444' : '#64748b';
                    const strokeW = runs === 6 ? 2.5 : runs === 4 ? 2 : 1;
                    return (
                      <g key={idx}>
                        <line x1="100" y1="100" x2={targetX} y2={targetY} stroke={strokeColor} strokeWidth={strokeW} strokeLinecap="round" opacity={0.7} />
                        <circle cx={targetX} cy={targetY} r="2.5" fill={strokeColor} />
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> 6s</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> 4s</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-500" /> Others</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Admin */}
        {activeTab === 'ADMIN' && currentUser?.role === 'SUPER_ADMIN' && (
          <div className="rounded-xl glass-card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-red-400">Admin Override</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Editing past deliveries will recalculate all aggregates.</p>
            </div>
            {match.innings.map((inn, idx) => (
              <div key={idx} className="space-y-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{teams.find(t => t.id === inn.battingTeamId)?.shortName} innings</span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-white/5">
                        <th className="py-1.5 pl-2">Ball</th>
                        <th className="py-1.5">Batter</th>
                        <th className="py-1.5">Bowler</th>
                        <th className="py-1.5 text-right">R</th>
                        <th className="py-1.5 text-right">Ext</th>
                        <th className="py-1.5">Type</th>
                        <th className="py-1.5">Wkt</th>
                        <th className="py-1.5 pr-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {inn.ballsList.map((b) => {
                        const isEditing = editingBallId === b.id;
                        return (
                          <tr key={b.id} className="border-b border-white/5">
                            <td className="py-2 pl-2 font-mono tab-nums">{b.overNumber - 1}.{b.ballNumber}</td>
                            <td className="py-2 font-medium">{players.find(p => p.id === b.batterId)?.name || '—'}</td>
                            <td className="py-2 text-muted-foreground">{players.find(p => p.id === b.bowlerId)?.name || '—'}</td>
                            <td className="py-2 text-right">
                              {isEditing ? <input type="number" min={0} max={6} value={editRunsBatter} onChange={(e) => setEditRunsBatter(parseInt(e.target.value))} className="w-10 bg-background border border-white/10 rounded text-center py-0.5 text-xs" /> : <strong className="tab-nums">{b.runsBatter}</strong>}
                            </td>
                            <td className="py-2 text-right">
                              {isEditing ? <input type="number" min={0} max={5} value={editRunsExtra} onChange={(e) => setEditRunsExtra(parseInt(e.target.value))} className="w-10 bg-background border border-white/10 rounded text-center py-0.5 text-xs" /> : <span className="tab-nums">{b.runsExtra}</span>}
                            </td>
                            <td className="py-2">
                              {isEditing ? (
                                <select value={editExtraType} onChange={(e) => setEditExtraType(e.target.value)} className="bg-background border border-white/10 text-[10px] rounded py-0.5">
                                  <option value="">NONE</option>
                                  <option value="WIDE">WIDE</option>
                                  <option value="NO_BALL">NO_BALL</option>
                                  <option value="BYE">BYE</option>
                                  {tournament?.customBallRules.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                </select>
                              ) : <span className="text-[10px] text-muted-foreground uppercase">{b.extraType || '—'}</span>}
                            </td>
                            <td className="py-2">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <input type="checkbox" checked={editIsWicket} onChange={(e) => setEditIsWicket(e.target.checked)} className="accent-foreground" />
                                  {editIsWicket && (
                                    <select value={editWicketType} onChange={(e) => setEditWicketType(e.target.value)} className="bg-background border border-white/10 text-[10px] rounded py-0.5">
                                      <option value="BOWLED">BOWLED</option>
                                      <option value="CAUGHT">CAUGHT</option>
                                      <option value="LBW">LBW</option>
                                      <option value="RUN_OUT">RUN_OUT</option>
                                      <option value="STUMPED">STUMPED</option>
                                    </select>
                                  )}
                                </div>
                              ) : b.isWicket ? <span className="text-[10px] font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">{b.wicketType}</span> : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="py-2 pr-2 text-right">
                              {isEditing ? (
                                <div className="flex justify-end gap-1.5">
                                  <button onClick={() => handleAdminSave(b.id, idx)} className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"><Save className="w-3 h-3" /></button>
                                  <button onClick={() => setEditingBallId(null)} className="p-1 rounded bg-foreground/5 text-muted-foreground hover:text-foreground transition"><X className="w-3 h-3" /></button>
                                </div>
                              ) : (
                                <button onClick={() => { setEditingBallId(b.id); setEditRunsBatter(b.runsBatter); setEditRunsExtra(b.runsExtra); setEditExtraType(b.extraType || ''); setEditIsWicket(b.isWicket); setEditWicketType(b.wicketType || 'BOWLED'); }} className="p-1 rounded bg-foreground/5 text-muted-foreground hover:text-foreground transition">
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {inn.ballsList.length === 0 && <tr><td colSpan={8} className="py-3 text-center text-muted-foreground italic">No balls</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

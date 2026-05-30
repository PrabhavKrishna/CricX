'use client';

import React, { useState } from 'react';
import { useScoringStore } from '../../store/useScoringStore';
import { TournamentStanding, TournamentRole } from '../../types';
import { formatDate } from '../../utils/date';
import {
  Plus, Calendar, Trophy, Users, Zap, PlayCircle
} from 'lucide-react';
import Link from 'next/link';
import { HeaderAndDrawer } from '../../components/shared/HeaderAndDrawer';

export default function TournamentHub() {
  const {
    tournaments, matches, teams, players, usersList, currentUser,
    createTournament, assignSquads, generateFixtures,
    createCustomMatch, assignScorer, createCustomBallRule,
    addTournamentMember
  } = useScoringStore();

  const [selectedTourId, setSelectedTourId] = useState<string>(tournaments[0]?.id || '');
  const activeTour = tournaments.find(t => t.id === selectedTourId);
  const userRoleInTour = activeTour?.members?.find(m => m.userId === currentUser?.id)?.role;

  const [newTourName, setNewTourName] = useState('');
  const [newTourFormat, setNewTourFormat] = useState<'LEAGUE' | 'KNOCKOUT' | 'PLAYOFFS'>('LEAGUE');
  const [newTourOvers, setNewTourOvers] = useState(5);
  const [newTourBallsPerOver, setNewTourBallsPerOver] = useState(6);
  const [newTourRunsPerWide, setNewTourRunsPerWide] = useState(1);
  const [newTourRunsPerNoBall, setNewTourRunsPerNoBall] = useState(1);
  const [creatorOpen, setCreatorOpen] = useState(false);

  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [selectedSquadPlayerIds, setSelectedSquadPlayerIds] = useState<string[]>([]);
  const [squadBuilderOpen, setSquadBuilderOpen] = useState(false);

  const [customBallLabel, setCustomBallLabel] = useState('');
  const [customBallRuns, setCustomBallRuns] = useState(1);
  const [customBallLegal, setCustomBallLegal] = useState(false);
  const [customBallFreeHit, setCustomBallFreeHit] = useState(true);
  const [customBallOpen, setCustomBallOpen] = useState(false);

  const [customHomeId, setCustomHomeId] = useState(teams[0]?.id || '');
  const [customAwayId, setCustomAwayId] = useState(teams[1]?.id || '');
  const [customVenue, setCustomVenue] = useState('Central Stadium');
  const [customDate, setCustomDate] = useState('2026-06-01T19:30');
  const [customMatchOpen, setCustomMatchOpen] = useState(false);
  const [selectedMemberUserId, setSelectedMemberUserId] = useState('');
  const [selectedMemberRole, setSelectedMemberRole] = useState<TournamentRole>('VIEWER');


  const activeTourMatches = matches.filter(m => m.tournamentId === selectedTourId);

  const getStandings = (): TournamentStanding[] => {
    if (!activeTour) return [];
    const teamIds = Object.keys(activeTour.squads);
    const standingsMap: { [teamId: string]: TournamentStanding } = {};

    teamIds.forEach(tid => {
      standingsMap[tid] = { teamId: tid, played: 0, won: 0, lost: 0, tied: 0, points: 0, netRunRate: 0.0 };
    });

    activeTourMatches.forEach(m => {
      if (m.status !== 'COMPLETED' || !m.winnerId) return;
      const inn1 = m.innings[0];
      const inn2 = m.innings[1];
      if (!inn1 || !inn2) return;
      const team1Id = inn1.battingTeamId;
      const team2Id = inn2.battingTeamId;
      if (!standingsMap[team1Id] || !standingsMap[team2Id]) return;

      standingsMap[team1Id].played += 1;
      standingsMap[team2Id].played += 1;
      if (m.winnerId === 'TIE') {
        standingsMap[team1Id].tied += 1;
        standingsMap[team1Id].points += 1;
        standingsMap[team2Id].tied += 1;
        standingsMap[team2Id].points += 1;
      } else {
        const winTeamId = m.winnerId;
        const loseTeamId = winTeamId === team1Id ? team2Id : team1Id;
        standingsMap[winTeamId].won += 1;
        standingsMap[winTeamId].points += 2;
        standingsMap[loseTeamId].lost += 1;
      }
      const inn1Balls = inn1.ballsBowled || inn1.ballsList.length || 1;
      const inn2Balls = inn2.ballsBowled || inn2.ballsList.length || 1;
      const inn1Overs = inn1Balls / 6;
      const inn2Overs = inn2Balls / 6;
      if (inn1Overs > 0 && inn2Overs > 0) {
        standingsMap[team1Id].netRunRate += (inn1.runs / inn1Overs) - (inn2.runs / inn2Overs);
        standingsMap[team2Id].netRunRate += (inn2.runs / inn2Overs) - (inn1.runs / inn1Overs);
      }
    });

    return Object.values(standingsMap).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.netRunRate - a.netRunRate;
    });
  };

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTourName) return;
    const newId = createTournament(newTourName, newTourFormat, newTourOvers, {
      ballsPerOver: newTourBallsPerOver, runsPerWide: newTourRunsPerWide, runsPerNoBall: newTourRunsPerNoBall
    });
    setSelectedTourId(newId);
    setNewTourName('');
    setCreatorOpen(false);
  };

  const handleSquadSave = () => {
    if (!selectedTourId || !selectedTeamId) return;
    assignSquads(selectedTourId, selectedTeamId, selectedSquadPlayerIds);
    setSquadBuilderOpen(false);
  };

  const handleCustomBallSave = () => {
    if (!selectedTourId || !customBallLabel) return;
    createCustomBallRule(selectedTourId, { label: customBallLabel, runsModifier: customBallRuns, isLegal: customBallLegal, triggersFreeHit: customBallFreeHit, multiplier: 1.0 });
    setCustomBallLabel('');
    setCustomBallOpen(false);
  };

  const handleCustomMatchSave = () => {
    if (!selectedTourId) return;
    createCustomMatch(selectedTourId, customHomeId, customAwayId, customVenue, customDate);
    setCustomMatchOpen(false);
  };

  const handleAddMember = () => {
    if (!selectedTourId || !selectedMemberUserId) return;
    addTournamentMember(selectedTourId, selectedMemberUserId, selectedMemberRole);
    setSelectedMemberUserId('');
    setSelectedMemberRole('VIEWER');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-12">
      <HeaderAndDrawer title="Tournaments" activePath="/tournaments" />

      <main className="max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6 flex-1">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedTourId}
              onChange={(e) => setSelectedTourId(e.target.value)}
              className="bg-background border border-white/10 rounded-lg px-3 py-2 text-sm font-medium max-w-xs focus:ring-1 focus:ring-foreground/20 outline-none"
            >
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
            <button onClick={() => setCreatorOpen(true)} className="px-3 py-2 rounded-lg bg-foreground text-background font-medium text-xs hover:opacity-90 transition flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
            <button onClick={() => setSquadBuilderOpen(true)} className="px-3 py-2 rounded-lg bg-foreground/5 border border-white/10 text-xs font-medium hover:bg-foreground/10 transition flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Squads
            </button>
            <button onClick={() => setCustomBallOpen(true)} className="px-3 py-2 rounded-lg bg-foreground/5 border border-white/10 text-xs font-medium hover:bg-foreground/10 transition flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Rules
            </button>
          </div>
        </div>

        {activeTour ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-6">
              {/* Standings */}
              <div className="rounded-xl glass-card p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Standings
                  </h3>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-foreground/5 px-2 py-0.5 rounded">
                    {activeTour.format}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-white/5">
                        <th className="py-2 pl-2">#</th>
                        <th className="py-2">Team</th>
                        <th className="py-2 text-right">P</th>
                        <th className="py-2 text-right">W</th>
                        <th className="py-2 text-right">L</th>
                        <th className="py-2 text-right">Pts</th>
                        <th className="py-2 text-right pr-2">NRR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getStandings().map((s, idx) => {
                        const team = teams.find(t => t.id === s.teamId);
                        return (
                          <tr key={s.teamId} className="border-b border-white/5 text-foreground">
                            <td className="py-2.5 pl-2 font-medium tab-nums">{idx + 1}</td>
                            <td className="py-2.5 font-medium">{team?.name}</td>
                            <td className="py-2.5 text-right tab-nums">{s.played}</td>
                            <td className="py-2.5 text-right tab-nums">{s.won}</td>
                            <td className="py-2.5 text-right tab-nums">{s.lost}</td>
                            <td className="py-2.5 text-right font-semibold tab-nums">{s.points}</td>
                            <td className={`py-2.5 text-right pr-2 font-medium tab-nums ${s.netRunRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {s.netRunRate >= 0 ? `+${s.netRunRate.toFixed(3)}` : s.netRunRate.toFixed(3)}
                            </td>
                          </tr>
                        );
                      })}
                      {Object.keys(activeTour.squads).length === 0 && (
                        <tr><td colSpan={7} className="py-4 text-center text-muted-foreground italic">No teams registered</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fixtures */}
              <div className="rounded-xl glass-card p-5 space-y-3">
                <div className="flex flex-col md:flex-row items-center justify-between border-b border-white/5 pb-2 gap-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fixtures
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={() => generateFixtures(selectedTourId, 'ROUND_ROBIN')} className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-medium uppercase tracking-wider hover:bg-emerald-500/20 transition">
                      Round Robin
                    </button>
                    <button onClick={() => generateFixtures(selectedTourId, 'PLAYOFFS')} className="px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-400 text-[10px] font-medium uppercase tracking-wider hover:bg-sky-500/20 transition">
                      Playoffs
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {activeTourMatches.map((m) => {
                    const home = teams.find(t => t.id === m.homeTeamId);
                    const away = teams.find(t => t.id === m.awayTeamId);
                    return (
                      <div key={m.id} className="p-3 rounded-lg bg-foreground/5 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 hover:border-white/10 transition">
                        <div className="space-y-0.5 w-full">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span>{home?.shortName} vs {away?.shortName}</span>
                            <span className="text-[10px] text-muted-foreground">({m.oversCount} ov)</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">{m.venue} · {formatDate(m.date)}</div>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                          <select
                            value={m.scorerId || ''}
                            onChange={(e) => assignScorer(m.id, e.target.value)}
                            className="bg-background border border-white/10 rounded-md px-1.5 py-0.5 text-[10px] text-foreground outline-none"
                          >
                            <option value="">Unassigned</option>
                            {usersList.filter(u => u.role === 'SCORER' || u.role === 'SUPER_ADMIN').map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                          {m.status === 'LIVE' ? (
                            <Link href="/scorer" className="px-2.5 py-1 rounded-md bg-red-500 text-white text-[10px] font-medium uppercase flex items-center gap-1">
                              <PlayCircle className="w-3 h-3" /> Live
                            </Link>
                          ) : m.status === 'COMPLETED' ? (
                            <Link href={`/matches/${m.id}`} className="px-2.5 py-1 rounded-md bg-foreground/5 border border-white/10 text-[10px] font-medium hover:bg-foreground/10 transition">Stats</Link>
                          ) : (
                            <button onClick={() => { useScoringStore.getState().startMatch(m.id); window.location.href = '/scorer'; }} className="px-2.5 py-1 rounded-md bg-foreground text-background text-[10px] font-medium hover:opacity-90 transition">Start</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {activeTourMatches.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground italic text-xs">No fixtures yet</div>
                  )}
                </div>
                <div className="flex justify-end pt-1">
                  <button onClick={() => setCustomMatchOpen(true)} className="px-3 py-1.5 rounded-md bg-foreground/5 border border-white/10 text-xs font-medium hover:bg-foreground/10 transition flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Custom match
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              {/* Rules */}
              <div className="rounded-xl glass-card p-5 space-y-3">
                <h3 className="text-sm font-medium">Rules</h3>
                <div className="grid grid-cols-2 gap-3 text-xs bg-foreground/5 p-3 rounded-lg border border-white/5">
                  <div>
                    <span className="text-muted-foreground block">Overs</span>
                    <span className="font-medium">{activeTour.oversPerMatch}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Balls/over</span>
                    <span className="font-medium">{activeTour.ballsPerOver}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Wide</span>
                    <span className="font-medium">+{activeTour.runsPerWide}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">No-ball</span>
                    <span className="font-medium">+{activeTour.runsPerNoBall}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Win points</span>
                    <span className="font-medium">+{activeTour.pointsForWin}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Waist limit</span>
                    <span className="font-medium">{activeTour.waistHeightLimitCm}cm</span>
                  </div>
                </div>
              </div>

              {/* Specialty balls */}
              <div className="rounded-xl glass-card p-5 space-y-3">
                <h3 className="text-sm font-medium">Specialty balls</h3>
                <div className="space-y-2">
                  {activeTour.customBallRules.map((rule) => (
                    <div key={rule.id} className="p-2.5 rounded-lg bg-foreground/5 border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-medium block">{rule.label}</span>
                        <span className="text-[10px] text-muted-foreground">{rule.isLegal ? 'Legal' : 'Illegal'} · {rule.triggersFreeHit ? 'Free hit' : 'No free hit'}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        +{rule.runsModifier}
                      </span>
                    </div>
                  ))}
                  {activeTour.customBallRules.length === 0 && (
                    <span className="block text-center text-muted-foreground text-xs italic py-3">No custom rules</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground italic">No tournaments loaded</div>
        )}
      </main>

      {/* Create tournament modal */}
      {creatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <form onSubmit={handleCreateTournament} className="w-full max-w-md p-5 rounded-xl glass-card space-y-3">
            <h3 className="font-medium text-base pb-2 border-b border-white/5">New tournament</h3>
            <div className="space-y-1 text-xs">
              <label className="text-muted-foreground block font-medium">Name</label>
              <input type="text" placeholder="e.g. IPL 2026" value={newTourName} onChange={(e) => setNewTourName(e.target.value)} className="w-full glass-input rounded-lg px-3 py-2 outline-none" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 text-xs">
                <label className="text-muted-foreground block font-medium">Format</label>
                <select value={newTourFormat} onChange={(e) => setNewTourFormat(e.target.value as any)} className="w-full glass-input rounded-lg px-3 py-2 outline-none">
                  <option value="LEAGUE">League</option>
                  <option value="PLAYOFFS">Playoffs</option>
                </select>
              </div>
              <div className="space-y-1 text-xs">
                <label className="text-muted-foreground block font-medium">Overs</label>
                <input type="number" min={1} max={50} value={newTourOvers} onChange={(e) => setNewTourOvers(parseInt(e.target.value))} className="w-full glass-input rounded-lg px-3 py-2 text-center outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1 text-xs">
                <label className="text-muted-foreground block font-medium">Balls/ov</label>
                <input type="number" value={newTourBallsPerOver} onChange={(e) => setNewTourBallsPerOver(parseInt(e.target.value))} className="w-full glass-input rounded-lg px-2 py-1.5 text-center outline-none" />
              </div>
              <div className="space-y-1 text-xs">
                <label className="text-muted-foreground block font-medium">Wide</label>
                <input type="number" value={newTourRunsPerWide} onChange={(e) => setNewTourRunsPerWide(parseInt(e.target.value))} className="w-full glass-input rounded-lg px-2 py-1.5 text-center outline-none" />
              </div>
              <div className="space-y-1 text-xs">
                <label className="text-muted-foreground block font-medium">No-ball</label>
                <input type="number" value={newTourRunsPerNoBall} onChange={(e) => setNewTourRunsPerNoBall(parseInt(e.target.value))} className="w-full glass-input rounded-lg px-2 py-1.5 text-center outline-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-white/5">
              <button type="button" onClick={() => setCreatorOpen(false)} className="flex-1 py-2 rounded-lg bg-foreground/5 text-muted-foreground font-medium text-xs hover:bg-foreground/10 transition">Cancel</button>
              <button type="submit" className="flex-1 py-2 rounded-lg bg-foreground text-background font-medium text-xs hover:opacity-90 transition">Create</button>
            </div>
          </form>
        </div>
      )}

      {/* Squad builder modal */}
      {squadBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md p-5 rounded-xl glass-card space-y-3">
            <h3 className="font-medium text-base pb-2 border-b border-white/5">Squads</h3>
            <div className="space-y-1 text-xs">
              <label className="text-muted-foreground block font-medium">Team</label>
              <select value={selectedTeamId} onChange={(e) => { setSelectedTeamId(e.target.value); setSelectedSquadPlayerIds(activeTour?.squads[e.target.value] || []); }} className="w-full glass-input rounded-lg px-3 py-2 outline-none">
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1 text-xs">
              <label className="text-muted-foreground block font-medium">Players ({selectedSquadPlayerIds.length})</label>
              <div className="max-h-40 overflow-y-auto space-y-1 border border-white/5 p-2 rounded-lg bg-foreground/5">
                {players.filter(p => p.teamId === selectedTeamId).map(p => {
                  const isChecked = selectedSquadPlayerIds.includes(p.id);
                  return (
                    <label key={p.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-foreground/5 cursor-pointer select-none">
                      <input type="checkbox" checked={isChecked} onChange={(e) => { if (e.target.checked) setSelectedSquadPlayerIds(prev => [...prev, p.id]); else setSelectedSquadPlayerIds(prev => prev.filter(id => id !== p.id)); }} className="accent-foreground" />
                      <div className="text-xs">
                        <span className="font-medium block">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground">{p.battingStyle} · {p.bowlingStyle}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-white/5">
              <button onClick={() => setSquadBuilderOpen(false)} className="flex-1 py-2 rounded-lg bg-foreground/5 text-muted-foreground font-medium text-xs hover:bg-foreground/10 transition">Cancel</button>
              <button onClick={handleSquadSave} className="flex-1 py-2 rounded-lg bg-foreground text-background font-medium text-xs hover:opacity-90 transition">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom ball rule modal */}
      {customBallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm p-5 rounded-xl glass-card space-y-3">
            <h3 className="font-medium text-base pb-2 border-b border-white/5">Custom ball rule</h3>
            <div className="space-y-1 text-xs">
              <label className="text-muted-foreground block font-medium">Label</label>
              <input type="text" placeholder="e.g. Super ball" value={customBallLabel} onChange={(e) => setCustomBallLabel(e.target.value)} className="w-full glass-input rounded-lg px-3 py-2 outline-none" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 text-xs">
                <label className="text-muted-foreground block font-medium">Runs</label>
                <input type="number" min={0} max={10} value={customBallRuns} onChange={(e) => setCustomBallRuns(parseInt(e.target.value))} className="w-full glass-input rounded-lg px-3 py-2 text-center outline-none" />
              </div>
              <div className="flex flex-col justify-end gap-1 text-xs">
                <label className="flex items-center gap-2 text-muted-foreground font-medium select-none"><input type="checkbox" checked={customBallLegal} onChange={(e) => setCustomBallLegal(e.target.checked)} className="accent-foreground" /> Legal</label>
                <label className="flex items-center gap-2 text-muted-foreground font-medium select-none"><input type="checkbox" checked={customBallFreeHit} onChange={(e) => setCustomBallFreeHit(e.target.checked)} className="accent-foreground" /> Free hit</label>
              </div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-white/5">
              <button onClick={() => setCustomBallOpen(false)} className="flex-1 py-2 rounded-lg bg-foreground/5 text-muted-foreground font-medium text-xs hover:bg-foreground/10 transition">Cancel</button>
              <button onClick={handleCustomBallSave} className="flex-1 py-2 rounded-lg bg-foreground text-background font-medium text-xs hover:opacity-90 transition">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom match modal */}
      {customMatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm p-5 rounded-xl glass-card space-y-3">
            <h3 className="font-medium text-base pb-2 border-b border-white/5">Schedule match</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 text-xs">
                <label className="text-muted-foreground block font-medium">Home</label>
                <select value={customHomeId} onChange={(e) => setCustomHomeId(e.target.value)} className="w-full glass-input rounded-lg px-3 py-2 outline-none">
                  {teams.map(t => <option key={t.id} value={t.id}>{t.shortName}</option>)}
                </select>
              </div>
              <div className="space-y-1 text-xs">
                <label className="text-muted-foreground block font-medium">Away</label>
                <select value={customAwayId} onChange={(e) => setCustomAwayId(e.target.value)} className="w-full glass-input rounded-lg px-3 py-2 outline-none">
                  {teams.map(t => <option key={t.id} value={t.id}>{t.shortName}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1 text-xs">
              <label className="text-muted-foreground block font-medium">Venue</label>
              <input type="text" value={customVenue} onChange={(e) => setCustomVenue(e.target.value)} className="w-full glass-input rounded-lg px-3 py-2 outline-none" />
            </div>
            <div className="space-y-1 text-xs">
              <label className="text-muted-foreground block font-medium">Date</label>
              <input type="datetime-local" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="w-full glass-input rounded-lg px-3 py-2 outline-none" />
            </div>
            <div className="flex gap-2 pt-3 border-t border-white/5">
              <button onClick={() => setCustomMatchOpen(false)} className="flex-1 py-2 rounded-lg bg-foreground/5 text-muted-foreground font-medium text-xs hover:bg-foreground/10 transition">Cancel</button>
              <button onClick={handleCustomMatchSave} className="flex-1 py-2 rounded-lg bg-foreground text-background font-medium text-xs hover:opacity-90 transition">Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

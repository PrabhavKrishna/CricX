'use client';

import React, { useEffect } from 'react';
import { useScoringStore } from '../store/useScoringStore';
import {
  Trophy, Tv, Activity, Zap, ArrowRight, Calendar, KeyRound
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatTime } from '../utils/date';
import { HeaderAndDrawer } from '../components/shared/HeaderAndDrawer';
import { useAppSession } from './SessionContext';

export default function HomeClient() {
  const { syncSessionUser } = useScoringStore();
  const session = useAppSession();

  useEffect(() => {
    if (session?.user) {
      syncSessionUser(
        session.user.email as string,
        session.user.name as string,
        (session.user as any).image as string
      );
    }
  }, [session, syncSessionUser]);

  if (!session) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="font-display font-bold text-3xl tracking-tight">cricX</h1>
            <p className="text-sm text-muted-foreground">Cricket scoring & tournament management</p>
          </div>
          <div className="rounded-xl glass-card p-6 space-y-4">
            <p className="text-xs text-muted-foreground">Sign in with Google to continue</p>
            <a
              href="/api/auth/signin/google"
              className="block w-full py-2.5 rounded-lg bg-[#00e5ff] text-slate-950 font-medium text-sm hover:opacity-90 transition"
            >
              <KeyRound className="w-4 h-4 inline-block mr-2" />
              Sign in with Google
            </a>
          </div>
        </div>
      </div>
    );
  }

  const {
    matches,
    teams,
    tournaments,
    currentUser,
    promoteUser
  } = useScoringStore();

  const liveMatch = matches.find(m => m.status === 'LIVE');
  const upcomingMatches = matches.filter(m => m.status === 'UPCOMING');
  const completedMatches = matches.filter(m => m.status === 'COMPLETED');

  const team1 = teams.find(t => t.id === liveMatch?.homeTeamId);
  const team2 = teams.find(t => t.id === liveMatch?.awayTeamId);
  const liveInnings = liveMatch?.innings[liveMatch.currentInnings - 1];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-16">
      <HeaderAndDrawer title="Dashboard" activePath="/" />

      <main className="max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        {liveMatch && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl glass-card">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-red-500 live-pulse" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-red-400">Live</span>
              <span className="text-[11px] text-muted-foreground">{liveMatch.venue}</span>
            </div>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-sm">
                {team1?.shortName} <span className="text-muted-foreground">vs</span> {team2?.shortName}
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-foreground/5 text-xs font-medium tab-nums">
                {liveInnings?.runs}/{liveInnings?.wickets} ({liveInnings?.overs} ov)
              </span>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/matches/${liveMatch.id}`}
                className="px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition"
              >
                Watch
              </Link>
              {currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SCORER' ? (
                <Link
                  href="/scorer"
                  className="px-3 py-1.5 rounded-lg bg-foreground/5 border border-foreground/10 text-xs font-medium hover:bg-foreground/10 transition"
                >
                  Score
                </Link>
              ) : null}
            </div>
          </div>
        )}

        {currentUser && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Role:</span>
            {['SUPER_ADMIN', 'SCORER', 'VIEWER'].map(r => (
              <button
                key={r}
                onClick={() => promoteUser(currentUser.id, r as any)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition ${currentUser.role === r ? 'bg-foreground/10 text-foreground border-foreground/20' : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground'}`}
              >
                {r === 'SUPER_ADMIN' ? 'Admin' : r === 'SCORER' ? 'Scorer' : 'Viewer'}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">Recent Results</h2>
              <div className="space-y-2">
                {completedMatches.map(m => {
                  const home = teams.find(t => t.id === m.homeTeamId);
                  const away = teams.find(t => t.id === m.awayTeamId);
                  const inn1 = m.innings[0];
                  const inn2 = m.innings[1];
                  const homeWon = m.winnerId === m.homeTeamId;
                  const awayWon = m.winnerId === m.awayTeamId;

                  return (
                    <Link
                      key={m.id}
                      href={`/matches/${m.id}`}
                      className="group flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 rounded-xl glass-card hover:border-foreground/10 transition"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-medium">{home?.name}</span>
                          {homeWon && <Trophy className="w-3 h-3 text-amber-400" />}
                          <span className="ml-auto font-mono text-xs tab-nums">
                            {inn1 ? `${inn1.runs}/${inn1.wickets}` : '0/0'}
                            <span className="ml-1 text-[10px] text-muted-foreground">({inn1 ? inn1.overs : '0.0'})</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{away?.name}</span>
                          {awayWon && <Trophy className="w-3 h-3 text-amber-400" />}
                          <span className="ml-auto font-mono text-xs tab-nums">
                            {inn2 ? `${inn2.runs}/${inn2.wickets}` : '0/0'}
                            <span className="ml-1 text-[10px] text-muted-foreground">({inn2 ? inn2.overs : '0.0'})</span>
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-[10px] text-muted-foreground uppercase tracking-wider flex md:flex-col justify-between items-center md:items-end">
                        <span className="font-medium text-foreground">cricX League</span>
                        <span>Season 1</span>
                      </div>
                    </Link>
                  );
                })}
                {completedMatches.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-xs">No completed matches</div>
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl glass-card p-5 flex flex-col justify-between gap-4">
                <div className="space-y-1">
                  <Zap className="w-5 h-5 text-foreground/70" />
                  <h3 className="font-medium text-sm">Scorer</h3>
                  <p className="text-xs text-muted-foreground">Live scoring console with DRS tools.</p>
                </div>
                {currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SCORER' ? (
                  <Link href="/scorer" className="text-xs font-medium flex items-center gap-1 hover:underline">
                    Open <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">Scorer access required</span>
                )}
              </div>

              <div className="rounded-xl glass-card p-5 flex flex-col justify-between gap-4">
                <div className="space-y-1">
                  <Trophy className="w-5 h-5 text-foreground/70" />
                  <h3 className="font-medium text-sm">Tournaments</h3>
                  <p className="text-xs text-muted-foreground">Standings, fixtures, and squads.</p>
                </div>
                <Link href="/tournaments" className="text-xs font-medium flex items-center gap-1 hover:underline">
                  Open <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="rounded-xl glass-card p-5 flex flex-col justify-between gap-4">
                <div className="space-y-1">
                  <Activity className="w-5 h-5 text-foreground/70" />
                  <h3 className="font-medium text-sm">Analytics</h3>
                  <p className="text-xs text-muted-foreground">Player stats and comparisons.</p>
                </div>
                <Link href="/analytics" className="text-xs font-medium flex items-center gap-1 hover:underline">
                  Open <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="rounded-xl glass-card p-5 flex flex-col justify-between gap-4">
                <div className="space-y-1">
                  <Tv className="w-5 h-5 text-foreground/70" />
                  <h3 className="font-medium text-sm">Scorecards</h3>
                  <p className="text-xs text-muted-foreground">Live and archived match views.</p>
                </div>
                <Link href={`/matches/${liveMatch?.id || 'm-live'}`} className="text-xs font-medium flex items-center gap-1 hover:underline">
                  Open <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="p-4 rounded-xl glass-card space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Standings
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground pb-1 border-b border-white/5">
                  <span>Team</span>
                  <span className="tabular-nums">Pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Mumbai Legends</span>
                  <span className="tabular-nums font-medium">2</span>
                </div>
                <div className="flex justify-between">
                  <span>Chennai Titans</span>
                  <span className="tabular-nums font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span>Bangalore Royals</span>
                  <span className="tabular-nums font-medium">0</span>
                </div>
              </div>
              <Link href="/tournaments" className="block text-center text-[11px] font-medium text-muted-foreground hover:underline">
                Full standings
              </Link>
            </div>

            <div className="p-4 rounded-xl glass-card space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Upcoming
              </h3>
              <div className="space-y-2">
                {upcomingMatches.map((m) => {
                  const home = teams.find(t => t.id === m.homeTeamId);
                  const away = teams.find(t => t.id === m.awayTeamId);
                  return (
                    <div key={m.id} className="p-2.5 rounded-lg bg-foreground/5 border border-white/5">
                      <div className="flex justify-between items-center text-xs font-medium mb-0.5">
                        <span>{home?.shortName} vs {away?.shortName}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{formatDate(m.date)} · {formatTime(m.date)}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{m.venue}</div>
                    </div>
                  );
                })}
                {upcomingMatches.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-xs">No upcoming fixtures</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

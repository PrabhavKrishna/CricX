import { createClient } from '@supabase/supabase-js';
import type { Team, Player, Tournament, Match, User, Ball, Innings } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const sb = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

function colName(ts: string): string {
  return ts.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function toDb<T extends Record<string, any>>(obj: T): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) out[colName(key)] = val;
  }
  return out;
}

function fromDb<T extends Record<string, any>>(row: Record<string, any>, keys: (keyof T)[]): T {
  const out: Record<string, any> = {};
  for (const key of keys) {
    const dbKey = colName(key as string);
    out[key as string] = row[dbKey] !== undefined ? row[dbKey] : null;
  }
  return out as T;
}

const TABLE_NAMES = ['teams', 'players', 'tournaments', 'matches', 'users', 'tournament_standings', 'commentary'] as const;

export const supabaseService = {
  async seedIfEmpty() {
    for (const t of TABLE_NAMES) {
      const { count } = await sb.from(t).select('*', { count: 'exact', head: true });
      if (count && count > 0) return;
    }
  },

  async loadTeams(): Promise<Team[]> {
    const { data } = await sb.from('teams').select('*');
    if (!data) return [];
    return data.map(r => {
      const team = fromDb<Team>(r, ['id', 'name', 'shortName', 'logo', 'players'] as any);
      (team as any).players = [];
      return team as Team;
    });
  },

  async upsertTeams(teams: Team[]): Promise<void> {
    const rows = teams.map(t => toDb({ id: t.id, name: t.name, shortName: t.shortName, logo: t.logo || null }));
    await sb.from('teams').upsert(rows as any, { onConflict: 'id' });
  },

  async loadPlayers(): Promise<Player[]> {
    const { data } = await sb.from('players').select('*');
    if (!data) return [];
    return data.map(r => fromDb<Player>(r, ['id', 'name', 'avatar', 'battingStyle', 'bowlingStyle', 'teamId']));
  },

  async upsertPlayers(players: Player[]): Promise<void> {
    const rows = players.map(p => toDb({
      id: p.id, name: p.name, avatar: p.avatar || null,
      batting_style: p.battingStyle, bowling_style: p.bowlingStyle, team_id: p.teamId
    }));
    await sb.from('players').upsert(rows as any, { onConflict: 'id' });
  },

  async loadTournaments(): Promise<Tournament[]> {
    const { data } = await sb.from('tournaments').select('*');
    if (!data) return [];
    return data.map(r => {
      const t = fromDb<Tournament>(r, [
        'id', 'name', 'hostId', 'format', 'startDate', 'endDate',
        'oversPerMatch', 'ballsPerOver', 'runsPerWide', 'runsPerNoBall',
        'pointsForWin', 'pointsForTie', 'pointsForLoss',
        'maxBouncersPerOver', 'waistHeightLimitCm',
        'customBallRules', 'squads', 'members'
      ] as any);
      t.customBallRules = t.customBallRules || [];
      t.squads = t.squads || {};
      t.members = t.members || [];
      return t;
    });
  },

  async upsertTournaments(tournaments: Tournament[]): Promise<void> {
    for (const t of tournaments) {
      const row = toDb({
        ...t,
        custom_ball_rules: JSON.stringify(t.customBallRules || []),
        squads: JSON.stringify(t.squads || {}),
        members: JSON.stringify(t.members || []),
        start_date: t.startDate, end_date: t.endDate,
        overs_per_match: t.oversPerMatch, balls_per_over: t.ballsPerOver,
        runs_per_wide: t.runsPerWide, runs_per_no_ball: t.runsPerNoBall,
        points_for_win: t.pointsForWin, points_for_tie: t.pointsForTie, points_for_loss: t.pointsForLoss,
        max_bouncers_per_over: t.maxBouncersPerOver, waist_height_limit_cm: t.waistHeightLimitCm,
      } as any);
      await sb.from('tournaments').upsert(row as any, { onConflict: 'id' });
    }
  },

  async loadMatches(): Promise<Match[]> {
    const { data } = await sb.from('matches').select('*');
    if (!data) return [];
    return data.map(r => {
      const m = fromDb<Match>(r, [
        'id', 'tournamentId', 'homeTeamId', 'awayTeamId', 'status',
        'venue', 'date', 'tossWinnerId', 'tossDecision',
        'oversCount', 'currentInnings', 'scorerId', 'winnerId', 'innings'
      ] as any);
      try { m.innings = typeof m.innings === 'string' ? JSON.parse(m.innings) : (m.innings || []); }
        catch { m.innings = []; }
      return m;
    });
  },

  async upsertMatches(matches: Match[]): Promise<void> {
    for (const m of matches) {
      const row = toDb({
        ...m,
        innings: JSON.stringify(m.innings || []),
        tournament_id: m.tournamentId || null,
        home_team_id: m.homeTeamId, away_team_id: m.awayTeamId,
        toss_winner_id: m.tossWinnerId || null, toss_decision: m.tossDecision || null,
        overs_count: m.oversCount, current_innings: m.currentInnings,
        scorer_id: m.scorerId || null, winner_id: m.winnerId || null,
      } as any);
      await sb.from('matches').upsert(row as any, { onConflict: 'id' });
    }
  },

  async loadUsers(): Promise<User[]> {
    const { data } = await sb.from('users').select('*');
    if (!data) return [];
    return data.map(r => fromDb<User>(r, ['id', 'email', 'name', 'avatar', 'role']));
  },

  async upsertUsers(users: User[]): Promise<void> {
    const rows = users.map(u => toDb({
      id: u.id, email: u.email, name: u.name, avatar: u.avatar || null, role: u.role || 'VIEWER'
    }));
    await sb.from('users').upsert(rows as any, { onConflict: 'id' });
  },

  async seedAll(teams: Team[], players: Player[], tournaments: Tournament[], matches: Match[], users: User[]): Promise<void> {
    await this.upsertUsers(users);
    await this.upsertTeams(teams);
    await this.upsertPlayers(players);
    await this.upsertTournaments(tournaments);
    await this.upsertMatches(matches);
  }
};

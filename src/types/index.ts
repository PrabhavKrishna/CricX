export type GlobalRole = 'USER';

export type TournamentRole = 'HOST' | 'ADMIN' | 'SCORER' | 'VIEWER';

export type MatchStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED';

export type WicketType =
  | 'BOWLED'
  | 'CAUGHT'
  | 'LBW'
  | 'RUN_OUT'
  | 'STUMPED'
  | 'HIT_WICKET'
  | 'RETIRED_HURT';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: TournamentRole | 'SUPER_ADMIN' | 'SCORER';
}

export interface TournamentMember {
  userId: string;
  role: TournamentRole;
}

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  battingStyle: string;
  bowlingStyle: string;
  teamId: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  players: Player[];
}

export interface CustomBallRule {
  id: string;
  label: string;
  runsModifier: number;
  isLegal: boolean;
  triggersFreeHit: boolean;
  multiplier: number;
}

export interface Tournament {
  id: string;
  name: string;
  hostId: string;
  format: 'LEAGUE' | 'KNOCKOUT' | 'PLAYOFFS';
  startDate: string;
  endDate: string;
  oversPerMatch: number;
  ballsPerOver: number;
  runsPerWide: number;
  runsPerNoBall: number;
  pointsForWin: number;
  pointsForTie: number;
  pointsForLoss: number;
  maxBouncersPerOver: number;
  waistHeightLimitCm: number;
  customBallRules: CustomBallRule[];
  squads: { [teamId: string]: string[] };
  members: TournamentMember[];
}

export interface TournamentStanding {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  netRunRate: number;
}

export interface MatchBatter {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  outType?: WicketType;
  bowlerId?: string;
  isOut?: boolean;
  active?: boolean;
}

export interface MatchBowler {
  playerId: string;
  name: string;
  overs: number;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface Ball {
  id: string;
  overNumber: number;
  ballNumber: number;
  batterId: string;
  bowlerId: string;
  runsBatter: number;
  runsExtra: number;
  extraType?: 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | string;
  isWicket: boolean;
  wicketType?: WicketType;
  wagonWheelAngle?: number;
  commentary?: string;
  isFreeHit?: boolean;
}

export interface Innings {
  teamNumber: 1 | 2;
  battingTeamId: string;
  runs: number;
  wickets: number;
  overs: number;
  ballsBowled: number;
  ballsList: Ball[];
  batters: MatchBatter[];
  bowlers: MatchBowler[];
}

export interface Match {
  id: string;
  tournamentId?: string;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
  venue: string;
  date: string;
  tossWinnerId?: string;
  tossDecision?: 'BAT' | 'BOWL';
  oversCount: number;
  innings: Innings[];
  currentInnings: number;
  scorerId?: string;
  winnerId?: string;
}

export interface CommentaryFeedItem {
  id: string;
  overNumber: number;
  ballNumber: number;
  text: string;
  isWicket: boolean;
  isBoundary: boolean;
  timestamp: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  color: string;
  is_public: boolean;
  owner_id: string;
  created_at: string;
  players?: Player[];
}

export interface Player {
  id: string;
  name: string;
  team_id: string;
  batting_style: 'RHB' | 'LHB' | null;
  bowling_style: string | null;
  photo_url: string | null;
  created_at: string;
  // Optional runtime stats for UI display
  stats?: BatsmanStats;
}

export type MatchFormat = 'T20' | 'T10' | 'Custom';
export type MatchStatus = 'upcoming' | 'live' | 'completed' | 'abandoned';
export type TossDecision = 'bat' | 'field' | null;

export interface Match {
  id: string;
  name: string;
  format: MatchFormat;
  overs_limit: number;
  venue: string | null;
  match_date: string;
  status: MatchStatus;
  winner_id: string | null;
  created_by: string;
  is_public: boolean;
  created_at: string;
  toss_winner_id: string | null;
  toss_decision: TossDecision;
  match_teams?: MatchTeam[];
  custom_rules?: CustomRule[];
  innings?: Innings[];
}

export interface MatchTeam {
  id: string;
  match_id: string;
  team_id: string;
  batting_order: number;
  team?: Team;
}

export interface CustomRule {
  id: string;
  match_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  priority: number;
  is_enabled: boolean;
  created_by: string;
  created_at: string;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
}

export type RuleField =
  | 'batsman'
  | 'bowler'
  | 'ball_runs'
  | 'over_number'
  | 'score'
  | 'wickets'
  | 'dismissal_type'
  | 'extra_type'
  | 'custom';

export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'contains'
  | 'in';

export type RuleActionType =
  | 'bonus_runs'
  | 'deduct_runs'
  | 'modify_runs'
  | 'message'
  | 'extra_ball'
  | 'nullify_ball'
  | 'retire_batsman'
  | 'award_wicket';

export type RuleTarget = 'batting' | 'bowling' | 'both';

export interface RuleCondition {
  id: string;
  rule_id: string;
  field: RuleField;
  operator: RuleOperator;
  value: string | number | boolean;
}

export interface RuleAction {
  id: string;
  rule_id: string;
  action_type: RuleActionType;
  action_value: string | number;
  target: RuleTarget;
}

export interface Innings {
  id: string;
  match_id: string;
  batting_team_id: string;
  innings_number: number;
  total_runs: number;
  total_wickets: number;
  overs_bowled: string;
  is_completed: boolean;
  is_declared: boolean;
  dls_target?: number | null;
  dls_par_score?: number | null;
  balls?: Ball[];
}

export type DismissalType =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run_out'
  | 'stumped'
  | 'hit_wicket'
  | 'obstructing'
  | 'retired_hurt'
  | 'not_out';

export type ExtraType = 'wide' | 'no_ball' | 'bye' | 'leg_bye';

export interface Ball {
  id: string;
  innings_id: string;
  over_number: number;
  ball_number: number;
  batsman_id: string;
  bowler_id: string;
  runs: number;
  extras_type: ExtraType | null;
  extras_runs: number;
  dismissal_type: DismissalType | null;
  dismissal_player_id: string | null;
  custom_rule_triggered_id: string | null;
  custom_rule_name: string | null;
  special_ball: boolean;
  special_ball_description: string | null;
  special_ball_action: string | null;
  timestamp: string;
}

export interface SpecialBallEvent {
  id: string;
  ball_number: number;
  over_number: number;
  runs: number;
  rule_name: string;
  rule_id: string;
  description: string;
  action_type: RuleActionType;
  action_value: number | string;
}

export interface BowlerStats {
  id: string;
  name: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface BatsmanStats {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strike_rate: number;
  dismissal: DismissalType | null;
  dismissal_by: string | null;
}

export interface Partnership {
  batsman_1: string;
  batsman_2: string;
  runs: number;
  balls: number;
}

export interface FallOfWicket {
  wickets: number;
  runs: number;
  over: string;
}

export interface NRRData {
  runs_scored: number;
  overs_faced: number;
  runs_conceded: number;
  overs_bowled: number;
  nrr: number;
}

export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TournamentStatus;
  created_by: string;
  is_public: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  tournament_teams?: TournamentTeam[];
  matches?: Match[];
}

export interface TournamentTeam {
  id: string;
  tournament_id: string;
  team_id: string;
  group_name: string | null;
  points: number;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  matches_tied: number;
  no_result: number;
  net_run_rate: number;
  team?: Team;
}

export interface TournamentRule {
  id: string;
  tournament_id: string;
  rule_template_id: string | null;
  name: string;
  description: string | null;
  config: Record<string, any>;
  created_at: string;
}
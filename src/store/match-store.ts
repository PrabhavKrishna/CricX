import { create } from 'zustand';
import type {
  Match,
  Team,
  Player,
  Innings,
  Ball,
  CustomRule,
  SpecialBallEvent,
} from '@/types';

interface MatchState {
  // Match data
  match: Match | null;
  teams: Team[];
  currentInnings: Innings | null;
  balls: Ball[];
  specialBalls: SpecialBallEvent[];
  customRules: CustomRule[];

  // Scoring state
  battingOrder: Player[];
  bowlingOrder: Player[];
  strikerId: string | null;
  nonStrikerId: string | null;
  currentBowlerId: string | null;
  currentOverBallCount: number;
  inningsId: string | null;

  // Actions
  initMatch: (match: Match, teams: Team[], rules: CustomRule[]) => void;
  startInnings: (innings: Innings) => void;
  setInningsId: (id: string) => void;
  addBall: (ball: Ball, specialBalls?: SpecialBallEvent[]) => void;
  removeLastBall: () => void;
  setStriker: (playerId: string) => void;
  setNonStriker: (playerId: string) => void;
  setBowler: (playerId: string) => void;
  swapStriker: () => void;
  endOver: () => void;
  resetMatch: () => void;
  setBattingOrderFromPlayers: (players: Player[]) => void;
  setBowlingOrderFromPlayers: (players: Player[]) => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  match: null,
  teams: [],
  currentInnings: null,
  balls: [],
  specialBalls: [],
  customRules: [],
  battingOrder: [],
  bowlingOrder: [],
  strikerId: null,
  nonStrikerId: null,
  currentBowlerId: null,
  currentOverBallCount: 0,
  inningsId: null,

  initMatch: (match, teams, rules) => {
    const battingTeam = teams[0];
    const bowlingTeam = teams[1];
    set({
      match,
      teams,
      customRules: rules,
      battingOrder: battingTeam?.players || [],
      bowlingOrder: bowlingTeam?.players || [],
      strikerId: battingTeam?.players?.[0]?.id || null,
      nonStrikerId: battingTeam?.players?.[1]?.id || null,
      currentBowlerId: bowlingTeam?.players?.[0]?.id || null,
      currentOverBallCount: 0,
      balls: [],
      specialBalls: [],
      inningsId: null,
    });
  },

  startInnings: (innings) => {
    set({ currentInnings: innings, inningsId: innings.id });
  },

  setInningsId: (id) => {
    set({ inningsId: id });
  },

  addBall: (ball, specialBalls = []) => {
    set((state) => ({
      balls: [...state.balls, ball],
      currentOverBallCount: state.currentOverBallCount + 1,
      specialBalls: [...state.specialBalls, ...specialBalls],
    }));
  },

  removeLastBall: () => {
    set((state) => {
      const newBalls = state.balls.slice(0, -1);
      const removedBall = state.balls[state.balls.length - 1];
      const removedSpecial = state.specialBalls.filter(
        (sb) => sb.over_number === removedBall?.over_number && sb.ball_number === removedBall?.ball_number
      );
      const newOverCount = removedBall
        ? state.currentOverBallCount === 0
          ? 5
          : state.currentOverBallCount - 1
        : state.currentOverBallCount;
      return {
        balls: newBalls,
        specialBalls: state.specialBalls.filter(
          (sb) => !removedSpecial.some((rs) => rs.id === sb.id)
        ),
        currentOverBallCount: newOverCount,
      };
    });
  },

  setStriker: (playerId) => set({ strikerId: playerId }),
  setNonStriker: (playerId) => set({ nonStrikerId: playerId }),
  setBowler: (playerId) => set({ currentBowlerId: playerId }),

  swapStriker: () => {
    const { strikerId, nonStrikerId } = get();
    set({ strikerId: nonStrikerId, nonStrikerId: strikerId });
  },

  endOver: () => {
    set({ currentOverBallCount: 0 });
    const { strikerId, nonStrikerId } = get();
    set({ strikerId: nonStrikerId, nonStrikerId: strikerId });
  },

  resetMatch: () => {
    set({
      match: null,
      teams: [],
      currentInnings: null,
      balls: [],
      specialBalls: [],
      customRules: [],
      battingOrder: [],
      bowlingOrder: [],
      strikerId: null,
      nonStrikerId: null,
      currentBowlerId: null,
      currentOverBallCount: 0,
      inningsId: null,
    });
  },

  setBattingOrderFromPlayers: (players) => {
    set({
      battingOrder: players,
      strikerId: players[0]?.id || null,
      nonStrikerId: players[1]?.id || null,
    });
  },

  setBowlingOrderFromPlayers: (players) => {
    set({
      bowlingOrder: players,
      currentBowlerId: players[0]?.id || null,
    });
  },
}));

// Rule engine - evaluates rules on every ball
export function evaluateRules(
  rules: CustomRule[],
  ball: Partial<Ball>,
  context: {
    batsmanRuns: number;
    totalScore: number;
    overNumber: number;
    wickets: number;
  }
): SpecialBallEvent[] {
  const triggered: SpecialBallEvent[] = [];

  for (const rule of rules) {
    if (!rule.is_enabled) continue;

    let conditionMet = true;
    for (const condition of rule.conditions || []) {
      let fieldValue: string | number | boolean;

      switch (condition.field) {
        case 'ball_runs':
          fieldValue = ball.runs || 0;
          break;
        case 'over_number':
          fieldValue = context.overNumber;
          break;
        case 'score':
          fieldValue = context.totalScore;
          break;
        case 'wickets':
          fieldValue = context.wickets;
          break;
        case 'dismissal_type':
          fieldValue = ball.dismissal_type || '';
          break;
        default:
          fieldValue = 0;
      }

      switch (condition.operator) {
        case 'equals':
          conditionMet = conditionMet && fieldValue === condition.value;
          break;
        case 'greater_than':
          conditionMet = conditionMet && (fieldValue as number) > (condition.value as number);
          break;
        case 'less_than':
          conditionMet = conditionMet && (fieldValue as number) < (condition.value as number);
          break;
        case 'in':
          const values = (condition.value as string).split(',');
          conditionMet = conditionMet && values.includes(String(fieldValue));
          break;
      }

      if (!conditionMet) break;
    }

    if (conditionMet && rule.actions?.length) {
      const action = rule.actions[0];
      triggered.push({
        id: `sb-${Date.now()}-${Math.random()}`,
        ball_number: ball.ball_number || 1,
        over_number: context.overNumber,
        runs: action.action_type === 'bonus_runs' ? Number(action.action_value) : 0,
        rule_name: rule.name,
        rule_id: rule.id,
        description: `${action.action_type.replace('_', ' ')}: ${action.action_value}`,
        action_type: action.action_type,
        action_value: action.action_value,
      });
    }
  }

  return triggered;
}

// Helper: calculate NRR
export function calculateNRR(
  runsScored: number,
  oversFaced: number,
  runsConceded: number,
  oversBowled: number
): number {
  if (oversBowled === 0 || oversFaced === 0) return 0;
  const nrr = (runsScored / oversFaced) - (runsConceded / oversBowled);
  return Math.round(nrr * 100) / 100;
}

// Helper: calculate required run rate
export function calculateRRR(
  runsNeeded: number,
  ballsRemaining: number
): number {
  if (ballsRemaining === 0) return 0;
  return (runsNeeded * 6) / ballsRemaining;
}

// Helper: format overs string
export function formatOvers(balls: number): string {
  const fullOvers = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return `${fullOvers}.${remainingBalls}`;
}

// Helper: calculate strike rate
export function calculateSR(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return Math.round((runs / balls) * 100 * 100) / 100;
}

// DLS resource table (simplified - percentage of resources remaining)
const dlsResources: Record<number, number> = {
  50: 100, 49: 98.7, 48: 97.4, 47: 96, 46: 94.6, 45: 93.1, 44: 91.6, 43: 90.1, 42: 88.5,
  41: 86.9, 40: 85.2, 39: 83.6, 38: 81.8, 37: 80.1, 36: 78.3, 35: 76.5, 34: 74.6, 33: 72.8,
  32: 70.9, 31: 68.9, 30: 67, 29: 65, 28: 63, 27: 60.9, 26: 58.9, 25: 56.8, 24: 54.6,
  23: 52.5, 22: 50.3, 21: 48.1, 20: 45.8, 19: 43.6, 18: 41.3, 17: 39, 16: 36.7, 15: 34.3,
  14: 31.9, 13: 29.5, 12: 27, 11: 24.5, 10: 22, 9: 19.4, 8: 16.8, 7: 14.1, 6: 11.4,
  5: 8.6, 4: 5.9, 3: 3.1, 2: 1.5, 1: 0.5, 0: 0,
};

export function calculateDLSTarget(
  firstInningsRuns: number,
  oversRemaining: number,
  wicketsRemaining: number = 10
): { target: number; parScore: number } {
  const oversFaced = 50 - oversRemaining;
  const resourceKey = Math.min(50, oversFaced);
  const resourceFaced = dlsResources[resourceKey] || 0;
  const resourceRemaining = 100 - resourceFaced;

  const target = Math.round(firstInningsRuns * (resourceRemaining / 100)) + 1;
  const parScore = Math.round(firstInningsRuns * (resourceRemaining / 100));

  return { target, parScore };
}
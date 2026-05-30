import { create } from 'zustand';
import { 
  User, Team, Player, Tournament, Match, Ball, MatchStatus, 
  WicketType, MatchBatter, MatchBowler, TournamentStanding, CustomBallRule,
  TournamentRole 
} from '../types';
import { supabaseService } from '../lib/supabase-service';

interface ScoringStore {
  // --- AUTH & ROLES ---
  currentUser: User | null;
  usersList: User[];
  login: (email: string, name: string, role: User['role']) => void;
  logout: () => void;
  promoteUser: (userId: string, role: User['role']) => void;
  // sync session user from NextAuth
  syncSessionUser: (email: string, name: string, avatar?: string) => void;
  // --- TOURNAMENT MEMBER MANAGEMENT ---
  addTournamentMember: (tournamentId: string, userId: string, role: TournamentRole) => void;
  promoteTournamentMember: (tournamentId: string, userId: string, role: TournamentRole) => void;

  // --- SEED LISTS ---
  teams: Team[];
  players: Player[];
  tournaments: Tournament[];
  matches: Match[];
  
  // --- ACTIVE SCORING ENGINE ---
  activeMatchId: string | null;
  strikerId: string | null;
  nonStrikerId: string | null;
  activeBowlerId: string | null;
  undoStack: string[]; // Holds JSON serialized states of Match
  redoStack: string[];
  isFreeHit: boolean;

  // --- CUSTOM SPECIALTY BALLS ---
  createCustomBallRule: (tournamentId: string, rule: Omit<CustomBallRule, 'id'>) => void;
  
  // --- TOURNAMENT CREATOR & ROSTER & SCHEDULER ---
  createTournament: (name: string, format: Tournament['format'], overs: number, customRules?: Partial<Tournament>) => string;
  assignSquads: (tournamentId: string, teamId: string, playerIds: string[]) => void;
  generateFixtures: (tournamentId: string, type: 'ROUND_ROBIN' | 'PLAYOFFS' | 'CUSTOM') => void;
  createCustomMatch: (tournamentId: string, homeTeamId: string, awayTeamId: string, venue: string, date: string) => void;
  assignScorer: (matchId: string, scorerId: string) => void;

  // --- MATCH CONTROL ---
  startMatch: (matchId: string) => void;
  setToss: (matchId: string, winnerId: string, decision: 'BAT' | 'BOWL') => void;
  setActivePlayers: (strikerId: string, nonStrikerId: string, bowlerId: string) => void;
  changeStriker: (newStrikerId: string) => void;
  changeBowler: (newBowlerId: string) => void;
  swapStrikers: () => void;

  // --- SCORING ACTIONS ---
  recordBall: (data: {
    runsBatter: number;
    runsExtra: number;
    extraType?: string; // "WIDE", "NO_BALL", "BYE", "LEG_BYE" or custom ball ID
    isWicket: boolean;
    wicketType?: WicketType;
    wagonWheelAngle?: number;
    customCommentary?: string;
  }) => void;
  undoBall: () => void;
  redoBall: () => void;

  // --- ADMIN RETROACTIVE CORRECTOR ---
  adminOverrideBall: (
    matchId: string, 
    inningsIndex: number, 
    ballId: string, 
    updatedFields: Partial<Ball>
  ) => void;

  // --- SUPABASE PERSISTENCE ---
  initialized: boolean;
  initializeFromSupabase: () => Promise<void>;
}

// --- HELPER TO CALCULATE OVER DISPLAY ---
export const getOverDisplay = (ballsCount: number, ballsPerOver: number = 6): number => {
  const overs = Math.floor(ballsCount / ballsPerOver);
  const balls = ballsCount % ballsPerOver;
  return Number(`${overs}.${balls}`);
};

// --- PRE-SEEDED CORE PLAYERS & TEAMS ---
const MOCK_PLAYERS: Player[] = [
  // Team 1: Mumbai Legends (MI)
  { id: 'p-1', name: 'Sachin Tendulkar', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', teamId: 't-1' },
  { id: 'p-2', name: 'Rohit Sharma', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', teamId: 't-1' },
  { id: 'p-3', name: 'Suryakumar Yadav', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', teamId: 't-1' },
  { id: 'p-4', name: 'Hardik Pandya', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', teamId: 't-1' },
  { id: 'p-5', name: 'Jasprit Bumrah', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', teamId: 't-1' },
  
  // Team 2: Chennai Titans (CSK)
  { id: 'p-6', name: 'MS Dhoni', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', teamId: 't-2' },
  { id: 'p-7', name: 'Ruturaj Gaikwad', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', teamId: 't-2' },
  { id: 'p-8', name: 'Ravindra Jadeja', battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', teamId: 't-2' },
  { id: 'p-9', name: 'Shivam Dube', battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm medium', teamId: 't-2' },
  { id: 'p-10', name: 'Matheesha Pathirana', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', teamId: 't-2' },

  // Team 3: Bangalore Royals (RCB)
  { id: 'p-11', name: 'Virat Kohli', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', teamId: 't-3' },
  { id: 'p-12', name: 'Faf du Plessis', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', teamId: 't-3' },
  { id: 'p-13', name: 'Glenn Maxwell', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', teamId: 't-3' },
  { id: 'p-14', name: 'Dinesh Karthik', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', teamId: 't-3' },
  { id: 'p-15', name: 'Mohammed Siraj', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', teamId: 't-3' },

  // Team 4: Delhi Gunners (DC)
  { id: 'p-16', name: 'Rishabh Pant', battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm offbreak', teamId: 't-4' },
  { id: 'p-17', name: 'Axar Patel', battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', teamId: 't-4' },
  { id: 'p-18', name: 'Kuldeep Yadav', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm chinaman', teamId: 't-4' },
  { id: 'p-19', name: 'David Warner', battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm legbreak', teamId: 't-4' },
  { id: 'p-20', name: 'Anrich Nortje', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', teamId: 't-4' },
];

const MOCK_TEAMS: Team[] = [
  { id: 't-1', name: 'Mumbai Legends', shortName: 'MI', logo: '/teams/mi.png', players: MOCK_PLAYERS.filter(p => p.teamId === 't-1') },
  { id: 't-2', name: 'Chennai Titans', shortName: 'CSK', logo: '/teams/csk.png', players: MOCK_PLAYERS.filter(p => p.teamId === 't-2') },
  { id: 't-3', name: 'Bangalore Royals', shortName: 'RCB', logo: '/teams/rcb.png', players: MOCK_PLAYERS.filter(p => p.teamId === 't-3') },
  { id: 't-4', name: 'Delhi Gunners', shortName: 'DC', logo: '/teams/dc.png', players: MOCK_PLAYERS.filter(p => p.teamId === 't-4') },
];

// --- PRE-SEEDED COMPLETED AND LIVE MATCH DEMO STATES ---
const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: 'tour-1',
    name: 'cricX Cyber League 2026',
    format: 'LEAGUE',
    startDate: '2026-05-20',
    endDate: '2026-06-15',
    oversPerMatch: 5, // T5 for high density mock speed
    ballsPerOver: 6,
    runsPerWide: 1,
    runsPerNoBall: 1,
    pointsForWin: 2,
    pointsForTie: 1,
    pointsForLoss: 0,
    maxBouncersPerOver: 2,
    waistHeightLimitCm: 110,
      customBallRules: [
        { id: 'cb-1', label: 'Joker Double Ball', runsModifier: 0, isLegal: true, triggersFreeHit: false, multiplier: 2.0 },
        { id: 'cb-2', label: 'Dead Penalty Ball', runsModifier: 1, isLegal: false, triggersFreeHit: true, multiplier: 1.0 },
      ],
      hostId: 'u-1',
      members: [{ userId: 'u-1', role: 'HOST' }],
      squads: {
      't-1': ['p-1', 'p-2', 'p-3', 'p-4', 'p-5'],
      't-2': ['p-6', 'p-7', 'p-8', 'p-9', 'p-10'],
      't-3': ['p-11', 'p-12', 'p-13', 'p-14', 'p-15'],
      't-4': ['p-16', 'p-17', 'p-18', 'p-19', 'p-20'],
    }
  }
];

const INITIAL_USERS: User[] = [
  { id: 'u-1', email: 'mac@cricx.com', name: 'Admin Mac', role: 'SUPER_ADMIN', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
  { id: 'u-2', email: 'sam@cricx.com', name: 'Scorer Sam', role: 'SCORER', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
  { id: 'u-3', email: 'viewer@cricx.com', name: 'Fan Fred', role: 'VIEWER', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80' },
];

const INITIAL_MATCHES: Match[] = [
  {
    id: 'm-live',
    tournamentId: 'tour-1',
    homeTeamId: 't-1', // MI
    awayTeamId: 't-2', // CSK
    status: 'LIVE',
    venue: 'Cyber Wankhede Stadium, Mumbai',
    date: '2026-05-27T19:30:00Z',
    tossWinnerId: 't-1',
    tossDecision: 'BAT',
    oversCount: 5,
    currentInnings: 1,
    scorerId: 'u-2',
    innings: [
      {
        teamNumber: 1,
        battingTeamId: 't-1', // MI batting
        runs: 54,
        wickets: 2,
        overs: 3.4,
        ballsBowled: 22,
        ballsList: [
          { id: 'b1', overNumber: 1, ballNumber: 1, batterId: 'p-1', bowlerId: 'p-10', runsBatter: 4, runsExtra: 0, isWicket: false, wagonWheelAngle: 120, commentary: 'Pathirana to Tendulkar: FOUR runs! Elegant cover drive through extra cover.' },
          { id: 'b2', overNumber: 1, ballNumber: 2, batterId: 'p-1', bowlerId: 'p-10', runsBatter: 1, runsExtra: 0, isWicket: false, wagonWheelAngle: 45, commentary: 'Pathirana to Tendulkar: 1 run, pushed to third man.' },
          { id: 'b3', overNumber: 1, ballNumber: 3, batterId: 'p-2', bowlerId: 'p-10', runsBatter: 6, runsExtra: 0, isWicket: false, wagonWheelAngle: 280, commentary: 'Pathirana to Rohit Sharma: SIX runs! Majestic pull shot over deep midwicket!' },
          { id: 'b4', overNumber: 1, ballNumber: 4, batterId: 'p-2', bowlerId: 'p-10', runsBatter: 0, runsExtra: 0, isWicket: true, wicketType: 'CAUGHT', commentary: 'Pathirana to Rohit Sharma: OUT! Caught by Ravindra Jadeja! Leading edge loops to point. Big blow!' },
          { id: 'b5', overNumber: 1, ballNumber: 5, batterId: 'p-3', bowlerId: 'p-10', runsBatter: 0, runsExtra: 1, extraType: 'WIDE', isWicket: false, commentary: 'Pathirana to Suryakumar Yadav: WIDE down the leg side.' },
          { id: 'b6', overNumber: 1, ballNumber: 5, batterId: 'p-3', bowlerId: 'p-10', runsBatter: 2, runsExtra: 0, isWicket: false, wagonWheelAngle: 180, commentary: 'Pathirana to Suryakumar Yadav: 2 runs, flicked through square leg.' },
          { id: 'b7', overNumber: 1, ballNumber: 6, batterId: 'p-3', bowlerId: 'p-10', runsBatter: 1, runsExtra: 0, isWicket: false, wagonWheelAngle: 90, commentary: 'Pathirana to Suryakumar Yadav: 1 run, guided to deep cover.' },
          // Over 2 ( Jadeja )
          { id: 'b8', overNumber: 2, ballNumber: 1, batterId: 'p-3', bowlerId: 'p-8', runsBatter: 1, runsExtra: 0, isWicket: false, wagonWheelAngle: 10, commentary: 'Jadeja to Suryakumar Yadav: 1 run, pushed down to long off.' },
          { id: 'b9', overNumber: 2, ballNumber: 2, batterId: 'p-1', bowlerId: 'p-8', runsBatter: 0, runsExtra: 0, isWicket: false, wagonWheelAngle: 0, commentary: 'Jadeja to Tendulkar: Dot ball, blocked on the front foot.' },
          { id: 'b10', overNumber: 2, ballNumber: 3, batterId: 'p-1', bowlerId: 'p-8', runsBatter: 4, runsExtra: 0, isWicket: false, wagonWheelAngle: 220, commentary: 'Jadeja to Tendulkar: FOUR runs! Incredible sweep shot past fine leg.' },
          { id: 'b11', overNumber: 2, ballNumber: 4, batterId: 'p-1', bowlerId: 'p-8', runsBatter: 1, runsExtra: 0, isWicket: false, wagonWheelAngle: 130, commentary: 'Jadeja to Tendulkar: 1 run, eased through cover.' },
          { id: 'b12', overNumber: 2, ballNumber: 5, batterId: 'p-3', bowlerId: 'p-8', runsBatter: 6, runsExtra: 0, isWicket: false, wagonWheelAngle: 300, commentary: 'Jadeja to Suryakumar Yadav: SIX! The trademark sweep over backward square leg!' },
          { id: 'b13', overNumber: 2, ballNumber: 6, batterId: 'p-3', bowlerId: 'p-8', runsBatter: 2, runsExtra: 0, isWicket: false, wagonWheelAngle: 15, commentary: 'Jadeja to Suryakumar Yadav: 2 runs, driven to deep extra cover.' },
          // Over 3 ( Pathirana )
          { id: 'b14', overNumber: 3, ballNumber: 1, batterId: 'p-3', bowlerId: 'p-10', runsBatter: 1, runsExtra: 0, isWicket: false, wagonWheelAngle: 90, commentary: 'Pathirana to Suryakumar Yadav: 1 run, to wide long off.' },
          { id: 'b15', overNumber: 3, ballNumber: 2, batterId: 'p-1', bowlerId: 'p-10', runsBatter: 0, runsExtra: 0, isWicket: true, wicketType: 'BOWLED', commentary: 'Pathirana to Tendulkar: BOWLED! Yorked him clean! Off-stump cartwheels. Superb delivery!' },
          { id: 'b16', overNumber: 3, ballNumber: 3, batterId: 'p-4', bowlerId: 'p-10', runsBatter: 1, runsExtra: 0, isWicket: false, wagonWheelAngle: 30, commentary: 'Pathirana to Hardik Pandya: 1 run, off the mark immediately.' },
          { id: 'b17', overNumber: 3, ballNumber: 4, batterId: 'p-3', bowlerId: 'p-10', runsBatter: 6, runsExtra: 0, isWicket: false, wagonWheelAngle: 260, commentary: 'Pathirana to Suryakumar Yadav: SIX runs! Dynamic helicopter-like flick over mid-wicket!' },
          { id: 'b18', overNumber: 3, ballNumber: 5, batterId: 'p-3', bowlerId: 'p-10', runsBatter: 4, runsExtra: 0, isWicket: false, wagonWheelAngle: 110, commentary: 'Pathirana to Suryakumar Yadav: FOUR runs! Sliced behind point with precision.' },
          { id: 'b19', overNumber: 3, ballNumber: 6, batterId: 'p-3', bowlerId: 'p-10', runsBatter: 1, runsExtra: 0, isWicket: false, wagonWheelAngle: 85, commentary: 'Pathirana to Suryakumar Yadav: 1 run, keeps strike with a single to cover.' },
          // Over 4 ( Dube )
          { id: 'b20', overNumber: 4, ballNumber: 1, batterId: 'p-3', bowlerId: 'p-9', runsBatter: 6, runsExtra: 0, isWicket: false, wagonWheelAngle: 290, commentary: 'Dube to Suryakumar Yadav: SIX runs! Massive launch over cow corner.' },
          { id: 'b21', overNumber: 4, ballNumber: 2, batterId: 'p-3', bowlerId: 'p-9', runsBatter: 2, runsExtra: 0, isWicket: false, wagonWheelAngle: 115, commentary: 'Dube to Suryakumar Yadav: 2 runs, slapped down to deep sweep.' },
          { id: 'b22', overNumber: 4, ballNumber: 3, batterId: 'p-3', bowlerId: 'p-9', runsBatter: 1, runsExtra: 0, isWicket: false, wagonWheelAngle: 45, commentary: 'Dube to Suryakumar Yadav: 1 run, sliced to deep third.' },
        ],
        batters: [
          { playerId: 'p-1', name: 'Sachin Tendulkar', runs: 11, balls: 6, fours: 2, sixes: 0, strikeRate: 183.3, outType: 'BOWLED', bowlerId: 'p-10', isOut: true },
          { playerId: 'p-2', name: 'Rohit Sharma', runs: 6, balls: 2, fours: 0, sixes: 1, strikeRate: 300, outType: 'CAUGHT', bowlerId: 'p-10', isOut: true },
          { playerId: 'p-3', name: 'Suryakumar Yadav', runs: 35, balls: 13, fours: 2, sixes: 4, strikeRate: 269.2, active: true },
          { playerId: 'p-4', name: 'Hardik Pandya', runs: 1, balls: 1, fours: 0, sixes: 0, strikeRate: 100.0, active: true },
        ],
        bowlers: [
          { playerId: 'p-10', name: 'Matheesha Pathirana', overs: 2, balls: 12, maidens: 0, runs: 28, wickets: 2, economy: 14.0 },
          { playerId: 'p-8', name: 'Ravindra Jadeja', overs: 1, balls: 6, maidens: 0, runs: 14, wickets: 0, economy: 14.0 },
          { playerId: 'p-9', name: 'Shivam Dube', overs: 0.3, balls: 3, maidens: 0, runs: 9, wickets: 0, economy: 18.0 },
        ],
      },
      {
        teamNumber: 2,
        battingTeamId: 't-2', // CSK target
        runs: 0,
        wickets: 0,
        overs: 0,
        ballsBowled: 0,
        ballsList: [],
        batters: [],
        bowlers: [],
      }
    ]
  },
  {
    id: 'm-2',
    tournamentId: 'tour-1',
    homeTeamId: 't-3',
    awayTeamId: 't-4',
    status: 'UPCOMING',
    venue: 'Cyber Chinnaswamy Stadium, Bengaluru',
    date: '2026-05-28T19:30:00Z',
    oversCount: 5,
    currentInnings: 1,
    innings: [],
  },
  {
    id: 'm-completed',
    tournamentId: 'tour-1',
    homeTeamId: 't-3',
    awayTeamId: 't-4',
    status: 'COMPLETED',
    venue: 'Cyber Chinnaswamy Stadium, Bengaluru',
    date: '2026-05-26T19:30:00Z',
    oversCount: 5,
    currentInnings: 2,
    winnerId: 't-3',
    innings: [
      {
        teamNumber: 1,
        battingTeamId: 't-4',
        runs: 48,
        wickets: 4,
        overs: 5.0,
        ballsBowled: 30,
        ballsList: [],
        batters: [],
        bowlers: []
      },
      {
        teamNumber: 2,
        battingTeamId: 't-3',
        runs: 49,
        wickets: 2,
        overs: 4.2,
        ballsBowled: 26,
        ballsList: [],
        batters: [],
        bowlers: []
      }
    ]
  }
];

export const useScoringStore = create<ScoringStore>((set, get) => ({
  // --- AUTH STATES ---
  currentUser: INITIAL_USERS[0], // Seed as Admin mac on load
  usersList: INITIAL_USERS,
  login: (email, name, role) => {
    const existing = get().usersList.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      set({ currentUser: existing });
    } else {
      const newUser: User = { id: `u-${Date.now()}`, email, name, role };
      set(state => ({
        usersList: [...state.usersList, newUser],
        currentUser: newUser
      }));
      supabaseService.upsertUsers(get().usersList);
    }
  },
  logout: () => set({ currentUser: null }),
  promoteUser: (userId, role) => {
    set(state => ({
      usersList: state.usersList.map(u => u.id === userId ? { ...u, role } : u),
      currentUser: state.currentUser?.id === userId ? { ...state.currentUser, role } : state.currentUser
    }));
    supabaseService.upsertUsers(get().usersList);
  },
  addTournamentMember: (tournamentId, userId, role) => {
    set(state => ({
      tournaments: state.tournaments.map(t => {
        if (t.id === tournamentId) {
          const already = t.members?.some(m => m.userId === userId);
          if (already) return t;
          const newMember = { userId, role };
          return { ...t, members: [...(t.members || []), newMember] };
        }
        return t;
      })
    }));
    supabaseService.upsertTournaments(get().tournaments);
  },
  promoteTournamentMember: (tournamentId, userId, role) => {
    set(state => ({
      tournaments: state.tournaments.map(t => {
        if (t.id === tournamentId) {
          return {
            ...t,
            members: (t.members || []).map(m => m.userId === userId ? { ...m, role } : m)
          };
        }
        return t;
      })
    }));
    supabaseService.upsertTournaments(get().tournaments);
  },
  syncSessionUser: (email, name, avatar) => {
    const existing = get().usersList.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      set({ currentUser: existing });
    } else {
      const newUser: User = { id: `u-${Date.now()}`, email, name, avatar, role: 'VIEWER' as any };
      set(state => ({
        usersList: [...state.usersList, newUser],
        currentUser: newUser
      }));
      supabaseService.upsertUsers(get().usersList);
    }
  },
  // --- SEED COLLECTIONS ---
  teams: MOCK_TEAMS,
  players: MOCK_PLAYERS,
  tournaments: INITIAL_TOURNAMENTS,
  matches: INITIAL_MATCHES,

  // --- CORE SYSTEM POINTERS ---
  activeMatchId: 'm-live',
  strikerId: 'p-3',
  nonStrikerId: 'p-4',
  activeBowlerId: 'p-9',
  undoStack: [],
  redoStack: [],
  isFreeHit: false,
  initialized: false,

  initializeFromSupabase: async () => {
    if (get().initialized) return;
    try {
      const [teams, players, tournaments, matches, users] = await Promise.all([
        supabaseService.loadTeams(),
        supabaseService.loadPlayers(),
        supabaseService.loadTournaments(),
        supabaseService.loadMatches(),
        supabaseService.loadUsers(),
      ]);

      if (teams.length === 0) {
        await supabaseService.seedAll(MOCK_TEAMS, MOCK_PLAYERS, INITIAL_TOURNAMENTS, INITIAL_MATCHES, INITIAL_USERS);
        set({
          teams: MOCK_TEAMS,
          players: MOCK_PLAYERS,
          tournaments: INITIAL_TOURNAMENTS,
          matches: INITIAL_MATCHES,
          usersList: INITIAL_USERS,
          currentUser: INITIAL_USERS[0],
          activeMatchId: 'm-live',
          strikerId: 'p-3',
          nonStrikerId: 'p-4',
          activeBowlerId: 'p-9',
          initialized: true,
        });
      } else {
        const liveMatch = matches.find(m => m.status === 'LIVE');

        // Hydrate team.players arrays
        const hydratedTeams = teams.map(t => ({
          ...t,
          players: players.filter(p => p.teamId === t.id)
        }));

        const adminUser = users.find(u => u.role === 'SUPER_ADMIN') || users[0] || null;

        set({
          teams: hydratedTeams,
          players,
          tournaments,
          matches,
          usersList: users,
          currentUser: adminUser,
          activeMatchId: liveMatch?.id || null,
          strikerId: null,
          nonStrikerId: null,
          activeBowlerId: null,
          initialized: true,
        });
      }
    } catch (err) {
      console.error('Failed to initialize from Supabase:', err);
    }
  },

  // --- CUSTOM RULE ACTIONS ---
  createCustomBallRule: (tournamentId, ruleParams) => {
    set(state => ({
      tournaments: state.tournaments.map(t => {
        if (t.id === tournamentId) {
          const newRule: CustomBallRule = {
            ...ruleParams,
            id: `cb-${Date.now()}`
          };
          return {
            ...t,
            customBallRules: [...t.customBallRules, newRule]
          };
        }
        return t;
      })
    }));
    supabaseService.upsertTournaments(get().tournaments);
  },

  // --- TOURNAMENT OPERATIONS ---
  createTournament: (name, format, overs, customRules) => {
    const newId = `tour-${Date.now()}`;
    const newTour: Tournament = {
      id: newId,
      name,
      format,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      oversPerMatch: overs,
      ballsPerOver: customRules?.ballsPerOver ?? 6,
      runsPerWide: customRules?.runsPerWide ?? 1,
      runsPerNoBall: customRules?.runsPerNoBall ?? 1,
      pointsForWin: customRules?.pointsForWin ?? 2,
      pointsForTie: customRules?.pointsForTie ?? 1,
      pointsForLoss: customRules?.pointsForLoss ?? 0,
      maxBouncersPerOver: customRules?.maxBouncersPerOver ?? 2,
      waistHeightLimitCm: customRules?.waistHeightLimitCm ?? 110,
      customBallRules: [],
      hostId: get().currentUser?.id ?? '',
      members: [{ userId: get().currentUser?.id ?? '', role: 'HOST' as any }],
      squads: {
        't-1': [],
        't-2': [],
        't-3': [],
        't-4': []
      }
    };
    set(state => ({ tournaments: [...state.tournaments, newTour] }));
    supabaseService.upsertTournaments(get().tournaments);
    return newId;
  },

  assignSquads: (tournamentId, teamId, playerIds) => {
    set(state => ({
      tournaments: state.tournaments.map(t => {
        if (t.id === tournamentId) {
          return {
            ...t,
            squads: {
              ...t.squads,
              [teamId]: playerIds
            }
          };
        }
        return t;
      })
    }));
    supabaseService.upsertTournaments(get().tournaments);
  },
  createCustomMatch: (tournamentId, homeTeamId, awayTeamId, venue, date) => {
    set(state => {
      const newMatch: Match = {
        id: `m-${Date.now()}`,
        tournamentId,
        homeTeamId,
        awayTeamId,
        status: 'UPCOMING',
        venue,
        date,
        oversCount: state.tournaments.find(t => t.id === tournamentId)?.oversPerMatch ?? 20,
        currentInnings: 1,
        innings: []
      };
      return { matches: [...state.matches, newMatch] };
    });
    supabaseService.upsertMatches(get().matches);
  },

  generateFixtures: (tournamentId, type) => {
    set(state => {
      const tour = state.tournaments.find(t => t.id === tournamentId);
      if (!tour) return {};

      const teamIds = Object.keys(tour.squads);
      if (teamIds.length < 2) return {};

      const generatedMatches: Match[] = [];
      const now = new Date();

      if (type === 'ROUND_ROBIN') {
        for (let i = 0; i < teamIds.length; i++) {
          for (let j = i + 1; j < teamIds.length; j++) {
            const gameDate = new Date(now.getTime() + (generatedMatches.length + 1) * 24 * 60 * 60 * 1000);
            generatedMatches.push({
              id: `m-fixture-${tournamentId}-${i}-${j}`,
              tournamentId,
              homeTeamId: teamIds[i],
              awayTeamId: teamIds[j],
              status: 'UPCOMING',
              venue: 'Cyber Arena Ground',
              date: gameDate.toISOString(),
              oversCount: tour.oversPerMatch,
              currentInnings: 1,
              innings: []
            });
          }
        }
      } else if (type === 'PLAYOFFS') {
        const dates = [1, 2, 3].map(d => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString());

        generatedMatches.push({
          id: `m-playoff-sf1`,
          tournamentId,
          homeTeamId: teamIds[0],
          awayTeamId: teamIds[3] || teamIds[1],
          status: 'UPCOMING',
          venue: 'Main Stadium (SF1)',
          date: dates[0],
          oversCount: tour.oversPerMatch,
          currentInnings: 1,
          innings: []
        });

        generatedMatches.push({
          id: `m-playoff-sf2`,
          tournamentId,
          homeTeamId: teamIds[1],
          awayTeamId: teamIds[2] || teamIds[0],
          status: 'UPCOMING',
          venue: 'Main Stadium (SF2)',
          date: dates[1],
          oversCount: tour.oversPerMatch,
          currentInnings: 1,
          innings: []
        });

        generatedMatches.push({
          id: `m-playoff-final`,
          tournamentId,
          homeTeamId: teamIds[0],
          awayTeamId: teamIds[1],
          status: 'UPCOMING',
          venue: 'Grand Cyber Coliseum (FINAL)',
          date: dates[2],
          oversCount: tour.oversPerMatch,
          currentInnings: 1,
          innings: []
        });
      }

      return {
        matches: [...state.matches.filter(m => m.tournamentId !== tournamentId || m.status === 'LIVE'), ...generatedMatches]
      };
    });
    supabaseService.upsertMatches(get().matches);
  },
  assignScorer: (matchId, scorerId) => {
    set(state => ({
      matches: state.matches.map(m => m.id === matchId ? { ...m, scorerId } : m)
    }));
    supabaseService.upsertMatches(get().matches);
  },

  // --- MATCH ACTIVE FLOW ---
  startMatch: (matchId) => {
    set(state => {
      const match = state.matches.find(m => m.id === matchId);
      if (!match) return {};

      const homeTeam = state.teams.find(t => t.id === match.homeTeamId);
      const awayTeam = state.teams.find(t => t.id === match.awayTeamId);
      if (!homeTeam || !awayTeam) return {};

      const initialInnings = [
        {
          teamNumber: 1 as const,
          battingTeamId: match.homeTeamId,
          runs: 0,
          wickets: 0,
          overs: 0,
          ballsBowled: 0,
          ballsList: [],
          batters: [
            { playerId: homeTeam.players[0].id, name: homeTeam.players[0].name, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, active: true },
            { playerId: homeTeam.players[1].id, name: homeTeam.players[1].name, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, active: true },
          ],
          bowlers: [
            { playerId: awayTeam.players[0].id, name: awayTeam.players[0].name, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0 },
          ],
        },
        {
          teamNumber: 2 as const,
          battingTeamId: match.awayTeamId,
          runs: 0,
          wickets: 0,
          overs: 0,
          ballsBowled: 0,
          ballsList: [],
          batters: [],
          bowlers: [],
        }
      ];

      return {
        activeMatchId: matchId,
        strikerId: homeTeam.players[0].id,
        nonStrikerId: homeTeam.players[1].id,
        activeBowlerId: awayTeam.players[0].id,
        undoStack: [],
        redoStack: [],
        matches: state.matches.map(m => m.id === matchId ? { ...m, status: 'LIVE', innings: initialInnings } : m)
      };
    });
    supabaseService.upsertMatches(get().matches);
  },
  setToss: (matchId, winnerId, decision) => {
    set(state => ({
      matches: state.matches.map(m => {
        if (m.id === matchId) {
          const homeBats = (winnerId === m.homeTeamId && decision === 'BAT') || (winnerId === m.awayTeamId && decision === 'BOWL');
          const batTeamId = homeBats ? m.homeTeamId : m.awayTeamId;
          const bowlTeamId = homeBats ? m.awayTeamId : m.homeTeamId;

          const homeTeam = state.teams.find(t => t.id === batTeamId);
          const awayTeam = state.teams.find(t => t.id === bowlTeamId);

          const freshInnings = [
            {
              teamNumber: 1 as const,
              battingTeamId: batTeamId,
              runs: 0,
              wickets: 0,
              overs: 0,
              ballsBowled: 0,
              ballsList: [],
              batters: homeTeam ? [
                { playerId: homeTeam.players[0].id, name: homeTeam.players[0].name, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, active: true },
                { playerId: homeTeam.players[1].id, name: homeTeam.players[1].name, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, active: true },
              ] : [],
              bowlers: awayTeam ? [
                { playerId: awayTeam.players[0].id, name: awayTeam.players[0].name, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0 },
              ] : [],
            },
            {
              teamNumber: 2 as const,
              battingTeamId: bowlTeamId,
              runs: 0,
              wickets: 0,
              overs: 0,
              ballsBowled: 0,
              ballsList: [],
              batters: [],
              bowlers: [],
            }
          ];

          return {
            ...m,
            tossWinnerId: winnerId,
            tossDecision: decision,
            innings: freshInnings
          };
        }
        return m;
      })
    }));
    supabaseService.upsertMatches(get().matches);
  },

  setActivePlayers: (strikerId, nonStrikerId, bowlerId) => set({
    strikerId,
    nonStrikerId,
    activeBowlerId: bowlerId
  }),

  changeStriker: (newStrikerId) => set({ strikerId: newStrikerId }),
  changeBowler: (newBowlerId) => set({ activeBowlerId: newBowlerId }),
  swapStrikers: () => set(state => ({
    strikerId: state.nonStrikerId,
    nonStrikerId: state.strikerId
  })),

  // --- RECORD BALL ENGINE ---
  recordBall: (ballData) => {
    const { activeMatchId, strikerId, nonStrikerId, activeBowlerId, matches, isFreeHit } = get();
    if (!activeMatchId || !strikerId || !nonStrikerId || !activeBowlerId) return;

    const matchIndex = matches.findIndex(m => m.id === activeMatchId);
    if (matchIndex === -1) return;

    const match = matches[matchIndex];
    // Snapshot state for undo stack
    const stateSnapshot = JSON.stringify(matches);
    const undoStack = [...get().undoStack, stateSnapshot];

    // Work on cloned match
    const clonedMatch = JSON.parse(JSON.stringify(match)) as Match;
    const inningsIndex = clonedMatch.currentInnings - 1;
    const innings = clonedMatch.innings[inningsIndex];

    const tour = get().tournaments.find(t => t.id === clonedMatch.tournamentId);
    const ballsPerOver = tour?.ballsPerOver ?? 6;
    const runsPerWide = tour?.runsPerWide ?? 1;
    const runsPerNoBall = tour?.runsPerNoBall ?? 1;

    // Resolve Specialty Custom Ball rules if extraType starts with "cb-"
    let isLegalBall = true;
    let customBallLabel = '';
    let runsExtra = ballData.runsExtra;
    let runsBatter = ballData.runsBatter;
    let triggersFreeHitNext = false;
    let multiplier = 1.0;

    if (ballData.extraType && ballData.extraType.startsWith('cb-')) {
      const customRule = tour?.customBallRules.find(r => r.id === ballData.extraType);
      if (customRule) {
        customBallLabel = customRule.label;
        runsExtra = customRule.runsModifier;
        isLegalBall = customRule.isLegal;
        triggersFreeHitNext = customRule.triggersFreeHit;
        multiplier = customRule.multiplier;
        runsBatter = Math.round(runsBatter * multiplier);
      }
    } else {
      // Standard Rules
      if (ballData.extraType === 'WIDE') {
        runsExtra = runsPerWide + ballData.runsExtra; // Standard wide penalty + additional runs
        isLegalBall = false;
        runsBatter = 0;
      } else if (ballData.extraType === 'NO_BALL') {
        runsExtra = runsPerNoBall + ballData.runsExtra;
        isLegalBall = false;
        triggersFreeHitNext = true;
      } else if (ballData.extraType === 'BYE' || ballData.extraType === 'LEG_BYE') {
        runsExtra = ballData.runsExtra;
        isLegalBall = true;
        runsBatter = 0;
      }
    }

    // Free Hit validation (batsman can only be run-out on free-hits)
    let isWicketValid = ballData.isWicket;
    if (isFreeHit && isWicketValid) {
      if (ballData.wicketType !== 'RUN_OUT') {
        isWicketValid = false; // Negate bowled, caught, LBW, etc.
      }
    }

    const overNumber = Math.floor(innings.ballsBowled / ballsPerOver) + 1;
    const currentBallsInOver = (innings.ballsBowled % ballsPerOver);
    const ballNumber = isLegalBall ? currentBallsInOver + 1 : currentBallsInOver;

    const ball: Ball = {
      id: `b-${Date.now()}`,
      overNumber,
      ballNumber,
      batterId: strikerId,
      bowlerId: activeBowlerId,
      runsBatter,
      runsExtra,
      extraType: ballData.extraType,
      isWicket: isWicketValid,
      wicketType: isWicketValid ? ballData.wicketType : undefined,
      wagonWheelAngle: ballData.wagonWheelAngle,
      isFreeHit: isFreeHit,
    };

    // Calculate commentary
    const batterName = get().players.find(p => p.id === strikerId)?.name || 'Batter';
    const bowlerName = get().players.find(p => p.id === activeBowlerId)?.name || 'Bowler';
    let commentaryText = `${bowlerName} to ${batterName}: `;

    if (customBallLabel) {
      commentaryText += `[${customBallLabel}] `;
    }

    if (isWicketValid) {
      commentaryText += `WICKET! OUT (${ballData.wicketType})!`;
    } else if (ballData.extraType === 'WIDE') {
      commentaryText += `WIDE delivery! Conceded +${runsExtra} runs extra.`;
    } else if (ballData.extraType === 'NO_BALL') {
      commentaryText += `NO BALL! Conceded +${runsExtra} runs extra. FREE HIT NEXT!`;
    } else {
      const runs = runsBatter + (ballData.extraType === 'BYE' || ballData.extraType === 'LEG_BYE' ? runsExtra : 0);
      if (runs === 6) commentaryText += `SIX RUNS! Unbelievable shot clearing the fence cleanly!`;
      else if (runs === 4) commentaryText += `FOUR RUNS! Pierced the gap flawlessly to the boundary.`;
      else if (runs === 0) commentaryText += `Dot ball, solid defensive placement.`;
      else commentaryText += `${runs} run${runs > 1 ? 's' : ''}, pushed into the gaps.`;
    }

    ball.commentary = ballData.customCommentary || commentaryText;

    // Append ball to list
    innings.ballsList.push(ball);

    // Update cumulative innings runs/wickets
    innings.runs += runsBatter + runsExtra;
    if (isWicketValid) {
      innings.wickets += 1;
    }

    if (isLegalBall) {
      innings.ballsBowled += 1;
    }

    // Update Innings Over calculated floats
    innings.overs = getOverDisplay(innings.ballsBowled, ballsPerOver);

    // --- RE-CALCULATE ALL BATTING STATS FROM ACCUMULATED BALLS ---
    const activeBattersMap: { [id: string]: MatchBatter } = {};
    innings.ballsList.forEach(b => {
      // Find or initialize batter
      if (!activeBattersMap[b.batterId]) {
        const pName = get().players.find(p => p.id === b.batterId)?.name || 'Player';
        activeBattersMap[b.batterId] = {
          playerId: b.batterId,
          name: pName,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false
        };
      }

      const bat = activeBattersMap[b.batterId];
      // Increment faced balls if not wide and not custom-illegal
      const customLegal = tour?.customBallRules.find(r => r.id === b.extraType)?.isLegal ?? true;
      const isWide = b.extraType === 'WIDE';
      if (!isWide && customLegal) {
        bat.balls += 1;
      }

      bat.runs += b.runsBatter;
      const runsTotal = b.runsBatter;
      if (runsTotal === 4) bat.fours += 1;
      if (runsTotal === 6) bat.sixes += 1;

      if (b.isWicket && b.wicketType !== 'RUN_OUT') {
        bat.isOut = true;
        bat.outType = b.wicketType;
        bat.bowlerId = b.bowlerId;
      }
      bat.strikeRate = bat.balls > 0 ? Number(((bat.runs / bat.balls) * 100).toFixed(1)) : 0;
    });

    // Handle run outs (striker vs non-striker depends on who gets out)
    if (isWicketValid && ballData.wicketType === 'RUN_OUT') {
      // Mark striker as out for simplicity or default
      const str = activeBattersMap[strikerId];
      if (str) {
        str.isOut = true;
        str.outType = 'RUN_OUT';
      }
    }

    // Hydrate innings batters
    innings.batters = Object.values(activeBattersMap);

    // --- RE-CALCULATE ALL BOWLER STATS FROM ACCUMULATED BALLS ---
    const activeBowlersMap: { [id: string]: MatchBowler } = {};
    innings.ballsList.forEach(b => {
      if (!activeBowlersMap[b.bowlerId]) {
        const pName = get().players.find(p => p.id === b.bowlerId)?.name || 'Player';
        activeBowlersMap[b.bowlerId] = {
          playerId: b.bowlerId,
          name: pName,
          overs: 0,
          balls: 0,
          maidens: 0,
          runs: 0,
          wickets: 0,
          economy: 0
        };
      }

      const bowl = activeBowlersMap[b.bowlerId];
      const customLegal = tour?.customBallRules.find(r => r.id === b.extraType)?.isLegal ?? true;
      const isExtraLegal = b.extraType !== 'WIDE' && b.extraType !== 'NO_BALL' && customLegal;

      if (isExtraLegal) {
        bowl.balls += 1;
      }

      // Conceded runs: batter runs + Wides + No Balls. Byes and Leg Byes don't count against bowler
      const isConceded = b.extraType !== 'BYE' && b.extraType !== 'LEG_BYE';
      if (isConceded) {
        bowl.runs += b.runsBatter + b.runsExtra;
      }

      if (b.isWicket && b.wicketType !== 'RUN_OUT' && b.wicketType !== 'RETIRED_HURT') {
        bowl.wickets += 1;
      }

      bowl.overs = getOverDisplay(bowl.balls, ballsPerOver);
      bowl.economy = bowl.balls > 0 ? Number(((bowl.runs / (bowl.balls / ballsPerOver))).toFixed(2)) : 0;
    });

    innings.bowlers = Object.values(activeBowlersMap);

    // Handle Strike Rotation logic based on runs and over boundaries
    let nextStriker = strikerId;
    let nextNonStriker = nonStrikerId;

    const totalRunsThisBall = runsBatter + (ballData.extraType === 'BYE' || ballData.extraType === 'LEG_BYE' ? runsExtra : 0);
    const oddRuns = totalRunsThisBall % 2 !== 0;
    if (oddRuns) {
      // Swap strikers
      nextStriker = nonStrikerId;
      nextNonStriker = strikerId;
    }

    // Over complete swap (only legal balls trigger over increment)
    let isOverEnd = false;
    if (isLegalBall && (innings.ballsBowled % ballsPerOver) === 0) {
      isOverEnd = true;
      // swap strike before bowler changes so non-striker gets strike for next over
      const temp = nextStriker;
      nextStriker = nextNonStriker;
      nextNonStriker = temp;
    }

    // Auto complete Innings if overs completed or wickets all out (10 wickets or team size out)
    const allOutLimit = MOCK_TEAMS.find(t => t.id === innings.battingTeamId)?.players.length ? 
      (MOCK_TEAMS.find(t => t.id === innings.battingTeamId)?.players.length || 11) - 1 : 10;
    
    const maxMatchOvers = clonedMatch.oversCount;

    let targetRunsInnings2 = 0;
    if (clonedMatch.innings[0]) {
      targetRunsInnings2 = clonedMatch.innings[0].runs + 1;
    }

    const isChaseCompleted = clonedMatch.currentInnings === 2 && innings.runs >= targetRunsInnings2;
    const isInningsOver = innings.ballsBowled >= (maxMatchOvers * ballsPerOver) || innings.wickets >= allOutLimit || isChaseCompleted;

    if (isInningsOver) {
      if (clonedMatch.currentInnings === 1) {
        // Switch to innings 2
        clonedMatch.currentInnings = 2;
        const targetTeam = clonedMatch.homeTeamId === innings.battingTeamId ? clonedMatch.awayTeamId : clonedMatch.homeTeamId;
        const opponentTeam = get().teams.find(t => t.id === targetTeam);
        const activeBowlTeam = get().teams.find(t => t.id === innings.battingTeamId);

        clonedMatch.innings[1] = {
          teamNumber: 2,
          battingTeamId: targetTeam,
          runs: 0,
          wickets: 0,
          overs: 0,
          ballsBowled: 0,
          ballsList: [],
          batters: opponentTeam ? [
            { playerId: opponentTeam.players[0].id, name: opponentTeam.players[0].name, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, active: true },
            { playerId: opponentTeam.players[1].id, name: opponentTeam.players[1].name, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, active: true },
          ] : [],
          bowlers: activeBowlTeam ? [
            { playerId: activeBowlTeam.players[0].id, name: activeBowlTeam.players[0].name, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0 },
          ] : [],
        };
        nextStriker = opponentTeam?.players[0].id || '';
        nextNonStriker = opponentTeam?.players[1].id || '';
        set({
          activeBowlerId: activeBowlTeam?.players[0].id || ''
        });
      } else {
        // Complete Match!
        clonedMatch.status = 'COMPLETED';
        const team1Runs = clonedMatch.innings[0].runs;
        const team2Runs = clonedMatch.innings[1].runs;
        if (team1Runs > team2Runs) {
          clonedMatch.winnerId = clonedMatch.innings[0].battingTeamId;
        } else if (team2Runs > team1Runs) {
          clonedMatch.winnerId = clonedMatch.innings[1].battingTeamId;
        } else {
          clonedMatch.winnerId = 'TIE'; // Tied game
        }
      }
    }

    // Save clonedMatch to list
    const updatedMatches = matches.map(m => m.id === activeMatchId ? clonedMatch : m);

    set({
      matches: updatedMatches,
      strikerId: nextStriker,
      nonStrikerId: nextNonStriker,
      isFreeHit: triggersFreeHitNext,
      undoStack,
      redoStack: []
    });

    if (isOverEnd && !isInningsOver) {
      set({ activeBowlerId: '' });
    }

    supabaseService.upsertMatches(get().matches);
  },

  // --- UNDO / REDO ---
  undoBall: () => {
    set(state => {
      if (state.undoStack.length === 0) return {};
      const previousMatchesStr = state.undoStack[state.undoStack.length - 1];
      const newUndoStack = state.undoStack.slice(0, -1);

      const currentMatchesStr = JSON.stringify(state.matches);
      const newRedoStack = [...state.redoStack, currentMatchesStr];

      const parsedPreviousMatches = JSON.parse(previousMatchesStr) as Match[];

      const match = parsedPreviousMatches.find(m => m.id === state.activeMatchId);
      let striker = state.strikerId;
      let nonStriker = state.nonStrikerId;
      let bowler = state.activeBowlerId;

      if (match) {
        const inn = match.innings[match.currentInnings - 1];
        if (inn && inn.ballsList.length > 0) {
          const lastBall = inn.ballsList[inn.ballsList.length - 1];
          striker = lastBall.batterId;
          bowler = lastBall.bowlerId;
        }
      }

      return {
        matches: parsedPreviousMatches,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        strikerId: striker,
        activeBowlerId: bowler
      };
    });
    supabaseService.upsertMatches(get().matches);
  },

  redoBall: () => {
    set(state => {
      if (state.redoStack.length === 0) return {};
      const nextMatchesStr = state.redoStack[state.redoStack.length - 1];
      const newRedoStack = state.redoStack.slice(0, -1);

      const currentMatchesStr = JSON.stringify(state.matches);
      const newUndoStack = [...state.undoStack, currentMatchesStr];

      const parsedNextMatches = JSON.parse(nextMatchesStr) as Match[];

      return {
        matches: parsedNextMatches,
        undoStack: newUndoStack,
        redoStack: newRedoStack
      };
    });
    supabaseService.upsertMatches(get().matches);
  },

  // --- THE LEGENDARY RETROACTIVE HISTORICAL CORRECTOR ---
  adminOverrideBall: (matchId, inningsIndex, ballId, updatedFields) => {
    set(state => {
      const matchIndex = state.matches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return {};

      const clonedMatch = JSON.parse(JSON.stringify(state.matches[matchIndex])) as Match;
      const innings = clonedMatch.innings[inningsIndex];
      if (!innings) return {};

      const tour = state.tournaments.find(t => t.id === clonedMatch.tournamentId);
      const ballsPerOver = tour?.ballsPerOver ?? 6;
      const runsPerWide = tour?.runsPerWide ?? 1;
      const runsPerNoBall = tour?.runsPerNoBall ?? 1;

      const ballsList = innings.ballsList;
      const targetBallIndex = ballsList.findIndex(b => b.id === ballId);
      if (targetBallIndex === -1) return {};

      const oldBall = ballsList[targetBallIndex];
      const newBall: Ball = {
        ...oldBall,
        ...updatedFields,
        wicketType: updatedFields.isWicket ? updatedFields.wicketType : undefined,
      };

      ballsList[targetBallIndex] = newBall;

      let runningRuns = 0;
      let runningWickets = 0;
      let runningBallsBowled = 0;

      const battersMap: { [id: string]: MatchBatter } = {};
      const bowlersMap: { [id: string]: MatchBowler } = {};

      ballsList.forEach((b) => {
        let runsExtra = b.runsExtra;
        let runsBatter = b.runsBatter;
        let isLegalBall = true;

        if (b.extraType && b.extraType.startsWith('cb-')) {
          const customRule = tour?.customBallRules.find(r => r.id === b.extraType);
          if (customRule) {
            runsExtra = customRule.runsModifier;
            isLegalBall = customRule.isLegal;
            runsBatter = Math.round(runsBatter * customRule.multiplier);
          }
        } else {
          if (b.extraType === 'WIDE') {
            isLegalBall = false;
            runsBatter = 0;
          } else if (b.extraType === 'NO_BALL') {
            isLegalBall = false;
          } else if (b.extraType === 'BYE' || b.extraType === 'LEG_BYE') {
            isLegalBall = true;
            runsBatter = 0;
          }
        }

        if (isLegalBall) {
          runningBallsBowled += 1;
        }

        const calcOver = Math.floor(runningBallsBowled / ballsPerOver);
        const calcBalls = runningBallsBowled % ballsPerOver;
        b.overNumber = calcOver + 1;
        b.ballNumber = isLegalBall ? calcBalls : (runningBallsBowled % ballsPerOver);

        runningRuns += runsBatter + runsExtra;
        if (b.isWicket) {
          runningWickets += 1;
        }

        if (!battersMap[b.batterId]) {
          const pName = state.players.find(p => p.id === b.batterId)?.name || 'Player';
          battersMap[b.batterId] = {
            playerId: b.batterId,
            name: pName,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false
          };
        }
        const bat = battersMap[b.batterId];
        const customLegal = tour?.customBallRules.find(r => r.id === b.extraType)?.isLegal ?? true;
        if (b.extraType !== 'WIDE' && customLegal) {
          bat.balls += 1;
        }
        bat.runs += runsBatter;
        if (runsBatter === 4) bat.fours += 1;
        if (runsBatter === 6) bat.sixes += 1;

        if (b.isWicket && b.wicketType !== 'RUN_OUT') {
          bat.isOut = true;
          bat.outType = b.wicketType;
          bat.bowlerId = b.bowlerId;
        }
        bat.strikeRate = bat.balls > 0 ? Number(((bat.runs / bat.balls) * 100).toFixed(1)) : 0;

        if (!bowlersMap[b.bowlerId]) {
          const pName = state.players.find(p => p.id === b.bowlerId)?.name || 'Player';
          bowlersMap[b.bowlerId] = {
            playerId: b.bowlerId,
            name: pName,
            overs: 0,
            balls: 0,
            maidens: 0,
            runs: 0,
            wickets: 0,
            economy: 0
          };
        }
        const bowl = bowlersMap[b.bowlerId];
        const isExtraLegal = b.extraType !== 'WIDE' && b.extraType !== 'NO_BALL' && customLegal;
        if (isExtraLegal) {
          bowl.balls += 1;
        }
        const isConceded = b.extraType !== 'BYE' && b.extraType !== 'LEG_BYE';
        if (isConceded) {
          bowl.runs += runsBatter + runsExtra;
        }
        if (b.isWicket && b.wicketType !== 'RUN_OUT' && b.wicketType !== 'RETIRED_HURT') {
          bowl.wickets += 1;
        }
        bowl.overs = getOverDisplay(bowl.balls, ballsPerOver);
        bowl.economy = bowl.balls > 0 ? Number(((bowl.runs / (bowl.balls / ballsPerOver))).toFixed(2)) : 0;
      });

      innings.runs = runningRuns;
      innings.wickets = runningWickets;
      innings.ballsBowled = runningBallsBowled;
      innings.overs = getOverDisplay(runningBallsBowled, ballsPerOver);
      innings.batters = Object.values(battersMap);
      innings.bowlers = Object.values(bowlersMap);

      if (clonedMatch.status === 'COMPLETED') {
        const team1Runs = clonedMatch.innings[0].runs;
        const team2Runs = clonedMatch.innings[1].runs;
        if (team1Runs > team2Runs) {
          clonedMatch.winnerId = clonedMatch.innings[0].battingTeamId;
        } else if (team2Runs > team1Runs) {
          clonedMatch.winnerId = clonedMatch.innings[1].battingTeamId;
        } else {
          clonedMatch.winnerId = 'TIE';
        }
      }

      const updatedMatches = state.matches.map(m => m.id === matchId ? clonedMatch : m);
      return { matches: updatedMatches };
    });
    supabaseService.upsertMatches(get().matches);
  }
}));


-- CricX Supabase Schema
-- Run this in the Supabase SQL Editor

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  cricket_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  color TEXT DEFAULT '#10B981',
  is_public BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players
CREATE TABLE IF NOT EXISTS public.players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  batting_style TEXT CHECK (batting_style IN ('RHB', 'LHB')),
  bowling_style TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  format TEXT DEFAULT 'T20' CHECK (format IN ('T20', 'T10', 'Custom')),
  overs_limit INTEGER DEFAULT 20,
  venue TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'abandoned')),
  winner_id UUID REFERENCES public.teams(id),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  is_public BOOLEAN DEFAULT false,
  toss_winner_id UUID REFERENCES public.teams(id),
  toss_decision TEXT CHECK (toss_decision IN ('bat', 'field')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Match Teams (junction table)
CREATE TABLE IF NOT EXISTS public.match_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  batting_order INTEGER DEFAULT 1,
  UNIQUE(match_id, team_id)
);

-- Custom Rules
CREATE TABLE IF NOT EXISTS public.custom_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '⚡',
  color TEXT DEFAULT '#8B5CF6',
  priority INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rule Conditions
CREATE TABLE IF NOT EXISTS public.rule_conditions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES public.custom_rules(id) ON DELETE CASCADE NOT NULL,
  field TEXT NOT NULL,
  operator TEXT NOT NULL,
  value TEXT NOT NULL
);

-- Rule Actions
CREATE TABLE IF NOT EXISTS public.rule_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES public.custom_rules(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  action_value TEXT NOT NULL,
  target TEXT DEFAULT 'batting' CHECK (target IN ('batting', 'bowling', 'both'))
);

-- Innings
CREATE TABLE IF NOT EXISTS public.innings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  batting_team_id UUID REFERENCES public.teams(id) NOT NULL,
  innings_number INTEGER DEFAULT 1 CHECK (innings_number IN (1, 2)),
  total_runs INTEGER DEFAULT 0,
  total_wickets INTEGER DEFAULT 0,
  overs_bowled TEXT DEFAULT '0.0',
  is_completed BOOLEAN DEFAULT false,
  is_declared BOOLEAN DEFAULT false,
  dls_target INTEGER,
  dls_par_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Balls
CREATE TABLE IF NOT EXISTS public.balls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  innings_id UUID REFERENCES public.innings(id) ON DELETE CASCADE NOT NULL,
  over_number INTEGER NOT NULL,
  ball_number INTEGER NOT NULL,
  batsman_id UUID REFERENCES public.players(id),
  bowler_id UUID REFERENCES public.players(id),
  runs INTEGER DEFAULT 0,
  extras_type TEXT,
  extras_runs INTEGER DEFAULT 0,
  dismissal_type TEXT,
  dismissal_player_id UUID REFERENCES public.players(id),
  custom_rule_triggered_id UUID REFERENCES public.custom_rules(id),
  custom_rule_name TEXT,
  special_ball BOOLEAN DEFAULT false,
  special_ball_description TEXT,
  special_ball_action TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Dismissals
CREATE TABLE IF NOT EXISTS public.dismissals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ball_id UUID REFERENCES public.balls(id) ON DELETE CASCADE NOT NULL,
  batsman_id UUID REFERENCES public.players(id) NOT NULL,
  bowler_id UUID REFERENCES public.players(id),
  dismissal_type TEXT NOT NULL,
  runs_at_dismissal INTEGER
);

-- RLS Policies

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.innings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dismissals ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Teams: public teams readable by all, private by owner
CREATE POLICY "Public teams viewable by all" ON public.teams FOR SELECT USING (is_public = true OR owner_id = auth.uid());
CREATE POLICY "Users can insert own teams" ON public.teams FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own teams" ON public.teams FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own teams" ON public.teams FOR DELETE USING (owner_id = auth.uid());

-- Players: readable if team is public or user owns team
CREATE POLICY "Players viewable if team is public" ON public.players FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND (is_public = true OR owner_id = auth.uid()))
);
CREATE POLICY "Users can insert players to own teams" ON public.players FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can update players in own teams" ON public.players FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can delete players from own teams" ON public.players FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
);

-- Matches: public matches readable by all, private by owner
CREATE POLICY "Public matches viewable by all" ON public.matches FOR SELECT USING (is_public = true OR created_by = auth.uid());
CREATE POLICY "Users can insert matches" ON public.matches FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own matches" ON public.matches FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own matches" ON public.matches FOR DELETE USING (created_by = auth.uid());

-- Match teams
CREATE POLICY "Match teams viewable if match is public" ON public.match_teams FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND (is_public = true OR created_by = auth.uid()))
);
CREATE POLICY "Match team insert" ON public.match_teams FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);
CREATE POLICY "Match team update" ON public.match_teams FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);
CREATE POLICY "Match team delete" ON public.match_teams FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);

-- Custom rules
CREATE POLICY "Rules viewable if match is public" ON public.custom_rules FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND (is_public = true OR created_by = auth.uid()))
);
CREATE POLICY "Rules insert" ON public.custom_rules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);
CREATE POLICY "Rules update" ON public.custom_rules FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);
CREATE POLICY "Rules delete" ON public.custom_rules FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);

-- Rule conditions
CREATE POLICY "Conditions viewable" ON public.rule_conditions FOR SELECT USING (true);
CREATE POLICY "Conditions insert" ON public.rule_conditions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.custom_rules WHERE id = rule_id AND created_by = auth.uid())
);
CREATE POLICY "Conditions update" ON public.rule_conditions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.custom_rules WHERE id = rule_id AND created_by = auth.uid())
);
CREATE POLICY "Conditions delete" ON public.rule_conditions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.custom_rules WHERE id = rule_id AND created_by = auth.uid())
);

-- Rule actions
CREATE POLICY "Actions viewable" ON public.rule_actions FOR SELECT USING (true);
CREATE POLICY "Actions insert" ON public.rule_actions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.custom_rules WHERE id = rule_id AND created_by = auth.uid())
);
CREATE POLICY "Actions update" ON public.rule_actions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.custom_rules WHERE id = rule_id AND created_by = auth.uid())
);
CREATE POLICY "Actions delete" ON public.rule_actions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.custom_rules WHERE id = rule_id AND created_by = auth.uid())
);

-- Innings
CREATE POLICY "Innings viewable if match is public" ON public.innings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND (is_public = true OR created_by = auth.uid()))
);
CREATE POLICY "Innings insert" ON public.innings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);
CREATE POLICY "Innings update" ON public.innings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);
CREATE POLICY "Innings delete" ON public.innings FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);

-- Balls
CREATE POLICY "Balls viewable if match is public" ON public.balls FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.innings WHERE id = innings_id AND EXISTS (
    SELECT 1 FROM public.matches WHERE id = match_id AND (is_public = true OR created_by = auth.uid())
  ))
);
CREATE POLICY "Balls insert" ON public.balls FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.innings WHERE id = innings_id AND EXISTS (
    SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid()
  ))
);
CREATE POLICY "Balls update" ON public.balls FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.innings WHERE id = innings_id AND EXISTS (
    SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid()
  ))
);
CREATE POLICY "Balls delete" ON public.balls FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.innings WHERE id = innings_id AND EXISTS (
    SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid()
  ))
);

-- Dismissals
CREATE POLICY "Dismissals viewable" ON public.dismissals FOR SELECT USING (true);
CREATE POLICY "Dismissals insert" ON public.dismissals FOR INSERT WITH CHECK (true);
CREATE POLICY "Dismissals update" ON public.dismissals FOR UPDATE USING (true);
CREATE POLICY "Dismissals delete" ON public.dismissals FOR DELETE USING (true);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for balls and innings tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.balls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.innings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
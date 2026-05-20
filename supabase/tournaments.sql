
-- Tournaments
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_public BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournament Teams
CREATE TABLE IF NOT EXISTS public.tournament_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  group_name TEXT,
  points INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,
  matches_tied INTEGER DEFAULT 0,
  no_result INTEGER DEFAULT 0,
  net_run_rate DECIMAL(10, 3) DEFAULT 0.000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, team_id)
);

-- Link Match to Tournament
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL;

-- Tournament Rules (Global rules for all matches in tournament)
CREATE TABLE IF NOT EXISTS public.tournament_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  rule_template_id UUID, -- Optional: link to a pre-defined template
  name TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Tournaments
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public tournaments viewable by all" ON public.tournaments FOR SELECT USING (is_public = true OR created_by = auth.uid());
CREATE POLICY "Users can create tournaments" ON public.tournaments FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own tournaments" ON public.tournaments FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own tournaments" ON public.tournaments FOR DELETE USING (created_by = auth.uid());

CREATE POLICY "Tournament teams viewable by all" ON public.tournament_teams FOR SELECT USING (true);
CREATE POLICY "Owners can manage tournament teams" ON public.tournament_teams FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND created_by = auth.uid())
);

CREATE POLICY "Tournament rules viewable by all" ON public.tournament_rules FOR SELECT USING (true);
CREATE POLICY "Owners can manage tournament rules" ON public.tournament_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND created_by = auth.uid())
);

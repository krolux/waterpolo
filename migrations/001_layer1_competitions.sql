CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- SEASONS
CREATE TABLE IF NOT EXISTS public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- COMPETITIONS
CREATE TABLE IF NOT EXISTS public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  short_name text,
  type text NOT NULL,
  level text NOT NULL,
  gender text NOT NULL DEFAULT 'men',
  country text NOT NULL DEFAULT 'PL',
  active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now()
);

-- COMPETITION SEASONS
CREATE TABLE IF NOT EXISTS public.competition_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (competition_id, season_id)
);

-- STAGES
CREATE TABLE IF NOT EXISTS public.stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_season_id uuid NOT NULL REFERENCES public.competition_seasons(id) ON DELETE CASCADE,
  name text NOT NULL,
  stage_type text NOT NULL DEFAULT 'round_robin',
  sort_order int NOT NULL DEFAULT 1,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  UNIQUE (competition_season_id, name)
);

-- VENUES
CREATE TABLE IF NOT EXISTS public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  country text DEFAULT 'PL',
  address text,
  capacity int,
  created_at timestamptz DEFAULT now()
);

-- TOURNAMENTS
CREATE TABLE IF NOT EXISTS public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  name text NOT NULL,
  venue_id uuid REFERENCES public.venues(id),
  start_date date,
  end_date date,
  tournament_type text NOT NULL DEFAULT 'league',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  UNIQUE (stage_id, name)
);

-- COMPETITION ADMINS
CREATE TABLE IF NOT EXISTS public.competition_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin',
  assigned_at timestamptz DEFAULT now(),
  UNIQUE (competition_id, profile_id)
);

-- MATCHES EXTENSION
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS competition_season_id uuid REFERENCES public.competition_seasons(id);

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES public.stages(id);

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS tournament_id uuid REFERENCES public.tournaments(id);

-- RLS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_admins ENABLE ROW LEVEL SECURITY;

-- DROP POLICIES
DROP POLICY IF EXISTS seasons_select ON public.seasons;
DROP POLICY IF EXISTS seasons_admin_all ON public.seasons;

DROP POLICY IF EXISTS competitions_select ON public.competitions;
DROP POLICY IF EXISTS competitions_admin_all ON public.competitions;

DROP POLICY IF EXISTS competition_seasons_select ON public.competition_seasons;
DROP POLICY IF EXISTS competition_seasons_admin_all ON public.competition_seasons;

DROP POLICY IF EXISTS stages_select ON public.stages;
DROP POLICY IF EXISTS stages_admin_or_comp_admin_all ON public.stages;

DROP POLICY IF EXISTS venues_select ON public.venues;
DROP POLICY IF EXISTS venues_admin_all ON public.venues;

DROP POLICY IF EXISTS tournaments_select ON public.tournaments;
DROP POLICY IF EXISTS tournaments_admin_or_comp_admin_all ON public.tournaments;

DROP POLICY IF EXISTS competition_admins_admin_all ON public.competition_admins;

-- SELECT POLICIES
CREATE POLICY seasons_select ON public.seasons
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY competitions_select ON public.competitions
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY competition_seasons_select ON public.competition_seasons
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY stages_select ON public.stages
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY venues_select ON public.venues
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY tournaments_select ON public.tournaments
FOR SELECT USING (auth.uid() IS NOT NULL);

-- ADMIN POLICIES
CREATE POLICY seasons_admin_all ON public.seasons
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND lower(p.role::text) = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND lower(p.role::text) = 'admin'
  )
);

CREATE POLICY competitions_admin_all ON public.competitions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND lower(p.role::text) = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND lower(p.role::text) = 'admin'
  )
);

CREATE POLICY competition_seasons_admin_all ON public.competition_seasons
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND lower(p.role::text) = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND lower(p.role::text) = 'admin'
  )
);

CREATE POLICY venues_admin_all ON public.venues
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND lower(p.role::text) = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND lower(p.role::text) = 'admin'
  )
);

-- STAGES: admin albo administrator competition
CREATE POLICY stages_admin_or_comp_admin_all ON public.stages
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND lower(p.role::text) = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.competition_seasons cs
    JOIN public.competition_admins ca ON ca.competition_id = cs.competition_id
    WHERE cs.id = stages.competition_season_id
    AND ca.profile_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND lower(p.role::text) = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.competition_seasons cs
    JOIN public.competition_admins ca ON ca.competition_id = cs.competition_id
    WHERE cs.id = stages.competition_season_id
    AND ca.profile_id = auth.uid()
  )
);

-- TOURNAMENTS: admin albo administrator competition
CREATE POLICY tournaments_admin_or_comp_admin_all ON public.tournaments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND lower(p.role::text) = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.stages st
    JOIN public.competition_seasons cs ON cs.id = st.competition_season_id
    JOIN public.competition_admins ca ON ca.competition_id = cs.competition_id
    WHERE st.id = tournaments.stage_id
    AND ca.profile_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND lower(p.role::text) = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.stages st
    JOIN public.competition_seasons cs ON cs.id = st.competition_season_id
    JOIN public.competition_admins ca ON ca.competition_id = cs.competition_id
    WHERE st.id = tournaments.stage_id
    AND ca.profile_id = auth.uid()
  )
);

-- COMPETITION ADMINS: tylko admin
CREATE POLICY competition_admins_admin_all ON public.competition_admins
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND lower(p.role::text) = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND lower(p.role::text) = 'admin'
  )
);

-- INITIAL DATA
INSERT INTO public.seasons (name, start_date, end_date, status)
VALUES ('2025/2026', '2025-09-01', '2026-06-30', 'active')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.competitions (name, short_name, type, level, gender, country, active, description)
VALUES
  ('Ekstraklasa', 'EKS', 'league', 'senior', 'men', 'PL', true, 'Ekstraklasa piłki wodnej mężczyzn'),
  ('Puchar Polski', 'PP', 'cup', 'senior', 'men', 'PL', true, 'Puchar Polski w piłce wodnej'),
  ('U23', 'U23', 'championship', 'U23', 'men', 'PL', true, 'Rozgrywki U23'),
  ('U19', 'U19', 'championship', 'U19', 'men', 'PL', true, 'Rozgrywki U19'),
  ('U17', 'U17', 'championship', 'U17', 'men', 'PL', true, 'Rozgrywki U17'),
  ('U15', 'U15', 'championship', 'U15', 'men', 'PL', true, 'Rozgrywki U15'),
  ('U13', 'U13', 'championship', 'U13', 'men', 'PL', true, 'Rozgrywki U13')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.competition_seasons (competition_id, season_id, name, status, start_date, end_date)
SELECT c.id, s.id, c.name || ' 2025/2026', 'active', s.start_date, s.end_date
FROM public.competitions c
JOIN public.seasons s ON s.name = '2025/2026'
WHERE c.name IN ('Ekstraklasa', 'Puchar Polski', 'U23', 'U19', 'U17', 'U15', 'U13')
ON CONFLICT (competition_id, season_id) DO NOTHING;

INSERT INTO public.stages (competition_season_id, name, stage_type, sort_order, start_date, end_date, status)
SELECT cs.id, 'Runda zasadnicza', 'round_robin', 1, cs.start_date, cs.end_date, 'active'
FROM public.competition_seasons cs
JOIN public.competitions c ON c.id = cs.competition_id
JOIN public.seasons s ON s.id = cs.season_id
WHERE c.name = 'Ekstraklasa'
AND s.name = '2025/2026'
ON CONFLICT (competition_season_id, name) DO NOTHING;

INSERT INTO public.tournaments (stage_id, name, tournament_type, status, start_date, end_date)
SELECT st.id, 'Liga', 'league', 'active', st.start_date, st.end_date
FROM public.stages st
JOIN public.competition_seasons cs ON cs.id = st.competition_season_id
JOIN public.competitions c ON c.id = cs.competition_id
JOIN public.seasons s ON s.id = cs.season_id
WHERE c.name = 'Ekstraklasa'
AND s.name = '2025/2026'
AND st.name = 'Runda zasadnicza'
ON CONFLICT (stage_id, name) DO NOTHING;

UPDATE public.matches m
SET
  competition_season_id = cs.id,
  stage_id = st.id,
  tournament_id = t.id
FROM public.competition_seasons cs
JOIN public.competitions c ON c.id = cs.competition_id
JOIN public.seasons s ON s.id = cs.season_id
JOIN public.stages st ON st.competition_season_id = cs.id
JOIN public.tournaments t ON t.stage_id = st.id
WHERE m.competition_season_id IS NULL
AND c.name = 'Ekstraklasa'
AND s.name = '2025/2026'
AND st.name = 'Runda zasadnicza'
AND t.name = 'Liga';
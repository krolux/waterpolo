CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 1. PLAYERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_name text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  gender text NOT NULL,
  birth_year integer NOT NULL,
  default_cap_number integer,
  license_number text NOT NULL,
  loan_club text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT players_gender_check CHECK (gender IN ('M', 'F')),
  CONSTRAINT players_birth_year_check CHECK (birth_year BETWEEN 1900 AND 2100)
);

CREATE INDEX IF NOT EXISTS idx_players_club_name ON public.players (club_name);
CREATE INDEX IF NOT EXISTS idx_players_license_number ON public.players (license_number);
CREATE INDEX IF NOT EXISTS idx_players_birth_year ON public.players (birth_year);

-- =====================================================
-- 2. TOURNAMENT ROSTERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tournament_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  club_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT tournament_rosters_status_check CHECK (status IN ('draft', 'submitted')),
  CONSTRAINT tournament_rosters_unique_tournament_club UNIQUE (tournament_id, club_name)
);

-- =====================================================
-- 3. TOURNAMENT ROSTER PLAYERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tournament_roster_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id uuid NOT NULL REFERENCES public.tournament_rosters(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  slot integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT tournament_roster_players_slot_check CHECK (slot BETWEEN 1 AND 17),
  CONSTRAINT tournament_roster_players_unique_roster_slot UNIQUE (roster_id, slot),
  CONSTRAINT tournament_roster_players_unique_roster_player UNIQUE (roster_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_roster_players_roster_id ON public.tournament_roster_players (roster_id);
CREATE INDEX IF NOT EXISTS idx_tournament_roster_players_player_id ON public.tournament_roster_players (player_id);

-- =====================================================
-- 4. MATCH ROSTERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.match_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  club_name text NOT NULL,
  tournament_roster_id uuid REFERENCES public.tournament_rosters(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT match_rosters_status_check CHECK (status IN ('draft', 'submitted')),
  CONSTRAINT match_rosters_unique_match_club UNIQUE (match_id, club_name)
);

-- =====================================================
-- 5. MATCH ROSTER PLAYERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.match_roster_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id uuid NOT NULL REFERENCES public.match_rosters(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  slot integer NOT NULL,
  is_goalkeeper boolean NOT NULL DEFAULT false,
  is_captain boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT match_roster_players_slot_check CHECK (slot BETWEEN 1 AND 15),
  CONSTRAINT match_roster_players_unique_roster_slot UNIQUE (roster_id, slot),
  CONSTRAINT match_roster_players_unique_roster_player UNIQUE (roster_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_match_roster_players_roster_id ON public.match_roster_players (roster_id);
CREATE INDEX IF NOT EXISTS idx_match_roster_players_player_id ON public.match_roster_players (player_id);

-- =====================================================
-- 6. PLAYER LICENSE CHECKS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.player_license_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  checked_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  checked_by_name text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  valid_until date NOT NULL,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_player_license_checks_player_id ON public.player_license_checks (player_id);
CREATE INDEX IF NOT EXISTS idx_player_license_checks_valid_until ON public.player_license_checks (valid_until);
CREATE INDEX IF NOT EXISTS idx_player_license_checks_match_id ON public.player_license_checks (match_id);
CREATE INDEX IF NOT EXISTS idx_player_license_checks_tournament_id ON public.player_license_checks (tournament_id);

-- =====================================================
-- 7. UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_players_set_updated_at ON public.players;
CREATE TRIGGER trg_players_set_updated_at
BEFORE UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_tournament_rosters_set_updated_at ON public.tournament_rosters;
CREATE TRIGGER trg_tournament_rosters_set_updated_at
BEFORE UPDATE ON public.tournament_rosters
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_match_rosters_set_updated_at ON public.match_rosters;
CREATE TRIGGER trg_match_rosters_set_updated_at
BEFORE UPDATE ON public.match_rosters
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- 8. RLS
-- =====================================================

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_roster_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_roster_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_license_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS players_select_authenticated ON public.players;
DROP POLICY IF EXISTS players_admin_all ON public.players;
DROP POLICY IF EXISTS players_club_all ON public.players;

DROP POLICY IF EXISTS tournament_rosters_select_authenticated ON public.tournament_rosters;
DROP POLICY IF EXISTS tournament_rosters_admin_all ON public.tournament_rosters;
DROP POLICY IF EXISTS tournament_rosters_club_all ON public.tournament_rosters;

DROP POLICY IF EXISTS tournament_roster_players_select_authenticated ON public.tournament_roster_players;
DROP POLICY IF EXISTS tournament_roster_players_admin_all ON public.tournament_roster_players;
DROP POLICY IF EXISTS tournament_roster_players_club_all ON public.tournament_roster_players;

DROP POLICY IF EXISTS match_rosters_select_authenticated ON public.match_rosters;
DROP POLICY IF EXISTS match_rosters_admin_all ON public.match_rosters;
DROP POLICY IF EXISTS match_rosters_club_all ON public.match_rosters;

DROP POLICY IF EXISTS match_roster_players_select_authenticated ON public.match_roster_players;
DROP POLICY IF EXISTS match_roster_players_admin_all ON public.match_roster_players;
DROP POLICY IF EXISTS match_roster_players_club_all ON public.match_roster_players;

DROP POLICY IF EXISTS player_license_checks_select_authenticated ON public.player_license_checks;
DROP POLICY IF EXISTS player_license_checks_admin_insert ON public.player_license_checks;
DROP POLICY IF EXISTS player_license_checks_admin_update ON public.player_license_checks;
DROP POLICY IF EXISTS player_license_checks_admin_delete ON public.player_license_checks;
DROP POLICY IF EXISTS player_license_checks_insert_privileged ON public.player_license_checks;

CREATE POLICY players_select_authenticated ON public.players
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY players_admin_all ON public.players
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%admin%'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%admin%'
  )
);

CREATE POLICY players_club_all ON public.players
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clubs c ON c.id = p.club_id
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND c.name = players.club_name
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clubs c ON c.id = p.club_id
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND c.name = players.club_name
  )
);

CREATE POLICY tournament_rosters_select_authenticated ON public.tournament_rosters
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY tournament_rosters_admin_all ON public.tournament_rosters
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%admin%'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%admin%'
  )
);

CREATE POLICY tournament_rosters_club_all ON public.tournament_rosters
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clubs c ON c.id = p.club_id
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND c.name = tournament_rosters.club_name
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clubs c ON c.id = p.club_id
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND c.name = tournament_rosters.club_name
  )
);

CREATE POLICY tournament_roster_players_select_authenticated ON public.tournament_roster_players
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY tournament_roster_players_admin_all ON public.tournament_roster_players
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%admin%'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%admin%'
  )
);

CREATE POLICY tournament_roster_players_club_all ON public.tournament_roster_players
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clubs c ON c.id = p.club_id
    JOIN public.tournament_rosters tr ON tr.id = tournament_roster_players.roster_id
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND c.name = tr.club_name
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clubs c ON c.id = p.club_id
    JOIN public.tournament_rosters tr ON tr.id = tournament_roster_players.roster_id
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND c.name = tr.club_name
  )
);

CREATE POLICY match_rosters_select_authenticated ON public.match_rosters
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY match_rosters_admin_all ON public.match_rosters
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%admin%'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%admin%'
  )
);

CREATE POLICY match_rosters_club_all ON public.match_rosters
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clubs c ON c.id = p.club_id
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND c.name = match_rosters.club_name
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clubs c ON c.id = p.club_id
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND c.name = match_rosters.club_name
  )
);

CREATE POLICY match_roster_players_select_authenticated ON public.match_roster_players
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY match_roster_players_admin_all ON public.match_roster_players
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%admin%'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%admin%'
  )
);

CREATE POLICY match_roster_players_club_all ON public.match_roster_players
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clubs c ON c.id = p.club_id
    JOIN public.match_rosters mr ON mr.id = match_roster_players.roster_id
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND c.name = mr.club_name
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clubs c ON c.id = p.club_id
    JOIN public.match_rosters mr ON mr.id = match_roster_players.roster_id
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND c.name = mr.club_name
  )
);

CREATE POLICY player_license_checks_select_authenticated ON public.player_license_checks
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY player_license_checks_insert_privileged ON public.player_license_checks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        lower(p.role::text) LIKE '%admin%'
        OR lower(p.role::text) LIKE '%referee%'
        OR lower(p.role::text) LIKE '%delegate%'
      )
  )
);

CREATE POLICY player_license_checks_admin_update ON public.player_license_checks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%admin%'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%admin%'
  )
);

CREATE POLICY player_license_checks_admin_delete ON public.player_license_checks
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%admin%'
  )
);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 0. COMPETITION / TOURNAMENT METADATA
-- =====================================================

ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS max_birth_year integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tournaments_max_birth_year_check'
      AND conrelid = 'public.tournaments'::regclass
  ) THEN
    ALTER TABLE public.tournaments
    ADD CONSTRAINT tournaments_max_birth_year_check
    CHECK (max_birth_year IS NULL OR max_birth_year BETWEEN 1900 AND 2100);
  END IF;
END;
$$;

-- =====================================================
-- 1. PLAYERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE RESTRICT,
  first_name text NOT NULL,
  last_name text NOT NULL,
  gender text NOT NULL,
  birth_year integer NOT NULL,
  default_cap_number integer,
  license_number text NOT NULL,
  loan_club_name text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT players_gender_check CHECK (gender IN ('M', 'F')),
  CONSTRAINT players_birth_year_check CHECK (birth_year BETWEEN 1900 AND 2100),
  CONSTRAINT players_default_cap_number_check CHECK (default_cap_number IS NULL OR default_cap_number BETWEEN 1 AND 99)
);

CREATE INDEX IF NOT EXISTS idx_players_club_id ON public.players (club_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_license_number_unique ON public.players (license_number);
CREATE INDEX IF NOT EXISTS idx_players_birth_year ON public.players (birth_year);
CREATE INDEX IF NOT EXISTS idx_players_active ON public.players (active);

-- =====================================================
-- 2. TOURNAMENT ROSTERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tournament_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  verified_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT tournament_rosters_status_check CHECK (status IN ('draft', 'submitted', 'verified')),
  CONSTRAINT tournament_rosters_unique_tournament_club UNIQUE (tournament_id, club_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_rosters_tournament_id ON public.tournament_rosters (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_rosters_club_id ON public.tournament_rosters (club_id);
CREATE INDEX IF NOT EXISTS idx_tournament_rosters_status ON public.tournament_rosters (status);

-- =====================================================
-- 3. TOURNAMENT ROSTER PLAYERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tournament_roster_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id uuid NOT NULL REFERENCES public.tournament_rosters(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  slot integer NOT NULL,
  display_order integer,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT tournament_roster_players_slot_check CHECK (slot BETWEEN 1 AND 17),
  CONSTRAINT tournament_roster_players_display_order_check CHECK (display_order IS NULL OR display_order BETWEEN 1 AND 17),
  CONSTRAINT tournament_roster_players_unique_roster_slot UNIQUE (roster_id, slot),
  CONSTRAINT tournament_roster_players_unique_roster_player UNIQUE (roster_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_roster_players_roster_id ON public.tournament_roster_players (roster_id);
CREATE INDEX IF NOT EXISTS idx_tournament_roster_players_player_id ON public.tournament_roster_players (player_id);
CREATE INDEX IF NOT EXISTS idx_tournament_roster_players_display_order ON public.tournament_roster_players (display_order);

-- =====================================================
-- 4. MATCH ROSTERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.match_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE RESTRICT,
  tournament_roster_id uuid REFERENCES public.tournament_rosters(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  verified_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT match_rosters_status_check CHECK (status IN ('draft', 'submitted', 'verified')),
  CONSTRAINT match_rosters_unique_match_club UNIQUE (match_id, club_id)
);

CREATE INDEX IF NOT EXISTS idx_match_rosters_match_id ON public.match_rosters (match_id);
CREATE INDEX IF NOT EXISTS idx_match_rosters_club_id ON public.match_rosters (club_id);
CREATE INDEX IF NOT EXISTS idx_match_rosters_tournament_roster_id ON public.match_rosters (tournament_roster_id);
CREATE INDEX IF NOT EXISTS idx_match_rosters_status ON public.match_rosters (status);

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
  verified_at_match boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT match_roster_players_slot_check CHECK (slot BETWEEN 1 AND 15),
  CONSTRAINT match_roster_players_unique_roster_slot UNIQUE (roster_id, slot),
  CONSTRAINT match_roster_players_unique_roster_player UNIQUE (roster_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_match_roster_players_roster_id ON public.match_roster_players (roster_id);
CREATE INDEX IF NOT EXISTS idx_match_roster_players_player_id ON public.match_roster_players (player_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_roster_players_one_captain
ON public.match_roster_players (roster_id)
WHERE is_captain = true;

-- =====================================================
-- 6. PLAYER LICENSE CHECKS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.player_license_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  checked_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  checked_by_name text,
  checked_by_role text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  valid_until date NOT NULL,
  verification_type text NOT NULL DEFAULT 'match',
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL,
  notes text,
  CONSTRAINT player_license_checks_verification_type_check CHECK (verification_type IN ('match', 'tournament', 'manual'))
);

CREATE INDEX IF NOT EXISTS idx_player_license_checks_player_id ON public.player_license_checks (player_id);
CREATE INDEX IF NOT EXISTS idx_player_license_checks_valid_until ON public.player_license_checks (valid_until);
CREATE INDEX IF NOT EXISTS idx_player_license_checks_match_id ON public.player_license_checks (match_id);
CREATE INDEX IF NOT EXISTS idx_player_license_checks_tournament_id ON public.player_license_checks (tournament_id);
CREATE INDEX IF NOT EXISTS idx_player_license_checks_checked_by_profile_id ON public.player_license_checks (checked_by_profile_id);

-- =====================================================
-- 7. ROSTER SUBMISSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.roster_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_type text NOT NULL,
  tournament_roster_id uuid REFERENCES public.tournament_rosters(id) ON DELETE CASCADE,
  match_roster_id uuid REFERENCES public.match_rosters(id) ON DELETE CASCADE,
  submitted_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_by_name text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  pdf_url text,
  notes text,
  CONSTRAINT roster_submissions_roster_type_check CHECK (roster_type IN ('tournament', 'match')),
  CONSTRAINT roster_submissions_exactly_one_roster_check CHECK (
    (roster_type = 'tournament' AND tournament_roster_id IS NOT NULL AND match_roster_id IS NULL)
    OR
    (roster_type = 'match' AND match_roster_id IS NOT NULL AND tournament_roster_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_roster_submissions_tournament_roster_id ON public.roster_submissions (tournament_roster_id);
CREATE INDEX IF NOT EXISTS idx_roster_submissions_match_roster_id ON public.roster_submissions (match_roster_id);
CREATE INDEX IF NOT EXISTS idx_roster_submissions_submitted_by_profile_id ON public.roster_submissions (submitted_by_profile_id);
CREATE INDEX IF NOT EXISTS idx_roster_submissions_submitted_at ON public.roster_submissions (submitted_at);

-- =====================================================
-- 8. PLAYER LICENSE STATUS VIEW
-- =====================================================

CREATE OR REPLACE VIEW public.player_license_status
WITH (security_invoker = true) AS
SELECT DISTINCT ON (plc.player_id)
  plc.player_id,
  plc.checked_at AS last_checked_at,
  plc.valid_until,
  plc.checked_by_profile_id,
  plc.checked_by_name,
  plc.checked_by_role,
  plc.verification_type,
  plc.match_id,
  plc.tournament_id,
  CASE
    WHEN plc.valid_until >= CURRENT_DATE THEN 'valid'
    ELSE 'expired'
  END AS status
FROM public.player_license_checks plc
ORDER BY plc.player_id, plc.valid_until DESC, plc.checked_at DESC;

GRANT SELECT ON public.player_license_status TO authenticated;

-- =====================================================
-- 9. UPDATED_AT TRIGGER
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
-- 10. GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tournament_rosters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tournament_roster_players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.match_rosters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.match_roster_players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.player_license_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.roster_submissions TO authenticated;

-- =====================================================
-- 11. RLS
-- =====================================================

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_roster_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_roster_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_license_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_submissions ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS player_license_checks_insert_privileged ON public.player_license_checks;
DROP POLICY IF EXISTS player_license_checks_admin_update ON public.player_license_checks;
DROP POLICY IF EXISTS player_license_checks_admin_delete ON public.player_license_checks;

DROP POLICY IF EXISTS roster_submissions_select_authenticated ON public.roster_submissions;
DROP POLICY IF EXISTS roster_submissions_admin_all ON public.roster_submissions;
DROP POLICY IF EXISTS roster_submissions_club_insert ON public.roster_submissions;

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
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND p.club_id = players.club_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND p.club_id = players.club_id
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
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND p.club_id = tournament_rosters.club_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND p.club_id = tournament_rosters.club_id
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
    JOIN public.tournament_rosters tr ON tr.id = tournament_roster_players.roster_id
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND p.club_id = tr.club_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.tournament_rosters tr ON tr.id = tournament_roster_players.roster_id
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND p.club_id = tr.club_id
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
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND p.club_id = match_rosters.club_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND p.club_id = match_rosters.club_id
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
    JOIN public.match_rosters mr ON mr.id = match_roster_players.roster_id
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND p.club_id = mr.club_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.match_rosters mr ON mr.id = match_roster_players.roster_id
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND p.club_id = mr.club_id
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

CREATE POLICY roster_submissions_select_authenticated ON public.roster_submissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY roster_submissions_admin_all ON public.roster_submissions
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

CREATE POLICY roster_submissions_club_insert ON public.roster_submissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.tournament_rosters tr ON tr.id = roster_submissions.tournament_roster_id
    LEFT JOIN public.match_rosters mr ON mr.id = roster_submissions.match_roster_id
    WHERE p.id = auth.uid()
      AND lower(p.role::text) LIKE '%club%'
      AND (
        p.club_id = tr.club_id
        OR p.club_id = mr.club_id
      )
  )
);
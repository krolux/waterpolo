-- PROPOSAL ONLY: apply manually after review.
-- Goal: allow anonymous/public read for portal data used by Rozgrywki.
-- No INSERT/UPDATE/DELETE grants are added here.

-- Matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS matches_public_select ON public.matches;
CREATE POLICY matches_public_select ON public.matches
FOR SELECT
USING (true);

-- Competitions catalog
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS competitions_public_select ON public.competitions;
CREATE POLICY competitions_public_select ON public.competitions
FOR SELECT
USING (true);

-- Competition seasons
ALTER TABLE public.competition_seasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS competition_seasons_public_select ON public.competition_seasons;
CREATE POLICY competition_seasons_public_select ON public.competition_seasons
FOR SELECT
USING (true);

-- Stages
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stages_public_select ON public.stages;
CREATE POLICY stages_public_select ON public.stages
FOR SELECT
USING (true);

-- Tournaments
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tournaments_public_select ON public.tournaments;
CREATE POLICY tournaments_public_select ON public.tournaments
FOR SELECT
USING (true);

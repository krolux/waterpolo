-- Link automatic suspensions to protocol events and competition seasons.
ALTER TABLE public.penalties ADD COLUMN IF NOT EXISTS player_id text;
ALTER TABLE public.penalties ADD COLUMN IF NOT EXISTS competition_season_id uuid REFERENCES public.competition_seasons(id) ON DELETE SET NULL;
ALTER TABLE public.penalties ADD COLUMN IF NOT EXISTS source_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS penalties_match_source_event_unique
  ON public.penalties(match_id, source_event_id);

CREATE INDEX IF NOT EXISTS penalties_player_season_idx
  ON public.penalties(player_id, competition_season_id)
  WHERE player_id IS NOT NULL;

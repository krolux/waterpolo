-- Per-match referee availability. Idempotent: safe to run even if the table
-- already exists in production with the same shape.
CREATE TABLE IF NOT EXISTS public.match_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  available boolean NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, referee_id)
);

CREATE INDEX IF NOT EXISTS match_availability_match_id_idx ON public.match_availability(match_id);
CREATE INDEX IF NOT EXISTS match_availability_referee_id_idx ON public.match_availability(referee_id);

ALTER TABLE public.match_availability ENABLE ROW LEVEL SECURITY;
-- Block anonymous access entirely; authenticated users get table-level privileges
-- here and RLS policies below restrict them to their own rows (or admin = all rows).
REVOKE ALL ON public.match_availability FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_availability TO authenticated;

-- is_current_admin() is defined in 013_referee_reviews_and_classes.sql
DROP POLICY IF EXISTS match_availability_select ON public.match_availability;
CREATE POLICY match_availability_select ON public.match_availability
  FOR SELECT USING (referee_id = auth.uid() OR public.is_current_admin());

DROP POLICY IF EXISTS match_availability_insert ON public.match_availability;
CREATE POLICY match_availability_insert ON public.match_availability
  FOR INSERT WITH CHECK (referee_id = auth.uid());

DROP POLICY IF EXISTS match_availability_update ON public.match_availability;
CREATE POLICY match_availability_update ON public.match_availability
  FOR UPDATE USING (referee_id = auth.uid()) WITH CHECK (referee_id = auth.uid());

DROP POLICY IF EXISTS match_availability_delete ON public.match_availability;
CREATE POLICY match_availability_delete ON public.match_availability
  FOR DELETE USING (referee_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_match_availability_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS match_availability_touch_updated_at ON public.match_availability;
CREATE TRIGGER match_availability_touch_updated_at
  BEFORE UPDATE ON public.match_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_match_availability_updated_at();

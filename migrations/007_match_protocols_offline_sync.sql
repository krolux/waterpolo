-- Match protocols: private server-side persistence with offline-capable clients.
-- Access is restricted to the home club, the assigned delegate and administrators.

CREATE TABLE IF NOT EXISTS public.match_protocols (
  match_id uuid PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
  protocol_data jsonb NOT NULL,
  client_updated_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS match_protocols_updated_at_idx
  ON public.match_protocols(updated_at DESC);

ALTER TABLE public.match_protocols ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.match_protocols FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.match_protocols TO authenticated;

CREATE OR REPLACE FUNCTION public.can_access_match_protocol(target_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.matches m ON m.id = target_match_id
    LEFT JOIN public.clubs c ON c.id = p.club_id
    WHERE p.id = auth.uid()
      AND (
        lower(p.role::text) LIKE '%admin%'
        OR (c.name IS NOT NULL AND c.name = m.home)
        OR (m.delegate IS NOT NULL AND btrim(m.delegate) <> '' AND p.display_name = m.delegate)
      )
  );
$$;

DROP POLICY IF EXISTS match_protocols_authorized_select ON public.match_protocols;
DROP POLICY IF EXISTS match_protocols_authorized_insert ON public.match_protocols;
DROP POLICY IF EXISTS match_protocols_authorized_update ON public.match_protocols;

CREATE POLICY match_protocols_authorized_select
ON public.match_protocols FOR SELECT
USING (public.can_access_match_protocol(match_id));

CREATE POLICY match_protocols_authorized_insert
ON public.match_protocols FOR INSERT
WITH CHECK (
  public.can_access_match_protocol(match_id)
  AND updated_by = auth.uid()
);

CREATE POLICY match_protocols_authorized_update
ON public.match_protocols FOR UPDATE
USING (public.can_access_match_protocol(match_id))
WITH CHECK (
  public.can_access_match_protocol(match_id)
  AND updated_by = auth.uid()
);


-- No historical rows or schema columns are changed.
-- Resolve legacy text only if it identifies exactly one current club.
CREATE OR REPLACE FUNCTION public.match_club_identity(club_text text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN count(*) = 1 THEN (array_agg(c.id))[1] ELSE NULL END
  FROM public.clubs c
  WHERE btrim(c.name) = CASE btrim(club_text)
    WHEN 'Job Center Mega-Invest Poland WTS Polonia Bytom' THEN 'WTS Polonia Bytom'
    ELSE btrim(club_text) END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_match_protocol(target_match_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.matches m ON m.id = target_match_id
    WHERE p.id = auth.uid() AND (
      lower(p.role::text) ~ '(^|[-+,[:space:]])admin($|[-+,[:space:]])'
      OR (lower(p.role::text) ~ '(^|[-+,[:space:]])club($|[-+,[:space:]])'
        AND p.club_id IS NOT NULL
        AND p.club_id::text = COALESCE(NULLIF(to_jsonb(m)->>'home_club_id', ''), public.match_club_identity(m.home)::text))
      OR (m.delegate IS NOT NULL AND btrim(m.delegate) <> '' AND p.display_name = m.delegate)
    )
  );
$$;

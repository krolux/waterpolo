-- Restore document writes for the authorized match club using stable IDs.
-- Existing permissive policies are retained, but these restrictive guards
-- prevent them from granting document writes to unrelated clubs.
CREATE OR REPLACE FUNCTION public.document_club_segment(club_text text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(both '_' from regexp_replace(
    regexp_replace(lower(regexp_replace(normalize(coalesce(club_text, ''), NFKD),
      U&'[\0300-\036f]', '', 'g')), '[^a-z0-9._-]+', '_', 'g'), '_+', '_', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.can_write_match_document(object_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (
      lower(p.role::text) ~ '(^|[-+,[:space:]])admin($|[-+,[:space:]])'
      OR EXISTS (
        SELECT 1 FROM public.matches m
        LEFT JOIN public.clubs hc ON hc.id::text = COALESCE(NULLIF(to_jsonb(m)->>'home_club_id',''), public.match_club_identity(m.home)::text)
        LEFT JOIN public.clubs ac ON ac.id::text = COALESCE(NULLIF(to_jsonb(m)->>'away_club_id',''), public.match_club_identity(m.away)::text)
        WHERE m.id::text = split_part(object_name, '/', 2)
          AND split_part(object_name, '/', 4) <> ''
          AND split_part(object_name, '/', 5) = ''
          AND (
            (split_part(object_name, '/', 1) IN ('report','photos')
              AND split_part(object_name, '/', 3) = 'neutral'
              AND m.delegate IS NOT NULL AND btrim(m.delegate) <> '' AND p.display_name = m.delegate)
            OR (lower(p.role::text) ~ '(^|[-+,[:space:]])club($|[-+,[:space:]])'
              AND p.club_id IS NOT NULL AND (
                (split_part(object_name, '/', 1) IN ('comms','roster') AND p.club_id = hc.id
                  AND split_part(object_name, '/', 3) = ANY(ARRAY[hc.id::text,
                    public.document_club_segment(m.home), public.document_club_segment(hc.name)]))
                OR (split_part(object_name, '/', 1) = 'roster' AND p.club_id = ac.id
                  AND split_part(object_name, '/', 3) = ANY(ARRAY[ac.id::text,
                    public.document_club_segment(m.away), public.document_club_segment(ac.name)]))
              ))
          )
      )
    )
  );
$$;

DROP POLICY IF EXISTS docs2_match_insert_guard ON storage.objects;
CREATE POLICY docs2_match_insert_guard ON storage.objects AS RESTRICTIVE
FOR INSERT TO public WITH CHECK (bucket_id <> 'docs2' OR public.can_write_match_document(name));

DROP POLICY IF EXISTS docs2_match_update_guard ON storage.objects;
CREATE POLICY docs2_match_update_guard ON storage.objects AS RESTRICTIVE
FOR UPDATE TO public
USING (bucket_id <> 'docs2' OR public.can_write_match_document(name))
WITH CHECK (bucket_id <> 'docs2' OR public.can_write_match_document(name));

DROP POLICY IF EXISTS docs2_match_delete_guard ON storage.objects;
CREATE POLICY docs2_match_delete_guard ON storage.objects AS RESTRICTIVE
FOR DELETE TO public USING (bucket_id <> 'docs2' OR public.can_write_match_document(name));

DROP POLICY IF EXISTS docs2_authorized_match_delete ON storage.objects;
CREATE POLICY docs2_authorized_match_delete ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'docs2' AND public.can_write_match_document(name));

DROP POLICY IF EXISTS docs_meta_match_insert_guard ON public.docs_meta;
CREATE POLICY docs_meta_match_insert_guard ON public.docs_meta AS RESTRICTIVE
FOR INSERT TO public WITH CHECK (
  public.can_write_match_document(path)
  AND match_id::text = split_part(path, '/', 2)
  AND kind = split_part(path, '/', 1)
  AND club_or_neutral = split_part(path, '/', 3)
);

DROP POLICY IF EXISTS docs_meta_match_update_guard ON public.docs_meta;
CREATE POLICY docs_meta_match_update_guard ON public.docs_meta AS RESTRICTIVE
FOR UPDATE TO public USING (public.can_write_match_document(path))
WITH CHECK (
  public.can_write_match_document(path)
  AND match_id::text = split_part(path, '/', 2)
  AND kind = split_part(path, '/', 1)
  AND club_or_neutral = split_part(path, '/', 3)
);

DROP POLICY IF EXISTS docs_meta_match_delete_guard ON public.docs_meta;
CREATE POLICY docs_meta_match_delete_guard ON public.docs_meta AS RESTRICTIVE
FOR DELETE TO public USING (public.can_write_match_document(path));

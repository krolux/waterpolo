-- Result entry is scoped to assigned match officials; other match fields stay protected.
CREATE OR REPLACE FUNCTION public.can_set_match_result(target_match_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.matches m ON m.id = target_match_id
    WHERE p.id = auth.uid() AND (
      lower(p.role::text) ~ '(^|[-+,[:space:]])admin($|[-+,[:space:]])'
      OR (lower(p.role::text) ~ '(^|[-+,[:space:]])delegate($|[-+,[:space:]])'
          AND NULLIF(btrim(p.display_name), '') IS NOT NULL AND p.display_name = m.delegate)
      OR (lower(p.role::text) ~ '(^|[-+,[:space:]])referee($|[-+,[:space:]])'
          AND NULLIF(btrim(p.display_name), '') IS NOT NULL AND p.display_name IN (m.referee1, m.referee2))
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_set_match_result(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_set_match_result(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.restrict_officials_only_match_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_competition_id uuid;
BEGIN
  SELECT cs.competition_id INTO target_competition_id FROM competition_seasons cs WHERE cs.id = OLD.competition_season_id;
  IF public.has_competition_permission(target_competition_id, 'matches') THEN RETURN NEW; END IF;
  IF public.can_set_match_result(OLD.id)
     AND (to_jsonb(NEW) - ARRAY['result','shootout']) = (to_jsonb(OLD) - ARRAY['result','shootout'])
  THEN RETURN NEW; END IF;
  IF public.has_competition_permission(target_competition_id, 'officials') THEN
    IF (to_jsonb(NEW) - ARRAY['referee1','referee2','delegate']) = (to_jsonb(OLD) - ARRAY['referee1','referee2','delegate']) THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Uprawnienie pozwala zmieniać wyłącznie obsadę meczu';
  END IF;
  RAISE EXCEPTION 'Brak uprawnień do edycji meczu';
END;
$$;

CREATE OR REPLACE FUNCTION public.save_match_result(target_match_id uuid, score text, penalties boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE normalized_score text; saved public.matches%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.matches WHERE id = target_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nie znaleziono meczu'; END IF;
  IF NOT public.can_set_match_result(target_match_id) THEN
    RAISE EXCEPTION 'Wynik może zapisać administrator, delegat lub sędzia przypisany do tego meczu' USING ERRCODE = '42501';
  END IF;
  normalized_score := regexp_replace(btrim(COALESCE(score, '')), '\s+', '', 'g');
  IF normalized_score !~ '^[0-9]{1,3}:[0-9]{1,3}$' THEN
    RAISE EXCEPTION 'Podaj wynik w formacie 6:15';
  END IF;
  normalized_score := split_part(normalized_score, ':', 1)::integer::text || ':' || split_part(normalized_score, ':', 2)::integer::text;
  UPDATE public.matches SET result = normalized_score, shootout = COALESCE(penalties, false)
    WHERE id = target_match_id RETURNING * INTO saved;
  RETURN jsonb_build_object('id', saved.id, 'result', saved.result, 'shootout', saved.shootout);
END;
$$;
REVOKE ALL ON FUNCTION public.save_match_result(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_match_result(uuid, text, boolean) TO authenticated;

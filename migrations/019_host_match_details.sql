CREATE OR REPLACE FUNCTION public.can_edit_host_match(target_match_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.matches m ON m.id=target_match_id
 WHERE p.id=auth.uid() AND (p.role::text='Admin' OR (p.role::text='Club' AND p.club_id IS NOT NULL
 AND p.club_id=COALESCE(m.home_club_id,public.match_club_identity(m.home)))));
$$;
REVOKE ALL ON FUNCTION public.can_edit_host_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_edit_host_match(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.restrict_officials_only_match_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target_competition_id uuid;
BEGIN
 SELECT competition_id INTO target_competition_id FROM competition_seasons WHERE id=OLD.competition_season_id;
 IF public.has_competition_permission(target_competition_id,'matches') THEN RETURN NEW; END IF;
 IF public.can_edit_host_match(OLD.id) AND (to_jsonb(NEW)-ARRAY['date','time','location','stream_url'])=(to_jsonb(OLD)-ARRAY['date','time','location','stream_url']) THEN RETURN NEW; END IF;
 IF public.can_set_match_result(OLD.id) AND (to_jsonb(NEW)-ARRAY['result','shootout'])=(to_jsonb(OLD)-ARRAY['result','shootout']) THEN RETURN NEW; END IF;
 IF public.has_competition_permission(target_competition_id,'officials') THEN
  IF (to_jsonb(NEW)-ARRAY['referee1','referee2','delegate'])=(to_jsonb(OLD)-ARRAY['referee1','referee2','delegate']) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Uprawnienie pozwala zmieniać wyłącznie obsadę meczu';
 END IF;
 RAISE EXCEPTION 'Brak uprawnień do edycji meczu';
END;
$$;

CREATE OR REPLACE FUNCTION public.save_host_match_details(target_match_id uuid,new_date text,new_time text,new_location text,new_stream_url text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.matches%ROWTYPE;
BEGIN
 PERFORM 1 FROM public.matches WHERE id=target_match_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Nie znaleziono meczu'; END IF;
 IF NOT public.can_edit_host_match(target_match_id) THEN RAISE EXCEPTION 'Termin i miejsce może zmienić tylko gospodarz lub administrator' USING ERRCODE='42501'; END IF;
 IF new_date IS NULL OR new_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RAISE EXCEPTION 'Podaj poprawną datę'; END IF;
 PERFORM new_date::date;
 IF NULLIF(btrim(new_time),'') IS NOT NULL THEN
  IF new_time !~ '^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$' THEN RAISE EXCEPTION 'Podaj poprawną godzinę'; END IF;
  PERFORM new_time::time;
 END IF;
 IF NULLIF(btrim(new_location),'') IS NULL OR length(new_location)>500 THEN RAISE EXCEPTION 'Podaj miejsce lub dokładny adres (maksymalnie 500 znaków)'; END IF;
 IF NULLIF(btrim(new_stream_url),'') IS NOT NULL AND (new_stream_url !~ '^https?://[^[:space:]]+$' OR length(new_stream_url)>2048) THEN RAISE EXCEPTION 'Podaj poprawny link transmisji'; END IF;
 UPDATE public.matches SET date=new_date::date,time=NULLIF(btrim(new_time),''),location=btrim(new_location),stream_url=NULLIF(btrim(new_stream_url),'')
 WHERE id=target_match_id RETURNING * INTO saved;
 RETURN jsonb_build_object('id',saved.id,'date',saved.date,'time',saved.time,'location',saved.location,'stream_url',saved.stream_url);
END;
$$;
REVOKE ALL ON FUNCTION public.save_host_match_details(uuid,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_host_match_details(uuid,text,text,text,text) TO authenticated;

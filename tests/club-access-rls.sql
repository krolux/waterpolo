-- Run as project administrator in SQL Editor.
-- Identity claims are simulated only for database checks, not a real login.
-- Every test INSERT is rolled back within a PL/pgSQL subtransaction.
DO $$
DECLARE
  club_id_value uuid;
  club_user uuid;
  other_user uuid;
  admin_user uuid;
  home_match public.matches%ROWTYPE;
  away_match public.matches%ROWTYPE;
  own_path text;
  foreign_path text;
BEGIN
  SELECT id INTO STRICT club_id_value FROM public.clubs WHERE name = 'WTS Polonia Bytom';
  SELECT id INTO STRICT club_user FROM public.profiles WHERE club_id = club_id_value AND role::text = 'Club';
  SELECT * INTO STRICT home_match FROM public.matches WHERE home_club_id = club_id_value ORDER BY date LIMIT 1;
  SELECT * INTO STRICT away_match FROM public.matches WHERE away_club_id = club_id_value ORDER BY date LIMIT 1;
  SELECT id INTO other_user FROM public.profiles WHERE role::text = 'Club' AND club_id <> club_id_value
    AND display_name IS DISTINCT FROM home_match.delegate LIMIT 1;
  SELECT id INTO admin_user FROM public.profiles WHERE role::text = 'Admin' LIMIT 1;
  own_path := 'comms/' || home_match.id || '/' || club_id_value || '/deployment-check.pdf';
  foreign_path := 'comms/' || away_match.id || '/' || club_id_value || '/deployment-check.pdf';

  PERFORM set_config('request.jwt.claim.sub', club_user::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF NOT public.can_access_match_protocol(home_match.id) THEN RAISE EXCEPTION 'Home protocol access denied'; END IF;
  IF public.can_access_match_protocol(away_match.id) THEN RAISE EXCEPTION 'Away club protocol access leaked'; END IF;
  IF NOT public.can_write_match_document(own_path) THEN RAISE EXCEPTION 'Home comms denied'; END IF;
  IF public.can_write_match_document(foreign_path) THEN RAISE EXCEPTION 'Away club comms leaked'; END IF;
  IF NOT public.can_write_match_document('roster/' || away_match.id || '/' || club_id_value || '/deployment-check.pdf') THEN
    RAISE EXCEPTION 'Participant roster denied';
  END IF;
  IF NOT public.can_write_match_document('comms/' || home_match.id || '/' || public.document_club_segment(home_match.home) || '/deployment-check.pdf') THEN
    RAISE EXCEPTION 'Legacy document access denied';
  END IF;

  BEGIN
    INSERT INTO public.docs_meta (match_id,kind,club_or_neutral,path,uploaded_by)
    VALUES (home_match.id,'comms',club_id_value::text,own_path,club_user);
    RAISE EXCEPTION 'rollback authorized metadata test' USING ERRCODE='Z0001';
  EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL;
  END;
  BEGIN
    INSERT INTO public.docs_meta (match_id,kind,club_or_neutral,path,uploaded_by)
    VALUES (away_match.id,'comms',club_id_value::text,foreign_path,club_user);
    RAISE EXCEPTION 'Foreign metadata INSERT unexpectedly passed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.match_protocols (match_id,protocol_data,client_updated_at,updated_by)
    VALUES (home_match.id,jsonb_build_object('matchId',home_match.id,'status','setup'),now(),club_user)
    ON CONFLICT DO NOTHING;
    RAISE EXCEPTION 'rollback authorized protocol test' USING ERRCODE='Z0001';
  EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL;
  END;
  BEGIN
    INSERT INTO public.match_protocols (match_id,protocol_data,client_updated_at,updated_by)
    VALUES (away_match.id,jsonb_build_object('matchId',away_match.id,'status','setup'),now(),club_user)
    ON CONFLICT DO NOTHING;
    RAISE EXCEPTION 'Foreign protocol INSERT unexpectedly passed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN OTHERS THEN IF SQLERRM NOT LIKE '%Brak uprawnień do protokołu%' THEN RAISE; END IF;
  END;

  IF other_user IS NOT NULL THEN
    PERFORM set_config('request.jwt.claim.sub',other_user::text,true);
    IF public.can_access_match_protocol(home_match.id) OR public.can_write_match_document(own_path) THEN
      RAISE EXCEPTION 'Other club access leaked';
    END IF;
  END IF;
  IF admin_user IS NOT NULL THEN
    PERFORM set_config('request.jwt.claim.sub',admin_user::text,true);
    IF NOT public.can_access_match_protocol(home_match.id) OR NOT public.can_write_match_document(own_path) THEN
      RAISE EXCEPTION 'Admin access denied';
    END IF;
  END IF;
  PERFORM set_config('request.jwt.claim.sub','',true);
  IF public.can_access_match_protocol(home_match.id) OR public.can_write_match_document(own_path) THEN
    RAISE EXCEPTION 'Anonymous access leaked';
  END IF;
  EXECUTE 'RESET ROLE';
END;
$$;
SELECT 'PASS: own match writes, visitor denial, metadata RLS, protocol RLS/trigger, legacy paths, admin, anonymous' AS verification,
  EXISTS (SELECT 1 FROM public.profiles p JOIN public.clubs c ON c.id=p.club_id
    WHERE p.role::text='Club' AND c.name<>'WTS Polonia Bytom') AS other_club_profile_available;

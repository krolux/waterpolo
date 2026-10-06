-- All result and assignment changes in this test are rolled back.
BEGIN;
DO $$
DECLARE m public.matches%ROWTYPE; before_row jsonb; after_row jsonb;
  admin_id uuid; referee_id uuid; second_referee_id uuid; delegate_id uuid;
  foreign_referee_id uuid; club_id_value uuid; saved jsonb; delegate_name text;
BEGIN
  SELECT id INTO STRICT admin_id FROM public.profiles WHERE role::text = 'Admin' LIMIT 1;
  SELECT x.* INTO STRICT m FROM public.profiles p JOIN public.matches x ON p.display_name=x.referee1
    WHERE p.role::text='Referee' AND x.date='2026-10-03' ORDER BY x.round LIMIT 1;
  SELECT id INTO STRICT referee_id FROM public.profiles WHERE role::text='Referee' AND display_name=m.referee1 LIMIT 1;
  IF referee_id IS NULL THEN RAISE EXCEPTION 'Missing referee fixture'; END IF;
  SELECT id INTO STRICT second_referee_id FROM public.profiles WHERE role::text='Referee' AND display_name=m.referee2 LIMIT 1;
  SELECT id INTO STRICT foreign_referee_id FROM public.profiles WHERE role::text='Referee'
    AND display_name IS DISTINCT FROM m.referee1 AND display_name IS DISTINCT FROM m.referee2 LIMIT 1;
  SELECT id INTO STRICT club_id_value FROM public.profiles WHERE role::text='Club' LIMIT 1;
  SELECT id,display_name INTO STRICT delegate_id,delegate_name FROM public.profiles WHERE role::text='Delegate' LIMIT 1;
  PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  saved := public.save_match_result(m.id,'06 : 15',false);
  IF saved->>'result' <> '6:15' THEN RAISE EXCEPTION 'Admin save/normalization failed'; END IF;
  UPDATE public.matches SET delegate=delegate_name WHERE id=m.id;
  SELECT to_jsonb(x) - ARRAY['result','shootout'] INTO before_row FROM public.matches x WHERE id=m.id;
  PERFORM set_config('request.jwt.claim.sub',referee_id::text,true);
  saved := public.save_match_result(m.id,'12:11',true);
  IF saved->>'result'<>'12:11' OR NOT (saved->>'shootout')::boolean THEN RAISE EXCEPTION 'Referee 1 save failed'; END IF;
  SELECT to_jsonb(x) - ARRAY['result','shootout'] INTO after_row FROM public.matches x WHERE id=m.id;
  IF before_row IS DISTINCT FROM after_row THEN RAISE EXCEPTION 'Other fields changed'; END IF;
  PERFORM set_config('request.jwt.claim.sub',second_referee_id::text,true);
  PERFORM public.save_match_result(m.id,'9:8',false);
  PERFORM set_config('request.jwt.claim.sub',delegate_id::text,true);
  PERFORM public.save_match_result(m.id,'10:9',false);
  BEGIN
    PERFORM public.save_match_result(m.id,'wrong',false);
    RAISE EXCEPTION 'Invalid score accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Podaj wynik%' THEN RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claim.sub',foreign_referee_id::text,true);
  BEGIN
    PERFORM public.save_match_result(m.id,'1:0',false);
    RAISE EXCEPTION 'Foreign referee allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',club_id_value::text,true);
  BEGIN
    PERFORM public.save_match_result(m.id,'1:0',false);
    RAISE EXCEPTION 'Club allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    PERFORM public.save_match_result(m.id,'1:0',false);
    RAISE EXCEPTION 'Anonymous allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  EXECUTE 'RESET ROLE';
END;
$$;
ROLLBACK;
SELECT 'PASS: admin, both assigned referees, delegate, foreign referee/club/anonymous denial, invalid score, unchanged match fields; test changes rolled back' AS result;

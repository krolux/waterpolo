BEGIN;
DO $$
DECLARE m public.matches%ROWTYPE; p public.profiles%ROWTYPE; allowed boolean; result jsonb; checked integer:=0; test_path text;
BEGIN
 SELECT matches.* INTO m FROM public.matches JOIN public.clubs ON clubs.id=matches.home_club_id WHERE clubs.name='Nekera AZS UW' AND away_club_id IS NOT NULL AND home_club_id<>away_club_id ORDER BY date LIMIT 1;
 IF m.id IS NULL THEN RAISE EXCEPTION 'Missing match fixture'; END IF;
 FOR p IN SELECT * FROM public.profiles WHERE role::text='Club' AND club_id IS NOT NULL LOOP
  PERFORM set_config('request.jwt.claim.sub',p.id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p.id,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  allowed:=p.club_id=m.home_club_id;
  IF public.can_edit_host_match(m.id)<>allowed THEN RAISE EXCEPTION 'Incorrect host access'; END IF;
  BEGIN
   result:=public.save_host_match_details(m.id,m.date::text,m.time,COALESCE(NULLIF(m.location,''),'Test address'),m.stream_url);
   IF NOT allowed THEN RAISE EXCEPTION 'Non-host saved details'; END IF;
   IF result->>'id'<>m.id::text THEN RAISE EXCEPTION 'Save not confirmed'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
   IF allowed THEN RAISE EXCEPTION 'Host could not save'; END IF;
  END;
  test_path:='roster/'||m.id||'/'||p.club_id||'/access-test.pdf';
  IF public.can_write_match_document(test_path)<>(p.club_id IN(m.home_club_id,m.away_club_id)) THEN RAISE EXCEPTION 'Incorrect roster access'; END IF;
  IF p.club_id<>m.home_club_id AND public.can_write_match_document('roster/'||m.id||'/'||m.home_club_id||'/foreign.pdf') THEN RAISE EXCEPTION 'Foreign roster allowed'; END IF;
  BEGIN
   INSERT INTO storage.objects(bucket_id,name,owner,metadata) VALUES('docs2',test_path,p.id,jsonb_build_object('mimetype','application/pdf','size',20));
   IF p.club_id NOT IN(m.home_club_id,m.away_club_id) THEN RAISE EXCEPTION 'Foreign storage insert allowed'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.docs_meta WHERE docs_meta.path=test_path AND match_id=m.id AND club_or_neutral=p.club_id::text) THEN RAISE EXCEPTION 'Roster metadata not registered'; END IF;
   RAISE EXCEPTION 'Rollback storage fixture' USING ERRCODE='Z0001';
  EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL;
   WHEN insufficient_privilege THEN
   IF p.club_id IN(m.home_club_id,m.away_club_id) THEN RAISE EXCEPTION 'Participant storage insert denied'; END IF;
  END;
  EXECUTE 'RESET ROLE'; checked:=checked+1;
 END LOOP;
 IF checked<3 THEN RAISE EXCEPTION 'Insufficient club fixtures'; END IF;
 RAISE NOTICE 'PASS: host save, away/foreign denied, participant roster paths checked for % profiles',checked;
END $$;
ROLLBACK;
SELECT 'PASS: host and roster access; all test changes rolled back' AS result;


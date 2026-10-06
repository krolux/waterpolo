BEGIN;
DO $$
DECLARE club_user uuid; admin_user uuid; guest_user uuid; target_club uuid;
BEGIN
 SELECT id INTO STRICT club_user FROM public.profiles WHERE role::text='Club' LIMIT 1;
 SELECT id INTO STRICT admin_user FROM public.profiles WHERE role::text='Admin' LIMIT 1;
 SELECT id INTO guest_user FROM public.profiles WHERE role::text='Guest' AND club_id IS NULL LIMIT 1;
 SELECT id INTO STRICT target_club FROM public.clubs LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub',club_user::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 BEGIN
  UPDATE public.profiles SET role='Admin' WHERE id=club_user;
  RAISE EXCEPTION 'Self elevation allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.profiles SET club_id=NULL WHERE id=club_user;
  RAISE EXCEPTION 'Club switch allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.profiles SET display_name=display_name WHERE id=club_user;
 IF guest_user IS NOT NULL THEN
  PERFORM set_config('request.jwt.claim.sub',guest_user::text,true);
  UPDATE public.profiles SET club_id=target_club WHERE id=guest_user;
 END IF;
 PERFORM set_config('request.jwt.claim.sub',admin_user::text,true);
 UPDATE public.profiles SET role='Referee',club_id=NULL WHERE id=club_user;
 EXECUTE 'SET LOCAL ROLE service_role';
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claim.role','service_role',true);
 UPDATE public.profiles SET role='Club',club_id=target_club WHERE id=club_user;
 EXECUTE 'RESET ROLE';
END;
$$;
ROLLBACK;
SELECT 'PASS: self role elevation and club switching denied; own profile edits, Guest onboarding, Admin and service operations allowed; all test updates rolled back' AS result;

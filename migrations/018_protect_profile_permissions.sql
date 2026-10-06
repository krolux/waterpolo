-- RLS restricts rows; this guard also restricts privilege-bearing columns.
CREATE OR REPLACE FUNCTION public.protect_profile_permissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role'
     OR (auth.uid() IS NULL AND current_setting('role',true) IN ('none','postgres','supabase_admin'))
     OR public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.id IS DISTINCT FROM auth.uid() OR NEW.role::text <> 'Guest'
       OR COALESCE(NEW.is_active,false) OR COALESCE(NEW.approved,false)
    THEN RAISE EXCEPTION 'Uprawnienia konta nadaje administrator' USING ERRCODE='42501'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.approved IS DISTINCT FROM OLD.approved
  THEN RAISE EXCEPTION 'Uprawnienia konta nadaje administrator' USING ERRCODE='42501'; END IF;
  -- Keep initial club selection in the existing Guest registration flow.
  IF NEW.club_id IS DISTINCT FROM OLD.club_id
     AND NOT (OLD.role::text='Guest' AND OLD.club_id IS NULL)
  THEN RAISE EXCEPTION 'Przypisanie do klubu zmienia administrator' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_protect_profile_permissions ON public.profiles;
CREATE TRIGGER trg_protect_profile_permissions BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_permissions();

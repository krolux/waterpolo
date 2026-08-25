-- Granular permissions are stored as comma-separated codes in competition_admins.role:
-- matches, stages, tournaments, officials, delete. Legacy role='admin' keeps full access.

CREATE OR REPLACE FUNCTION public.has_competition_permission(target_competition_id uuid, permission_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND lower(p.role::text) LIKE '%admin%')
  OR EXISTS (
    SELECT 1 FROM competition_admins ca
    WHERE ca.competition_id = target_competition_id AND ca.profile_id = auth.uid()
      AND (ca.role = 'admin' OR permission_code = ANY(string_to_array(ca.role, ',')))
  );
$$;

DROP POLICY IF EXISTS stages_admin_or_comp_admin_all ON public.stages;
DROP POLICY IF EXISTS stages_granular_insert ON public.stages;
DROP POLICY IF EXISTS stages_granular_update ON public.stages;
DROP POLICY IF EXISTS stages_granular_delete ON public.stages;
CREATE POLICY stages_granular_insert ON public.stages FOR INSERT WITH CHECK (public.has_competition_permission((SELECT cs.competition_id FROM competition_seasons cs WHERE cs.id = stages.competition_season_id), 'stages'));
CREATE POLICY stages_granular_update ON public.stages FOR UPDATE USING (public.has_competition_permission((SELECT cs.competition_id FROM competition_seasons cs WHERE cs.id = stages.competition_season_id), 'stages')) WITH CHECK (public.has_competition_permission((SELECT cs.competition_id FROM competition_seasons cs WHERE cs.id = stages.competition_season_id), 'stages'));
CREATE POLICY stages_granular_delete ON public.stages FOR DELETE USING (public.has_competition_permission((SELECT cs.competition_id FROM competition_seasons cs WHERE cs.id = stages.competition_season_id), 'delete'));

DROP POLICY IF EXISTS tournaments_admin_or_comp_admin_all ON public.tournaments;
DROP POLICY IF EXISTS tournaments_granular_insert ON public.tournaments;
DROP POLICY IF EXISTS tournaments_granular_update ON public.tournaments;
DROP POLICY IF EXISTS tournaments_granular_delete ON public.tournaments;
CREATE POLICY tournaments_granular_insert ON public.tournaments FOR INSERT WITH CHECK (public.has_competition_permission((SELECT cs.competition_id FROM stages st JOIN competition_seasons cs ON cs.id=st.competition_season_id WHERE st.id=tournaments.stage_id), 'tournaments'));
CREATE POLICY tournaments_granular_update ON public.tournaments FOR UPDATE USING (public.has_competition_permission((SELECT cs.competition_id FROM stages st JOIN competition_seasons cs ON cs.id=st.competition_season_id WHERE st.id=tournaments.stage_id), 'tournaments')) WITH CHECK (public.has_competition_permission((SELECT cs.competition_id FROM stages st JOIN competition_seasons cs ON cs.id=st.competition_season_id WHERE st.id=tournaments.stage_id), 'tournaments'));
CREATE POLICY tournaments_granular_delete ON public.tournaments FOR DELETE USING (public.has_competition_permission((SELECT cs.competition_id FROM stages st JOIN competition_seasons cs ON cs.id=st.competition_season_id WHERE st.id=tournaments.stage_id), 'delete'));

DROP POLICY IF EXISTS matches_competition_permissions_write ON public.matches;
DROP POLICY IF EXISTS matches_granular_insert ON public.matches;
DROP POLICY IF EXISTS matches_granular_update ON public.matches;
DROP POLICY IF EXISTS matches_granular_delete ON public.matches;
CREATE POLICY matches_granular_insert ON public.matches FOR INSERT WITH CHECK (public.has_competition_permission((SELECT cs.competition_id FROM competition_seasons cs WHERE cs.id=matches.competition_season_id), 'matches'));
CREATE POLICY matches_granular_update ON public.matches FOR UPDATE USING (public.has_competition_permission((SELECT cs.competition_id FROM competition_seasons cs WHERE cs.id=matches.competition_season_id), 'matches') OR public.has_competition_permission((SELECT cs.competition_id FROM competition_seasons cs WHERE cs.id=matches.competition_season_id), 'officials')) WITH CHECK (public.has_competition_permission((SELECT cs.competition_id FROM competition_seasons cs WHERE cs.id=matches.competition_season_id), 'matches') OR public.has_competition_permission((SELECT cs.competition_id FROM competition_seasons cs WHERE cs.id=matches.competition_season_id), 'officials'));
CREATE POLICY matches_granular_delete ON public.matches FOR DELETE USING (public.has_competition_permission((SELECT cs.competition_id FROM competition_seasons cs WHERE cs.id=matches.competition_season_id), 'delete'));

CREATE OR REPLACE FUNCTION public.restrict_officials_only_match_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_competition_id uuid;
BEGIN
  SELECT cs.competition_id INTO target_competition_id FROM competition_seasons cs WHERE cs.id = OLD.competition_season_id;
  IF public.has_competition_permission(target_competition_id, 'matches') THEN RETURN NEW; END IF;
  IF public.has_competition_permission(target_competition_id, 'officials') THEN
    IF (to_jsonb(NEW) - ARRAY['referee1','referee2','delegate']) = (to_jsonb(OLD) - ARRAY['referee1','referee2','delegate']) THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Uprawnienie pozwala zmieniać wyłącznie obsadę meczu';
  END IF;
  RAISE EXCEPTION 'Brak uprawnień do edycji meczu';
END;
$$;
DROP TRIGGER IF EXISTS trg_restrict_officials_only_match_update ON public.matches;
CREATE TRIGGER trg_restrict_officials_only_match_update BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.restrict_officials_only_match_update();

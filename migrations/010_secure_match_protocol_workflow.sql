-- Security hardening for match protocols.
-- Status changes, result calculation and automatic penalties are performed atomically.

CREATE OR REPLACE FUNCTION public.can_approve_match_protocol(target_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.matches m ON m.id = target_match_id
    WHERE p.id = auth.uid()
      AND (
        lower(p.role::text) LIKE '%admin%'
        OR (m.delegate IS NOT NULL AND btrim(m.delegate) <> '' AND p.display_name = m.delegate)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.guard_match_protocol_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_status text;
  new_status text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_access_match_protocol(NEW.match_id) THEN
    RAISE EXCEPTION 'Brak uprawnień do protokołu';
  END IF;
  IF NEW.updated_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Nieprawidłowy autor zapisu';
  END IF;
  IF COALESCE(NEW.protocol_data->>'matchId', '') <> NEW.match_id::text THEN
    RAISE EXCEPTION 'Identyfikator meczu w protokole jest nieprawidłowy';
  END IF;

  new_status := COALESCE(NEW.protocol_data->>'status', '');
  IF new_status NOT IN ('setup', 'live', 'submitted', 'approved') THEN
    RAISE EXCEPTION 'Nieprawidłowy status protokołu';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF new_status = 'approved' THEN
      RAISE EXCEPTION 'Zatwierdzenie wymaga kontrolowanej operacji';
    END IF;
    RETURN NEW;
  END IF;

  old_status := COALESCE(OLD.protocol_data->>'status', '');
  IF public.can_approve_match_protocol(NEW.match_id) THEN
    RETURN NEW;
  END IF;

  IF old_status NOT IN ('setup', 'live') OR new_status NOT IN ('setup', 'live', 'submitted') THEN
    RAISE EXCEPTION 'Przekazany lub zatwierdzony protokół jest zablokowany';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_match_protocol_write ON public.match_protocols;
CREATE TRIGGER trg_guard_match_protocol_write
BEFORE INSERT OR UPDATE ON public.match_protocols
FOR EACH ROW EXECUTE FUNCTION public.guard_match_protocol_write();

CREATE OR REPLACE FUNCTION public.approve_match_protocol(target_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  protocol jsonb;
  match_row public.matches%ROWTYPE;
  event jsonb;
  player jsonb;
  home_score integer := 0;
  away_score integer := 0;
  prior_count integer;
  approver_name text;
  approved_at timestamptz := now();
BEGIN
  IF NOT public.can_approve_match_protocol(target_match_id) THEN
    RAISE EXCEPTION 'Tylko administrator lub delegat tego meczu może zatwierdzić protokół';
  END IF;

  SELECT * INTO match_row FROM public.matches WHERE id = target_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nie znaleziono meczu'; END IF;

  SELECT protocol_data INTO protocol
  FROM public.match_protocols
  WHERE match_id = target_match_id
  FOR UPDATE;
  IF protocol IS NULL THEN RAISE EXCEPTION 'Nie znaleziono protokołu'; END IF;
  IF protocol->>'status' <> 'submitted' THEN RAISE EXCEPTION 'Protokół nie został przekazany do zatwierdzenia'; END IF;

  FOR event IN SELECT value FROM jsonb_array_elements(COALESCE(protocol->'events', '[]'::jsonb)) LOOP
    IF event->>'kind' IN ('goal', 'shootout_goal') THEN
      IF event->>'team' = 'home' THEN home_score := home_score + 1;
      ELSIF event->>'team' = 'away' THEN away_score := away_score + 1;
      END IF;
    END IF;
  END LOOP;

  DELETE FROM public.penalties
  WHERE match_id = target_match_id
    AND source_event_id IS NOT NULL
    AND source_event_id NOT LIKE 'manual-%';

  FOR event IN
    SELECT value FROM jsonb_array_elements(COALESCE(protocol->'events', '[]'::jsonb))
    WHERE value->>'playerId' IS NOT NULL
      AND (value->>'kind' = 'brutality' OR value->>'grossUnsporting' = 'true')
  LOOP
    SELECT value INTO player
    FROM jsonb_array_elements(
      CASE WHEN event->>'team' = 'home' THEN COALESCE(protocol->'homePlayers', '[]'::jsonb)
           ELSE COALESCE(protocol->'awayPlayers', '[]'::jsonb) END
    )
    WHERE value->>'id' = event->>'playerId'
    LIMIT 1;
    IF player IS NULL THEN CONTINUE; END IF;

    SELECT count(*)::integer INTO prior_count
    FROM public.penalties p
    WHERE p.player_id = player->>'id'
      AND p.match_id <> target_match_id
      AND p.competition_season_id IS NOT DISTINCT FROM match_row.competition_season_id;

    INSERT INTO public.penalties (
      match_id, club_name, player_name, player_id, competition_season_id, source_event_id, games
    ) VALUES (
      target_match_id,
      CASE WHEN event->>'team' = 'home' THEN match_row.home ELSE match_row.away END,
      COALESCE(player->>'name', 'Zawodnik'),
      player->>'id',
      match_row.competition_season_id,
      event->>'id',
      power(2, prior_count)::integer
    )
    ON CONFLICT (match_id, source_event_id) DO UPDATE SET
      club_name = EXCLUDED.club_name,
      player_name = EXCLUDED.player_name,
      player_id = EXCLUDED.player_id,
      competition_season_id = EXCLUDED.competition_season_id,
      games = EXCLUDED.games;
  END LOOP;

  UPDATE public.matches
  SET result = home_score::text || ':' || away_score::text,
      shootout = EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(protocol->'events', '[]'::jsonb)) e
        WHERE e->>'period' = 'PS'
      )
  WHERE id = target_match_id;

  SELECT COALESCE(display_name, 'Użytkownik') INTO approver_name
  FROM public.profiles WHERE id = auth.uid();
  protocol := protocol || jsonb_build_object(
    'status', 'approved',
    'approvedAt', approved_at,
    'approvedBy', approver_name,
    'updatedAt', approved_at
  );

  UPDATE public.match_protocols
  SET protocol_data = protocol,
      client_updated_at = approved_at,
      updated_at = approved_at,
      updated_by = auth.uid()
  WHERE match_id = target_match_id;
  RETURN protocol;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_match_protocol(target_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  protocol jsonb;
  reopened_at timestamptz := now();
  next_status text;
BEGIN
  IF NOT public.can_approve_match_protocol(target_match_id) THEN
    RAISE EXCEPTION 'Tylko administrator lub delegat tego meczu może otworzyć protokół ponownie';
  END IF;
  SELECT protocol_data INTO protocol FROM public.match_protocols WHERE match_id = target_match_id FOR UPDATE;
  IF protocol IS NULL THEN RAISE EXCEPTION 'Nie znaleziono protokołu'; END IF;
  next_status := CASE WHEN jsonb_array_length(COALESCE(protocol->'events', '[]'::jsonb)) > 0 THEN 'live' ELSE 'setup' END;
  protocol := (protocol - 'approvedAt' - 'approvedBy' - 'closedAt' - 'closedBy') || jsonb_build_object(
    'status', next_status, 'finishedAt', '', 'updatedAt', reopened_at
  );
  UPDATE public.matches SET result = NULL, shootout = false WHERE id = target_match_id;
  DELETE FROM public.penalties
  WHERE match_id = target_match_id AND source_event_id IS NOT NULL AND source_event_id NOT LIKE 'manual-%';
  UPDATE public.match_protocols
  SET protocol_data = protocol, client_updated_at = reopened_at, updated_at = reopened_at, updated_by = auth.uid()
  WHERE match_id = target_match_id;
  RETURN protocol;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_match_protocol(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_match_protocol(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_match_protocol(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_match_protocol(uuid) TO authenticated;


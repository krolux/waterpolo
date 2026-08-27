-- Public player cards built only from approved match protocols.
-- No licence number, notes, disciplinary descriptions or date of birth is exposed.

CREATE OR REPLACE FUNCTION public.search_public_player_statistics(
  search_text text DEFAULT NULL,
  club_filter text DEFAULT NULL,
  birth_year_filter integer DEFAULT NULL,
  player_id_filter uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH approved AS (
  SELECT
    m.id AS match_id,
    m.date,
    m.home,
    m.away,
    m.result,
    COALESCE(c.short_name, c.name, 'Inna kategoria') AS category_name,
    c.id AS category_id,
    mp.protocol_data
  FROM public.match_protocols mp
  JOIN public.matches m ON m.id = mp.match_id
  LEFT JOIN public.competition_seasons cs ON cs.id = m.competition_season_id
  LEFT JOIN public.competitions c ON c.id = cs.competition_id
  WHERE mp.protocol_data->>'status' = 'approved'
), appearances AS (
  SELECT a.*, 'home'::text AS team, a.home AS represented_club, roster.player
  FROM approved a
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(a.protocol_data->'homePlayers', '[]'::jsonb)) roster(player)
  UNION ALL
  SELECT a.*, 'away', a.away, roster.player
  FROM approved a
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(a.protocol_data->'awayPlayers', '[]'::jsonb)) roster(player)
), player_matches AS (
  SELECT
    p.id AS player_id,
    p.first_name,
    p.last_name,
    p.birth_year,
    club.name AS registered_club,
    club.logo_url AS registered_club_logo,
    NULLIF(btrim(p.loan_club_name), '') IS NOT NULL AS is_loan,
    a.category_id,
    a.category_name,
    a.represented_club,
    a.match_id,
    a.date,
    a.home,
    a.away,
    a.result,
    (
      SELECT count(*)::integer
      FROM jsonb_array_elements(COALESCE(a.protocol_data->'events', '[]'::jsonb)) event
      WHERE event->>'team' = a.team
        AND event->>'playerId' = p.id::text
        AND event->>'kind' = 'goal'
    ) AS goals,
    (
      SELECT count(*)::integer
      FROM jsonb_array_elements(COALESCE(a.protocol_data->'events', '[]'::jsonb)) event
      WHERE event->>'team' = a.team
        AND event->>'playerId' = p.id::text
        AND event->>'kind' IN ('exclusion', 'penalty', 'exclusion_substitution', 'brutality', 'double_exclusion')
    ) AS exclusions
  FROM appearances a
  JOIN public.players p ON p.id::text = a.player->>'id'
  JOIN public.clubs club ON club.id = p.club_id
), grouped AS (
  SELECT
    player_id,
    first_name,
    last_name,
    birth_year,
    registered_club,
    registered_club_logo,
    is_loan,
    category_id,
    category_name,
    represented_club,
    count(DISTINCT match_id)::integer AS matches_played,
    sum(goals)::integer AS goals,
    sum(exclusions)::integer AS exclusions,
    jsonb_agg(
      jsonb_build_object(
        'id', match_id,
        'date', date,
        'home', home,
        'away', away,
        'result', COALESCE(result, ''),
        'club', represented_club,
        'goals', goals,
        'exclusions', exclusions
      ) ORDER BY date DESC, match_id
    ) AS matches
  FROM player_matches
  GROUP BY player_id, first_name, last_name, birth_year, registered_club, registered_club_logo, is_loan, category_id, category_name, represented_club
), filtered AS (
  SELECT * FROM grouped g
  WHERE (player_id_filter IS NULL OR g.player_id = player_id_filter)
    AND (club_filter IS NULL OR club_filter = '' OR g.represented_club = club_filter)
    AND (birth_year_filter IS NULL OR g.birth_year = birth_year_filter)
    AND (
      search_text IS NULL OR btrim(search_text) = ''
      OR lower(g.first_name || ' ' || g.last_name) LIKE '%' || lower(btrim(search_text)) || '%'
      OR lower(g.last_name || ' ' || g.first_name) LIKE '%' || lower(btrim(search_text)) || '%'
    )
)
SELECT COALESCE(
  jsonb_agg(
    jsonb_build_object(
      'playerId', player_id,
      'firstName', first_name,
      'lastName', last_name,
      'birthYear', birth_year,
      'registeredClub', CASE WHEN is_loan THEN NULL ELSE registered_club END,
      'registeredClubLogo', CASE WHEN is_loan THEN NULL ELSE registered_club_logo END,
      'isLoan', is_loan,
      'categoryId', category_id,
      'categoryName', category_name,
      'club', represented_club,
      'matchesPlayed', matches_played,
      'goals', goals,
      'exclusions', exclusions,
      'matches', matches
    ) ORDER BY last_name, first_name, category_name, represented_club
  ),
  '[]'::jsonb
)
FROM filtered;
$$;

REVOKE ALL ON FUNCTION public.search_public_player_statistics(text, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_player_statistics(text, text, integer, uuid) TO anon, authenticated;


create or replace function public.get_published_protocol_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
with approved as (
  select m.id as match_id, m.home, m.away, c.name as competition_name, mp.protocol_data
  from public.match_protocols mp
  join public.matches m on m.id = mp.match_id
  left join public.competition_seasons cs on cs.id = m.competition_season_id
  left join public.competitions c on c.id = cs.competition_id
  where mp.protocol_data->>'status' = 'approved'
), scoped as (
  select 'all'::text as scope, a.* from approved a
  union all
  select 'eks'::text, a.* from approved a where lower(coalesce(a.competition_name, '')) like '%ekstraklasa%'
), team_games as (
  select scope, club, count(*)::int as games
  from (
    select scope, home as club from scoped
    union all
    select scope, away as club from scoped
  ) clubs
  group by scope, club
), readiness as (
  select scope, count(*) >= 2 and min(games) >= 3 as ready
  from team_games group by scope
), players as (
  select s.scope, s.match_id, 'home'::text as team, s.home as club, p->>'id' as player_id, p->>'name' as player_name
  from scoped s cross join lateral jsonb_array_elements(coalesce(s.protocol_data->'homePlayers', '[]'::jsonb)) p
  union all
  select s.scope, s.match_id, 'away', s.away, p->>'id', p->>'name'
  from scoped s cross join lateral jsonb_array_elements(coalesce(s.protocol_data->'awayPlayers', '[]'::jsonb)) p
), goal_awards as (
  select s.scope, 'goals'::text as stat_type, p.player_id, p.player_name, p.club, count(*)::int as value
  from scoped s
  cross join lateral jsonb_array_elements(coalesce(s.protocol_data->'events', '[]'::jsonb)) e
  join players p on p.scope = s.scope and p.match_id = s.match_id and p.team = e->>'team' and p.player_id = e->>'playerId'
  where e->>'kind' = 'goal'
  group by s.scope, p.player_id, p.player_name, p.club
), mvp_choices as (
  select scope, match_id, 'home'::text as team, protocol_data->>'homeMvpPlayerId' as player_id from scoped
  union all
  select scope, match_id, 'away', protocol_data->>'awayMvpPlayerId' from scoped
), mvp_awards as (
  select m.scope, 'mvp'::text as stat_type, p.player_id, p.player_name, p.club, count(*)::int as value
  from mvp_choices m
  join players p on p.scope = m.scope and p.match_id = m.match_id and p.team = m.team and p.player_id = m.player_id
  where coalesce(m.player_id, '') <> ''
  group by m.scope, p.player_id, p.player_name, p.club
), ranked as (
  select *, dense_rank() over (partition by scope, stat_type order by value desc) as place
  from (select * from goal_awards union all select * from mvp_awards) stats
), leaders as (
  select scope, stat_type, jsonb_agg(jsonb_build_object('playerId', player_id, 'playerName', player_name, 'club', club, 'value', value) order by player_name) as people
  from ranked where place = 1 group by scope, stat_type
)
select jsonb_build_object(
  'ekstraklasaReady', coalesce((select ready from readiness where scope = 'eks'), false),
  'allReady', coalesce((select ready from readiness where scope = 'all'), false),
  'leaders', coalesce((select jsonb_object_agg(scope || '_' || stat_type, people) from leaders), '{}'::jsonb)
);
$$;

revoke all on function public.get_published_protocol_stats() from public;
grant execute on function public.get_published_protocol_stats() to anon, authenticated;

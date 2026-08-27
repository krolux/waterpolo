import { supabase } from './supabase'

export type DbMatchRow = {
  id: string
  date: string                 // ISO yyyy-mm-dd
  time: string | null
  round: string | null         // NR MECZU (zostaje jak było)
  series_round: string | null  // NOWE: numer rundy do grupowania
  location: string
  home: string
  away: string
  result: string | null
  shootout: boolean | null     // NOWE: informacja o rzutach karnych
  referee1: string | null
  referee2: string | null
  delegate: string | null
  notes: string | null
  stream_url: string | null    // NOWE: link do transmisji
  created_by: string | null
  created_at: string | null
  competitionSeasonId?: string | null
  tournamentId?: string | null
  stageId?: string | null
  competition_season_id?: string | null
  tournament_id?: string | null
  stage_id?: string | null
}

export type SupabaseMatchPayload = {
  date?: string
  time?: string | null
  round?: string | null
  series_round?: string | null
  location?: string
  home?: string
  away?: string
  result?: string | null
  shootout?: boolean | null
  referee1?: string | null
  referee2?: string | null
  delegate?: string | null
  notes?: string | null
  stream_url?: string | null
  competition_season_id?: string | null
  stage_id?: string | null
  tournament_id?: string | null
}

export function fromMatchDbRow(row: Record<string, any>): DbMatchRow {
  return {
    ...row,
    competitionSeasonId: row.competitionSeasonId ?? row.competition_season_id ?? null,
    tournamentId: row.tournamentId ?? row.tournament_id ?? null,
    stageId: row.stageId ?? row.stage_id ?? null,
    competition_season_id: row.competition_season_id ?? row.competitionSeasonId ?? null,
    tournament_id: row.tournament_id ?? row.tournamentId ?? null,
    stage_id: row.stage_id ?? row.stageId ?? null,
  } as DbMatchRow
}

export function toMatchDbPayload(row: Partial<DbMatchRow>): SupabaseMatchPayload {
  const payload: SupabaseMatchPayload = {}

  if (row.date !== undefined) payload.date = row.date
  if (row.time !== undefined) payload.time = row.time ?? null
  if (row.round !== undefined) payload.round = row.round ?? null
  if (row.series_round !== undefined) payload.series_round = row.series_round ?? null
  if (row.location !== undefined) payload.location = row.location
  if (row.home !== undefined) payload.home = row.home
  if (row.away !== undefined) payload.away = row.away
  if (row.result !== undefined) payload.result = row.result ?? null
  if (row.shootout !== undefined) payload.shootout = row.shootout ?? null
  if (row.referee1 !== undefined) payload.referee1 = row.referee1 ?? null
  if (row.referee2 !== undefined) payload.referee2 = row.referee2 ?? null
  if (row.delegate !== undefined) payload.delegate = row.delegate ?? null
  if (row.notes !== undefined) payload.notes = row.notes ?? null
  if (row.stream_url !== undefined) payload.stream_url = row.stream_url ?? null

  if (row.competition_season_id !== undefined) {
    payload.competition_season_id = row.competition_season_id ?? null
  } else if (row.competitionSeasonId !== undefined) {
    payload.competition_season_id = row.competitionSeasonId ?? null
  }

  if (row.stage_id !== undefined) {
    payload.stage_id = row.stage_id ?? null
  } else if (row.stageId !== undefined) {
    payload.stage_id = row.stageId ?? null
  }

  if (row.tournament_id !== undefined) {
    payload.tournament_id = row.tournament_id ?? null
  } else if (row.tournamentId !== undefined) {
    payload.tournament_id = row.tournamentId ?? null
  }

  return payload
}

export async function listMatches(): Promise<DbMatchRow[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('date', { ascending: false })
    .order('time', { ascending: false, nullsFirst: false })

  if (error) throw error
  return (data || []).map((row: Record<string, any>) => fromMatchDbRow(row))
}

export async function createMatch(row: Omit<DbMatchRow, 'id' | 'created_at' | 'created_by'>) {
  const payload = toMatchDbPayload(row)
  const { data, error } = await supabase
    .from('matches')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return fromMatchDbRow(data as Record<string, any>)
}

export async function updateMatch(id: string, patch: Partial<DbMatchRow>) {
  const payload = toMatchDbPayload(patch)
  const { data, error } = await supabase
    .from('matches')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return fromMatchDbRow(data as Record<string, any>)
}

export async function deleteMatch(id: string) {
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// zapisz wynik + informację czy były rzuty karne
export async function setMatchResult(id: string, result: string, shootout: boolean) {
  const { error } = await supabase
    .from('matches')
    .update({ result, shootout })
    .eq('id', id)

  if (error) throw error
}

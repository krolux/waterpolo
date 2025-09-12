import { supabase } from './supabase'

export type DbMatchRow = {
  id: string
  date: string           // date as ISO yyyy-mm-dd
  time: string | null
  round: string | null
  location: string
  home: string
  away: string
  result: string | null
  referee1: string | null
  referee2: string | null
  delegate: string | null
  notes: string | null
  created_by: string | null
  created_at: string | null
}

export async function listMatches(): Promise<DbMatchRow[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('date', { ascending: false })
    .order('time', { ascending: false, nullsFirst: false })
  if (error) throw error
  return (data || []) as DbMatchRow[]
}

export async function createMatch(row: Omit<DbMatchRow,'id'|'created_at'|'created_by'>) {
  const { data, error } = await supabase
    .from('matches')
    .insert(row)
    .select('*')
    .single()
  if (error) throw error
  return data as DbMatchRow
}

export async function updateMatch(id: string, patch: Partial<DbMatchRow>) {
  const { data, error } = await supabase
    .from('matches')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as DbMatchRow
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
    .eq('id', id);

  if (error) throw error;
}

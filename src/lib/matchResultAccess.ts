export function canEditMatchResult(user: { role: string; name: string }, match: { delegate?: string; referee1?: string; referee2?: string }) {
  const roles = user.role.toLowerCase().split(/[-+,\s]+/);
  return roles.includes('admin') || Boolean(user.name.trim()) && (
    roles.includes('delegate') && user.name === match.delegate ||
    roles.includes('referee') && [match.referee1, match.referee2].includes(user.name)
  );
}

export function normalizeMatchResult(score: string): string {
  const value = score.trim().replace(/\s+/g, '');
  if (!/^\d{1,3}:\d{1,3}$/.test(value)) throw new Error('Podaj wynik w formacie 6:15.');
  return value.split(':').map(Number).join(':');
}

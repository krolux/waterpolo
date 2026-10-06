/** Past fixtures remain reviewable even before their result is entered. */
export function splitMatchSchedule<T extends { date: string; result?: string | null; round?: string | number | null }>(matches: T[], today: string) {
  const hasResult = (match: T) => Boolean(match.result?.trim());
  return {
    upcoming: matches.filter(match => match.date >= today && !hasResult(match))
      .sort((a, b) => a.date.localeCompare(b.date) || Number(a.round || 0) - Number(b.round || 0)),
    archived: matches.filter(match => match.date < today || hasResult(match))
      .sort((a, b) => b.date.localeCompare(a.date) || Number(a.round || 0) - Number(b.round || 0)),
  };
}

export function competitionToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return part('year') + '-' + part('month') + '-' + part('day');
}

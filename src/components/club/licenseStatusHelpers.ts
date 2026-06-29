export function getLicenseStatusMeta(verified: boolean, validUntil?: string) {
  if (!verified) {
    return { icon: "🔴", label: "Niezweryfikowany", className: "text-red-600" };
  }

  if (validUntil) {
    const diff = new Date(validUntil).getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days <= 30) {
      return { icon: "🟡", label: "Wygasa w ciągu 30 dni", className: "text-amber-600" };
    }
  }

  return { icon: "🟢", label: "Sprawdzony", className: "text-green-600" };
}
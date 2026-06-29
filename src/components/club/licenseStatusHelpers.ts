export function getLicenseStatusMeta(licenseValidUntil?: string, targetDate?: string) {
  if (!licenseValidUntil) {
    return { icon: "🔴", label: "Wymaga zatwierdzenia", className: "text-red-600" };
  }

  const expirationDate = new Date(licenseValidUntil);
  const checkDate = targetDate ? new Date(targetDate) : new Date();
  if (Number.isNaN(expirationDate.getTime())) {
    return { icon: "🔴", label: "Wymaga zatwierdzenia", className: "text-red-600" };
  }

  if (expirationDate.getTime() >= checkDate.getTime()) {
    return { icon: "🟢", label: "Zatwierdzony", className: "text-green-600" };
  }

  return { icon: "🔴", label: "Wymaga zatwierdzenia", className: "text-red-600" };
}
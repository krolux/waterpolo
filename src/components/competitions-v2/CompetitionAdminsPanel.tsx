import React from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { COMPETITION_PERMISSION_KEYS, listAssignableCompetitionProfiles, listCompetitionAdminAssignments, removeCompetitionAdminAssignment, saveCompetitionAdminAssignment, type CompetitionAdminAssignment, type CompetitionPermission, type CompetitionPermissionProfile } from "../../lib/competitionPermissions";

const labels: Record<CompetitionPermission, string> = { matches: "Dodawanie i edycja meczów", stages: "Etapy", tournaments: "Turnieje", officials: "Wyznaczanie sędziów i delegatów", delete: "Usuwanie elementów" };

export function CompetitionAdminsPanel({ competitionId }: { competitionId: string }) {
  const [profiles, setProfiles] = React.useState<CompetitionPermissionProfile[]>([]);
  const [assignments, setAssignments] = React.useState<CompetitionAdminAssignment[]>([]);
  const [profileId, setProfileId] = React.useState("");
  const [permissions, setPermissions] = React.useState<Set<CompetitionPermission>>(new Set());
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    const [profileRows, assignmentRows] = await Promise.all([listAssignableCompetitionProfiles(), listCompetitionAdminAssignments(competitionId)]);
    setProfiles(profileRows); setAssignments(assignmentRows);
  }, [competitionId]);
  React.useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!profileId || !permissions.size) return alert("Wybierz użytkownika i co najmniej jedno uprawnienie.");
    setSaving(true);
    try { await saveCompetitionAdminAssignment(competitionId, profileId, Array.from(permissions)); setProfileId(""); setPermissions(new Set()); await load(); }
    catch (error) { alert("Nie udało się zapisać uprawnień: " + (error instanceof Error ? error.message : String(error))); }
    finally { setSaving(false); }
  };

  return <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
    <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-700" /><div><h3 className="font-semibold text-[#061a33]">Administratorzy zawodów</h3><p className="text-xs text-slate-600">Uprawnienia dotyczą wyłącznie tej kategorii.</p></div></div>
    <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_2fr_auto]">
      <select value={profileId} onChange={event => setProfileId(event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm"><option value="">Wybierz użytkownika</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.displayName} — {profile.clubName || profile.role}</option>)}</select>
      <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl border bg-white p-2.5">{COMPETITION_PERMISSION_KEYS.map(key => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={permissions.has(key)} onChange={event => setPermissions(current => { const next = new Set(current); event.target.checked ? next.add(key) : next.delete(key); return next; })} />{labels[key]}</label>)}</div>
      <button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Nadaj uprawnienia</button>
    </div>
    <div className="mt-3 space-y-2">{assignments.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-sm"><div><span className="font-semibold">{item.profile?.displayName || "Użytkownik"}</span><span className="ml-2 text-xs text-slate-500">{item.profile?.clubName || item.profile?.role}</span><div className="mt-1 text-xs text-slate-600">{item.permissions.map(key => labels[key]).join(" • ")}</div></div><button type="button" aria-label="Usuń uprawnienia" onClick={async () => { if (!confirm("Usunąć wszystkie uprawnienia tej osoby w kategorii?")) return; await removeCompetitionAdminAssignment(item.id); await load(); }} className="rounded-lg border p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}</div>
  </section>;
}

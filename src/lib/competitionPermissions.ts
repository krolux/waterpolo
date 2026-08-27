import { supabase } from "./supabase";

export const COMPETITION_PERMISSION_KEYS = ["matches", "stages", "tournaments", "officials", "delete"] as const;
export type CompetitionPermission = (typeof COMPETITION_PERMISSION_KEYS)[number];

export type CompetitionPermissionProfile = {
  id: string;
  displayName: string;
  role: string;
  clubName: string | null;
};

export type CompetitionAdminAssignment = {
  id: string;
  competitionId: string;
  profileId: string;
  permissions: CompetitionPermission[];
  profile: CompetitionPermissionProfile | null;
};

const parsePermissions = (value?: string | null): CompetitionPermission[] => {
  if (!value) return [];
  if (value === "admin") return [...COMPETITION_PERMISSION_KEYS];
  return value.split(",").filter((item): item is CompetitionPermission => COMPETITION_PERMISSION_KEYS.includes(item as CompetitionPermission));
};

export async function listAssignableCompetitionProfiles(): Promise<CompetitionPermissionProfile[]> {
  const { data, error } = await supabase.from("profiles").select("id,display_name,role,club:clubs(name)").eq("is_active", true).order("display_name");
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: row.id, displayName: row.display_name || "Użytkownik", role: String(row.role || "User"), clubName: row.club?.name || null }));
}

export async function listCompetitionAdminAssignments(competitionId: string): Promise<CompetitionAdminAssignment[]> {
  const { data, error } = await supabase.from("competition_admins").select("id,competition_id,profile_id,role,profile:profiles(id,display_name,role,club:clubs(name))").eq("competition_id", competitionId).order("assigned_at");
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: row.id, competitionId: row.competition_id, profileId: row.profile_id, permissions: parsePermissions(row.role), profile: row.profile ? { id: row.profile.id, displayName: row.profile.display_name || "Użytkownik", role: String(row.profile.role || "User"), clubName: row.profile.club?.name || null } : null }));
}

export async function saveCompetitionAdminAssignment(competitionId: string, profileId: string, permissions: CompetitionPermission[]): Promise<void> {
  const { error } = await supabase.from("competition_admins").upsert({ competition_id: competitionId, profile_id: profileId, role: permissions.join(",") }, { onConflict: "competition_id,profile_id" });
  if (error) throw error;
}

export async function removeCompetitionAdminAssignment(id: string): Promise<void> {
  const { error } = await supabase.from("competition_admins").delete().eq("id", id);
  if (error) throw error;
}

export async function getMyCompetitionPermissions(competitionId: string): Promise<Set<CompetitionPermission>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Set();
  const { data, error } = await supabase.from("competition_admins").select("role").eq("competition_id", competitionId).eq("profile_id", auth.user.id).maybeSingle();
  if (error) throw error;
  return new Set(parsePermissions(data?.role));
}

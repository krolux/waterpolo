import { supabase } from "./supabase";

export const REFEREE_CLASSES = ["Klasa 2", "Klasa 1", "Związkowy"] as const;
export const MATCH_DIFFICULTIES = ["Bardzo łatwy", "Łatwy", "Średni", "Trudny", "Bardzo trudny"] as const;
export type RefereeClass = typeof REFEREE_CLASSES[number];
export type MatchDifficulty = typeof MATCH_DIFFICULTIES[number];

export type RefereeMatchStat = { id:string; date:string; home:string; away:string; result:string; categoryId:string|null; categoryName:string; rawScore:number|null; difficulty:MatchDifficulty|null; weightedScore:number|null };
export type RefereeStat = { id:string; name:string; class:RefereeClass; matchCount:number; averageScore:number|null; matches:RefereeMatchStat[] };
export type RefereeDashboard = { referees:RefereeStat[]; categories:{id:string;name:string;multiplier:number}[]; difficulties:{name:MatchDifficulty;multiplier:number}[] };

export async function submitRefereeReviews(matchId:string, ratings:{name:string;score:number}[], difficulty:MatchDifficulty) {
  const { error } = await supabase.rpc("submit_match_referee_reviews", { target_match_id:matchId, ratings, match_difficulty:difficulty });
  if (error) throw error;
}
export async function getRefereeDashboard():Promise<RefereeDashboard> {
  const { data,error } = await supabase.rpc("get_referee_dashboard"); if(error) throw error;
  return data as RefereeDashboard;
}
export async function setRefereeClass(profileId:string, value:RefereeClass) {
  const { error }=await supabase.rpc("set_referee_class",{target_profile_id:profileId,target_class:value}); if(error) throw error;
}
export async function setRefereeMultiplier(kind:"category"|"difficulty",key:string,value:number) {
  const { error }=await supabase.rpc("set_referee_multiplier",{multiplier_kind:kind,target_key:key,target_multiplier:value}); if(error) throw error;
}
export async function getMyRefereeClass():Promise<RefereeClass|null> { const {data,error}=await supabase.rpc("get_my_referee_class"); if(error) throw error; return data as RefereeClass|null; }

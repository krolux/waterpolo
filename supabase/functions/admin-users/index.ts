import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const roles = ["Guest", "Club", "Delegate", "Admin", "Referee", "Editor"];
const columns = "id,display_name,first_name,last_name,email,role,club_id,is_active,created_at";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers: {...cors, "Content-Type": "application/json", "Cache-Control": "no-store"}});
const uuid = (value: unknown) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function text(value: unknown, max = 100) {
  if (typeof value !== "string" || value.length > max) throw new Error("Niepoprawna wartość pola.");
  return value.trim();
}
function password(value: unknown) {
  if (typeof value !== "string" || value.length < 8 || value.length > 128) throw new Error("Hasło musi mieć od 8 do 128 znaków.");
  return value;
}

export async function handle(req: Request, db: any) {
  if (req.method === "OPTIONS") return new Response("ok", {headers: cors});
  if (req.method !== "POST") return reply({error:"Niedozwolona metoda."},405);
  const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return reply({error:"Zaloguj się ponownie."},401);
  const {data: auth, error: authError} = await db.auth.getUser(token);
  if (authError || !auth.user) return reply({error:"Sesja wygasła. Zaloguj się ponownie."},401);
  const {data: caller, error: callerError} = await db.from("profiles").select("role,is_active").eq("id",auth.user.id).single();
  if (callerError || caller?.role !== "Admin" || caller.is_active === false) return reply({error:"Dostęp wyłącznie dla administratora."},403);
  try {
    const body = await req.json();
    if (body.action === "list") {
      const {data: profiles,error} = await db.from("profiles").select(columns).order("display_name");
      if (error) throw error;
      const emailById = new Map();
      for (let page=1; ; page++) {
        const {data,error: usersError} = await db.auth.admin.listUsers({page,perPage:1000});
        if(usersError) throw usersError;
        for(const user of data.users) emailById.set(user.id,user.email || "");
        if(data.users.length<1000) break;
      }
      const {data: clubs,error: clubsError} = await db.from("clubs").select("id,name").order("name");
      if(clubsError) throw clubsError;
      return reply({users:profiles.map((p: any)=>({...p,email:emailById.get(p.id)||p.email||""})),clubs,roles,currentUserId:auth.user.id});
    }
    if (!["create","edit","password","approve"].includes(body.action)) throw new Error("Nieznana akcja.");
    if (body.action !== "create" && !uuid(body.id)) throw new Error("Niepoprawne ID użytkownika.");
    if(body.action === "password") {
      if(body.id === auth.user.id) throw new Error("Własne hasło zmień w menu Moje konto.");
      const {error} = await db.auth.admin.updateUserById(body.id,{password:password(body.password)});
      if(error) throw error;
      return reply({ok:true});
    }
    if(body.action === "approve") {
      const {data,error} = await db.from("profiles").update({is_active:true,approved:true}).eq("id",body.id).select("id").single();
      if(error || !data) throw error || new Error("Nie znaleziono użytkownika.");
      return reply({ok:true});
    }
    const display_name = text(body.display_name);
    if(!display_name) throw new Error("Podaj nazwę użytkownika.");
    if(!roles.includes(body.role)) throw new Error("Niepoprawna rola.");
    const club_id = body.club_id || null;
    if(club_id) {
      if(!uuid(club_id)) throw new Error("Niepoprawne ID klubu.");
      const {data,error} = await db.from("clubs").select("id").eq("id",club_id).single();
      if(error || !data) throw new Error("Nie znaleziono klubu.");
    }
    if(body.role === "Club" && !club_id) throw new Error("Dla roli Klub wybierz klub.");
    const profile = {display_name,first_name:text(body.first_name || ""),last_name:text(body.last_name || ""),role:body.role,club_id};
    if(body.action === "edit") {
      if(body.id === auth.user.id && body.role !== "Admin") throw new Error("Nie możesz odebrać sobie roli administratora.");
      const {data,error} = await db.from("profiles").update(profile).eq("id",body.id).select("id").single();
      if(error || !data) throw error || new Error("Nie znaleziono użytkownika.");
      return reply({ok:true});
    }
    const email = text(body.email,254).toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Podaj poprawny adres e-mail.");
    const {data,error} = await db.auth.admin.createUser({email,password:password(body.password),email_confirm:true,user_metadata:{display_name,first_name:profile.first_name,last_name:profile.last_name}});
    if(error) throw error;
    const {error: profileError} = await db.from("profiles").upsert({...profile,id:data.user.id,email,is_active:true,approved:true});
    if(profileError) {
      // Only the new account from this request is removed if its profile cannot be saved.
      const {error: cleanupError} = await db.auth.admin.deleteUser(data.user.id);
      if(cleanupError) throw new Error("Utworzono konto Auth, ale profil nie został zapisany. Sprawdź konto w Supabase przed ponowieniem.");
      throw profileError;
    }
    return reply({ok:true,id:data.user.id});
  } catch(error) {
    return reply({error:error instanceof Error ? error.message : "Nie udało się wykonać operacji."},400);
  }
}

Deno.serve((req) => handle(req,createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}})));

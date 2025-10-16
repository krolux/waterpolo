import React from "react";
import { supabase } from "../lib/supabase";

const cls = {
  input: "w-full border rounded-lg p-2",
  primary: "px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700",
  secondary: "px-3 py-2 rounded-lg border bg-white hover:bg-gray-50",
};

export const RegisterForm: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [club, setClub] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName || !displayName) {
      alert("Uzupełnij: e-mail, hasło, imię, nazwisko i nazwę konta.");
      return;
    }
    setLoading(true);
    try {
      // 1) Załóż konto auth
      const { data: sign, error: signErr } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signErr) throw signErr;
      const uid = sign.user?.id;
      if (!uid) throw new Error("Nie udało się utworzyć konta.");

      // 2) Utwórz/uzupełnij profil (approved = false)
      const { error: profErr } = await supabase.from("profiles").upsert(
        {
          id: uid,
          display_name: displayName,
          first_name: firstName,
          last_name: lastName,
          // jeśli masz clubs relację i chcesz dopasować po nazwie – pomiń; tutaj trzymamy tylko nazwę:
          club_name: club || null, // albo club_id, jeśli wybierasz z listy
          role: "User",            // zwykły użytkownik
          approved: false,
        },
        { onConflict: "id" }
      );
      if (profErr) throw profErr;

      alert("Zarejestrowano! Administrator musi zatwierdzić Twoje konto zanim dodasz komentarz.");
      onDone?.();
    } catch (e: any) {
      alert("Błąd rejestracji: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-md mx-auto rounded-2xl p-4 bg-white/60 border border-white/40 shadow">
      <h2 className="text-xl font-semibold mb-3">Rejestracja</h2>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input className={cls.input} placeholder="Imię" value={firstName} onChange={e=>setFirstName(e.target.value)} />
          <input className={cls.input} placeholder="Nazwisko" value={lastName} onChange={e=>setLastName(e.target.value)} />
        </div>
        <input className={cls.input} placeholder="Nazwa konta (widoczna pod artykułami)" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
        <input className={cls.input} placeholder="Klub (opcjonalnie)" value={club} onChange={e=>setClub(e.target.value)} />
        <input className={cls.input} type="email" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className={cls.input} type="password" placeholder="Hasło" value={password} onChange={e=>setPassword(e.target.value)} />
        <div className="flex gap-2">
          <button className={cls.primary} type="submit" disabled={loading}>
            {loading ? "Rejestrowanie…" : "Zarejestruj się"}
          </button>
        </div>
        <p className="text-xs text-gray-600">
          Po rejestracji administrator musi zatwierdzić konto. Do tego czasu nie będziesz mógł/mogła dodawać komentarzy.
        </p>
      </form>
    </section>
  );
};

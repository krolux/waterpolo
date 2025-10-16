import React from "react";
import { supabase } from "../lib/supabase";

const cls = {
  input: "w-full border rounded-lg p-2",
  primary: "px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700",
  secondary: "px-3 py-2 rounded-lg border bg-white hover:bg-gray-50",
};

type ClubRow = { id: string; name: string };

export const RegisterForm: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [clubText, setClubText] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Podpowiedzi klubów (id, name)
  const [clubs, setClubs] = React.useState<ClubRow[]>([]);
  React.useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id,name")
        .order("name", { ascending: true });
      if (!error && data) setClubs(data as ClubRow[]);
    })();
  }, []);

  // Dopasuj wpisany tekst do listy klubów (case-insensitive)
  function resolveClubId(text: string): string | null {
    const t = (text || "").trim().toLowerCase();
    if (!t) return null;
    const hit = clubs.find((c) => (c.name || "").trim().toLowerCase() === t);
    return hit?.id ?? null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const emailNorm = email.trim().toLowerCase();
    const passNorm = password.trim();
    const first = firstName.trim();
    const last = lastName.trim();
    const disp = displayName.trim();

    if (!emailNorm || !passNorm || !first || !last || !disp) {
      alert("Uzupełnij: e-mail, hasło, imię, nazwisko i nazwę konta.");
      return;
    }

    setLoading(true);
    try {
      // 1) Rejestracja w Auth
      const { data: sign, error: signErr } = await supabase.auth.signUp({
        email: emailNorm,
        password: passNorm,
      });
      if (signErr) throw signErr;

      // 2) Jeśli jest już sesja (e-mail confirmation wyłączone), uzupełnij profil UPDATE'em
      const { data: sess } = await supabase.auth.getSession();
      const session = sess?.session;

      if (session?.user?.id) {
        const club_id = resolveClubId(clubText);
        const { error: updErr } = await supabase
          .from("profiles")
          .update({
            display_name: disp,
            first_name: first,
            last_name: last,
            club_id: club_id, // może być null
            // role/approved pozostają wg defaultów i/lub edycji admina
          })
          .eq("id", session.user.id);

        if (updErr) throw updErr;

        alert("Konto utworzone. Profil uzupełniony.");
        onDone?.();
        return;
      }

      // 3) Jeśli sesji nie ma (np. wymagane potwierdzenie e-mail)
      alert(
        "Zarejestrowano! Sprawdź skrzynkę i potwierdź e-mail. Po pierwszym zalogowaniu uzupełnisz profil."
      );
      onDone?.();
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : String(e);
      alert(`Błąd rejestracji: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-md mx-auto rounded-2xl p-4 bg-white/60 border border-white/40 shadow">
      <h2 className="text-xl font-semibold mb-3">Rejestracja</h2>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            className={cls.input}
            placeholder="Imię"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            className={cls.input}
            placeholder="Nazwisko"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <input
          className={cls.input}
          placeholder="Nazwa konta (widoczna pod artykułami)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        {/* Klub – datalist (opcjonalny) */}
        <div>
          <input
            list="club-hints"
            className={cls.input}
            placeholder="Klub (opcjonalnie) — wybierz z listy lub zostaw puste"
            value={clubText}
            onChange={(e) => setClubText(e.target.value)}
          />
          <datalist id="club-hints">
            {clubs.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <p className="text-xs text-gray-500 mt-1">
            To pole jest informacyjne. Tylko dokładne wybranie z listy przypisze
            konto do klubu; w innym wypadku konto pozostanie bez klubu.
          </p>
        </div>

        <input
            className={cls.input}
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
        />
        <input
            className={cls.input}
            type="password"
            placeholder="Hasło"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex gap-2">
          <button className={cls.primary} type="submit" disabled={loading}>
            {loading ? "Rejestrowanie…" : "Zarejestruj się"}
          </button>
        </div>

        <p className="text-xs text-gray-600">
          Po rejestracji administrator może nadać dodatkowe uprawnienia (np.
          rola Klubu). Sam wybór klubu przy rejestracji nie daje uprawnień.
        </p>
      </form>
    </section>
  );
};

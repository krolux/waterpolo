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

  // podpowiedzi klubów
  const [clubs, setClubs] = React.useState<ClubRow[]>([]);
  React.useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id,name")
        .order("name", { ascending: true });
      if (!error && data) setClubs(data);
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const emailNorm = email.trim().toLowerCase();
    const passNorm = password.trim();
    const first = firstName.trim();
    const last = lastName.trim();
    const disp = displayName.trim();
    const clubRaw = clubText.trim();

    if (!emailNorm || !passNorm || !first || !last || !disp) {
      alert("Uzupełnij: e-mail, hasło, imię, nazwisko i nazwę konta.");
      return;
    }

    setLoading(true);
    try {
      // 1) Załóż konto w Auth
      const { data: sign, error: signErr } = await supabase.auth.signUp({
        email: emailNorm,
        password: passNorm,
      });
      if (signErr) throw signErr;

      const uid = sign.user?.id;
      if (!uid) throw new Error("Nie udało się utworzyć konta (brak ID).");

      // 2) Spróbuj dopasować klub po nazwie (case-insensitive)
      let club_id: string | null = null;
      if (clubRaw) {
        const hit = clubs.find(
          (c) => (c.name || "").trim().toLowerCase() === clubRaw.toLowerCase()
        );
        club_id = hit?.id ?? null;
      }

      // 3) Zapis profilu (bez wymuszania klubu)
      const { error: profErr } = await supabase.from("profiles").upsert(
        {
          id: uid,
          display_name: disp,
          first_name: first,
          last_name: last,
          role: "Guest",      // nowy użytkownik jako Gość
          approved: false,    // do zatwierdzenia przez admina
          club_id,            // może zostać null, jeśli brak trafienia
          club_name: clubRaw || null, // zachowujemy to co wpisał
        },
        { onConflict: "id" }
      );
      if (profErr) throw profErr;

      alert(
        "Zarejestrowano! Administrator musi zatwierdzić Twoje konto zanim dodasz komentarz."
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

        {/* Klub – dowolny tekst + podpowiedzi z bazy */}
        <div>
          <input
            list="club-hints"
            className={cls.input}
            placeholder="Klub (opcjonalnie) — dowolny tekst"
            value={clubText}
            onChange={(e) => setClubText(e.target.value)}
          />
          <datalist id="club-hints">
            {clubs.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <p className="text-xs text-gray-500 mt-1">
            Wybierz z podpowiedzi lub wpisz własną nazwę. Jeśli nie trafimy w
            listę klubów, zapisze się tylko tekst (konto nie będzie przypisane
            do klubu).
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
          Po rejestracji administrator musi zatwierdzić konto. Do tego czasu nie
          będziesz mógł/mogła dodawać komentarzy.
        </p>
      </form>
    </section>
  );
};

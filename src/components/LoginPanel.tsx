import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  async function handlePasswordLogin() {
    setMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setMsg({ type: "ok", text: "Zalogowano pomyślnie." });
      // przeładuj, aby odświeżyć sesję/stan aplikacji
      setTimeout(() => window.location.reload(), 400);
    } catch (e: any) {
      setMsg({
        type: "err",
        text:
          e?.message ||
          "Nie udało się zalogować. Sprawdź email i hasło lub spróbuj ponownie.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border bg-white/70 p-4 md:p-6">
      <h2 className="mb-3 text-lg font-semibold">Zaloguj się</h2>

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr,1fr,auto]">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          autoComplete="current-password"
        />
        <button
          onClick={handlePasswordLogin}
          disabled={loading || !email || !password}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Logowanie..." : "Zaloguj"}
        </button>
      </div>

      {msg && (
        <p
          className={
            msg.type === "ok"
              ? "text-sm text-green-700"
              : "text-sm text-red-600"
          }
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}

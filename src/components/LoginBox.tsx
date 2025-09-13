import React, { useState } from "react";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";

export const LoginBox: React.FC<{ classes: Record<string, string> }> = ({
  // przyjmujemy prop, ale nie używamy go – unikamy konfliktu z globalnym `classes`
  classes: _classes,
}) => {
  const { role, userDisplay, signIn, signOut, changePassword } =
    useSupabaseAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPass, setNewPass] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    try {
      setLoading(true);
      await signIn(email, password);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePass() {
    try {
      if (!newPass.trim()) {
        alert("Podaj nowe hasło");
        return;
      }
      setLoading(true);
      await changePassword(newPass);
      alert("Hasło zmienione");
      setNewPass("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  // --- ZALOGOWANY ---
  if (role !== "Guest") {
    return (
      <div className="w-full max-w-[440px]">
        {/* mobile: kolumna • desktop: wiersz */}
        <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
          <span className="text-sm text-gray-700 sm:mr-1 truncate">
            {userDisplay}
          </span>

          {/* input: pełna szerokość na mobile, stała na desktopie */}
          <input
            className="w-full sm:w-[180px] px-4 py-3 rounded-lg border bg-white text-base focus:outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="Nowe hasło"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            type="password"
            autoComplete="new-password"
            onKeyDown={(e) => e.key === "Enter" && handleChangePass()}
          />

          <button
            disabled={loading}
            onClick={handleChangePass}
            className="px-4 py-3 rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow w-full sm:w-auto shrink-0 whitespace-nowrap disabled:opacity-60"
          >
            Zmień hasło
          </button>

          <button
            disabled={loading}
            onClick={() => signOut()}
            className="px-4 py-3 rounded-lg border bg-white hover:bg-gray-50 w-full sm:w-auto shrink-0 whitespace-nowrap disabled:opacity-60"
          >
            Wyloguj
          </button>
        </div>
      </div>
    );
  }

  // --- GOŚĆ (formularz logowania) ---
  return (
    <div className="w-full max-w-[440px]">
      {/* mobile: kolumna • desktop: wiersz */}
      <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
        <input
          className="w-full px-4 py-3 rounded-lg border bg-white text-base focus:outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="username"
          inputMode="email"
          onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
        />

        <input
          className="w-full px-4 py-3 rounded-lg border bg-white text-base focus:outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
        />

        <button
          disabled={loading}
          onClick={handleSignIn}
          className="px-4 py-3 rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow w-full sm:w-auto shrink-0 whitespace-nowrap disabled:opacity-60"
        >
          Zaloguj
        </button>
      </div>
    </div>
  );
};
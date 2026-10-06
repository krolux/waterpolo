import React, { useEffect, useRef, useState } from "react";

type Props = {
  classes: Record<string, string>;
  name: string;
  onSignOut: () => void;
  onUpdateDisplayName: (newName: string) => Promise<void>;
  onChangePassword: (newPassword: string) => Promise<void>;
};

export const AccountMenu: React.FC<Props> = ({ classes, name, onSignOut, onUpdateDisplayName, onChangePassword }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [nameDraft, setNameDraft] = useState(name);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [passBusy, setPassBusy] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setNameDraft(name);
  }, [name]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSaveName() {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameMsg({ type: "err", text: "Nazwa nie może być pusta." });
      return;
    }
    setNameBusy(true);
    setNameMsg(null);
    try {
      await onUpdateDisplayName(trimmed);
      setNameMsg({ type: "ok", text: "Nazwa zapisana." });
    } catch (e: any) {
      setNameMsg({ type: "err", text: e?.message || "Nie udało się zapisać nazwy." });
    } finally {
      setNameBusy(false);
    }
  }

  async function handleSavePassword() {
    if (!newPass || !newPass2) {
      setPassMsg({ type: "err", text: "Uzupełnij oba pola hasła." });
      return;
    }
    if (newPass.length < 6) {
      setPassMsg({ type: "err", text: "Hasło musi mieć co najmniej 6 znaków." });
      return;
    }
    if (newPass !== newPass2) {
      setPassMsg({ type: "err", text: "Hasła nie są identyczne." });
      return;
    }
    setPassBusy(true);
    setPassMsg(null);
    try {
      await onChangePassword(newPass);
      setPassMsg({ type: "ok", text: "Hasło zostało zmienione." });
      setNewPass("");
      setNewPass2("");
    } catch (e: any) {
      setPassMsg({ type: "err", text: e?.message || "Nie udało się zmienić hasła." });
    } finally {
      setPassBusy(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="max-w-[40vw] truncate rounded-xl px-2 py-1 text-sm text-slate-700 underline-offset-2 hover:underline sm:max-w-none"
        title="Moje konto"
      >
        {name}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[280px] rounded-2xl border border-[#dbeafe] bg-white p-4 text-left shadow-[0_18px_40px_rgba(2,32,71,0.16)]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0A1F44]">Moje konto</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-1.5 py-0.5 text-slate-500 hover:bg-sky-50 hover:text-slate-800"
              title="Zamknij"
            >
              ✕
            </button>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-[#5F6F8C]">Edytuj nazwę</label>
            <div className="flex gap-1.5">
              <input
                className={`${classes.input} text-sm`}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              />
              <button
                type="button"
                disabled={nameBusy}
                onClick={handleSaveName}
                className={`${classes.btnSecondary} whitespace-nowrap text-sm`}
              >
                Zapisz
              </button>
            </div>
            {nameMsg && (
              <p className={`mt-1 text-xs ${nameMsg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
                {nameMsg.text}
              </p>
            )}
          </div>

          <div className="mb-3 border-t border-[#eef4fb] pt-3">
            <label className="mb-1 block text-xs font-medium text-[#5F6F8C]">Zmień hasło</label>
            <div className="flex flex-col gap-1.5">
              <input
                type="password"
                autoComplete="new-password"
                className={`${classes.input} text-sm`}
                placeholder="Nowe hasło"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
              <input
                type="password"
                autoComplete="new-password"
                className={`${classes.input} text-sm`}
                placeholder="Powtórz nowe hasło"
                value={newPass2}
                onChange={(e) => setNewPass2(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSavePassword()}
              />
              <button
                type="button"
                disabled={passBusy}
                onClick={handleSavePassword}
                className={`${classes.btnSecondary} text-sm`}
              >
                Zmień hasło
              </button>
            </div>
            {passMsg && (
              <p className={`mt-1 text-xs ${passMsg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
                {passMsg.text}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm font-medium text-[#0A1F44] transition hover:bg-sky-50"
            title="Wyloguj"
          >
            Wyloguj
          </button>
        </div>
      )}
    </div>
  );
};

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useApp } from "../lib/store";
import { MODULES, MODULE_ROLES, ROLE_MAP, BRANCHES, timeAgo, fullName } from "../lib/data";
import type { ModuleId } from "../lib/data";
import { I, PulseMark } from "./icons";
import { Avatar, ECG, Pill } from "./ui";

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="hidden md:flex flex-col items-end leading-none">
      <span className="font-mono text-[13px] font-semibold text-ink tabular-nums">
        {now.toLocaleTimeString("en-US", { hour12: false })}
      </span>
      <span className="micro text-ink-faint mt-0.5">
        {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
      </span>
    </div>
  );
}

function GlobalSearch() {
  const { s, go } = useApp();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", fn);
    return () => window.removeEventListener("mousedown", fn);
  }, []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return null;
    const patients = s.patients.filter((p) => `${p.firstName} ${p.lastName} ${p.code} ${p.phone}`.toLowerCase().includes(needle)).slice(0, 5);
    const doctors = s.doctors.filter((d) => `${d.name} ${d.specialization}`.toLowerCase().includes(needle)).slice(0, 4);
    const meds = s.medicines.filter((m) => `${m.name} ${m.generic} ${m.category}`.toLowerCase().includes(needle)).slice(0, 4);
    return { patients, doctors, meds, total: patients.length + doctors.length + meds.length };
  }, [q, s.patients, s.doctors, s.medicines]);

  return (
    <div ref={boxRef} className="relative flex-1 max-w-md">
      <I name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search patients, doctors, medicines…  (PT-1041)"
        className="w-full bg-white border border-line rounded-lg pl-9 pr-3 py-2 text-[13px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-shadow placeholder:text-ink-faint/70"
      />
      {open && results && (
        <div className="pop-in absolute left-0 right-0 top-full mt-1.5 bg-card border border-line rounded-xl shadow-xl overflow-hidden z-40">
          {results.total === 0 && <p className="px-4 py-4 text-xs text-ink-faint">No matches for “{q}”.</p>}
          {results.patients.length > 0 && (
            <div className="py-1">
              <p className="micro text-ink-faint px-4 py-1">Patients</p>
              {results.patients.map((p) => (
                <button key={p.id} onClick={() => { if (s.session?.role === "patient") go("portal"); else go("patients", p.id); setOpen(false); setQ(""); }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-brand-50 transition-colors text-left">
                  <Avatar name={fullName(p)} color={p.color} size={26} />
                  <span className="text-[13px] font-medium text-ink">{fullName(p)}</span>
                  <span className="font-mono text-[11px] text-ink-faint">{p.code}</span>
                  {p.allergies.length > 0 && <Pill tone="red" className="ml-auto">⚠ {p.allergies[0]}</Pill>}
                </button>
              ))}
            </div>
          )}
          {results.doctors.length > 0 && (
            <div className="py-1 border-t border-line-soft">
              <p className="micro text-ink-faint px-4 py-1">Doctors</p>
              {results.doctors.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-2">
                  <Avatar name={d.name} color={d.color} size={26} />
                  <span className="text-[13px] font-medium text-ink">{d.name}</span>
                  <span className="text-[11px] text-ink-faint">{d.specialization}</span>
                  <Pill tone={d.status === "available" ? "green" : "amber"} className="ml-auto">{d.status}</Pill>
                </div>
              ))}
            </div>
          )}
          {results.meds.length > 0 && (
            <div className="py-1 border-t border-line-soft">
              <p className="micro text-ink-faint px-4 py-1">Medicines</p>
              {results.meds.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-2">
                  <I name="pill" className="w-4 h-4 text-brand-600" />
                  <span className="text-[13px] font-medium text-ink">{m.name}</span>
                  <span className="text-[11px] text-ink-faint">{m.category}</span>
                  <span className={`ml-auto font-mono text-[11px] ${m.stock <= m.reorder ? "text-danger-600 font-semibold" : "text-ink-faint"}`}>{m.stock} u</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const { s, markRead, markAllRead } = useApp();
  const [open, setOpen] = useState(false);
  const role = s.session?.role ?? "admin";
  const mine = s.notifications.filter((n) => n.audience === "all" || (n.audience as string[]).includes(role));
  const unread = mine.filter((n) => !n.read).length;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", fn);
    return () => window.removeEventListener("mousedown", fn);
  }, []);

  const kindTone = { info: "steel", success: "green", warning: "amber", danger: "red" } as const;
  const kindIcon = { info: "info", success: "check", warning: "alert", danger: "alert" } as const;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 grid place-items-center rounded-lg border border-line bg-white text-ink-soft hover:text-brand-700 hover:border-brand-500 transition-colors"
        aria-label="Notifications"
      >
        <I name="bell" className="w-[18px] h-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger-600 text-white text-[10px] font-bold grid place-items-center pulse-danger">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="pop-in absolute right-0 top-full mt-2 w-[340px] bg-card border border-line rounded-xl shadow-xl z-40 overflow-hidden">
          <header className="flex items-center justify-between px-4 py-2.5 border-b border-line-soft">
            <p className="font-display font-bold text-sm text-ink">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] font-semibold text-brand-700 hover:underline">Mark all read</button>
            )}
          </header>
          <div className="max-h-[360px] overflow-y-auto scroll-slim">
            {mine.length === 0 && <p className="px-4 py-6 text-xs text-ink-faint text-center">You're all caught up.</p>}
            {mine.map((n) => (
              <button key={n.id} onClick={() => markRead(n.id)}
                className={`w-full text-left px-4 py-2.5 flex gap-2.5 border-b border-line-soft last:border-0 transition-colors hover:bg-brand-50/60 ${n.read ? "opacity-60" : ""}`}>
                <span className={`mt-0.5 w-6 h-6 rounded-md grid place-items-center shrink-0 ${kindTone[n.kind] === "green" ? "bg-brand-100 text-brand-700" : kindTone[n.kind] === "amber" ? "bg-warn-100 text-warn-700" : kindTone[n.kind] === "red" ? "bg-danger-100 text-danger-700" : "bg-steel-100 text-steel-700"}`}>
                  <I name={kindIcon[n.kind]} className="w-3.5 h-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold text-ink leading-snug">{n.title}</span>
                  <span className="block text-[11.5px] text-ink-soft leading-snug mt-0.5">{n.desc}</span>
                  <span className="block micro text-ink-faint mt-1">{timeAgo(n.at)}</span>
                </span>
                {!n.read && <span className="ml-auto mt-1.5 w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { s, go, signOut, setBranch, toasts, dismiss, reset } = useApp();
  const role = s.session?.role ?? "admin";
  const meta = ROLE_MAP[role];
  const visible = MODULES.filter((m) => MODULE_ROLES[m.id].includes(role));
  const groups = [...new Set(visible.map((m) => m.group))];

  const toastMeta = {
    success: { cls: "border-l-brand-500", icon: "check", iconCls: "bg-brand-100 text-brand-700" },
    error: { cls: "border-l-danger-600", icon: "alert", iconCls: "bg-danger-100 text-danger-700" },
    warning: { cls: "border-l-warn-600", icon: "alert", iconCls: "bg-warn-100 text-warn-700" },
    info: { cls: "border-l-steel-600", icon: "info", iconCls: "bg-steel-100 text-steel-700" },
  } as const;

  return (
    <div className="h-full flex overflow-hidden">
      {/* ---------- sidebar ---------- */}
      <aside className="w-[228px] shrink-0 bg-pine-900 pine-tex text-pine-100 flex flex-col">
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-white/8">
          <PulseMark className="w-8 h-8" />
          <div className="leading-none">
            <p className="font-display font-extrabold text-[15px] text-white tracking-tight">AURELIA<span className="text-brand-400"> HMS</span></p>
            <p className="micro text-brand-400/70 mt-1">ops console</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto scroll-dark py-3 px-2.5">
          {groups.map((g) => (
            <div key={g} className="mb-3">
              <p className="micro text-brand-400/50 px-2.5 mb-1">{g}</p>
              {visible.filter((m) => m.group === g).map((m) => {
                const active = s.view === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => go(m.id as ModuleId)}
                    className={`relative w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150 mb-0.5 ${
                      active ? "bg-white/10 text-white" : "text-pine-100/75 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brand-400" />}
                    <I name={m.icon} className={`w-[17px] h-[17px] ${active ? "text-brand-400" : ""}`} />
                    {m.label}
                    {m.id === "pharmacy" && s.prescriptions.filter((r) => r.status === "sent").length > 0 && role !== "patient" && (
                      <span className="ml-auto font-mono text-[10px] bg-warn-600 text-white px-1.5 py-px rounded-full">
                        {s.prescriptions.filter((r) => r.status === "sent").length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-3 pb-3">
          <div className="rounded-lg bg-white/5 border border-white/8 px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-400 pulse-live" />
              <p className="micro text-brand-400">Live · {BRANCHES.find((b) => b.id === s.branchId)?.name}</p>
            </div>
            <ECG className="w-full h-7" />
          </div>
          <button onClick={reset} className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] text-pine-100/50 hover:text-pine-100 transition-colors py-1">
            <I name="refresh" className="w-3 h-3" /> Reset demo data
          </button>
        </div>
      </aside>

      {/* ---------- main ---------- */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 bg-card/90 backdrop-blur border-b border-line flex items-center gap-3 px-4 lg:px-6">
          <select
            value={s.branchId}
            onChange={(e) => setBranch(e.target.value)}
            className="hidden lg:flex items-center gap-1.5 bg-white border border-line rounded-lg pl-2.5 pr-7 py-2 text-xs font-semibold text-ink outline-none focus:border-brand-500 appearance-none cursor-pointer hover:border-brand-400 transition-colors"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237f918a' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 9px center" }}
          >
            {BRANCHES.map((b) => (
              <option key={b.id} value={b.id}>{b.name} · {b.city}</option>
            ))}
          </select>

          <GlobalSearch />

          <div className="ml-auto flex items-center gap-3">
            <Clock />
            <Notifications />
            <div className="h-8 w-px bg-line hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <Avatar name={meta.name} color={meta.color} size={34} />
              <div className="hidden sm:block leading-tight">
                <p className="text-[13px] font-semibold text-ink">{meta.name}</p>
                <p className="micro text-brand-700">{meta.label}</p>
              </div>
              <button onClick={signOut} className="w-8 h-8 grid place-items-center rounded-lg text-ink-faint hover:text-danger-600 hover:bg-danger-50 transition-colors" title="Sign out" aria-label="Sign out">
                <I name="logout" className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scroll-slim paper-tex">
          <div className="max-w-[1240px] mx-auto px-4 lg:px-6 py-5">{children}</div>
        </main>
      </div>

      {/* ---------- toasts ---------- */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[330px]">
        {toasts.map((t) => {
          const m = toastMeta[t.kind];
          return (
            <div key={t.id} className={`toast-in bg-card border border-line border-l-[3px] ${m.cls} rounded-lg shadow-lg px-3.5 py-3 flex gap-2.5`}>
              <span className={`w-7 h-7 rounded-md grid place-items-center shrink-0 ${m.iconCls}`}>
                <I name={m.icon} className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink leading-snug">{t.title}</p>
                {t.desc && <p className="text-[11.5px] text-ink-soft mt-0.5 leading-snug">{t.desc}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-ink-faint hover:text-ink self-start" aria-label="Dismiss">
                <I name="x" className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

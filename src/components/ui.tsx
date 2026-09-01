import { useEffect } from "react";
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { I } from "./icons";
import { initialsOf } from "../lib/data";

/* ---------- tone pills ---------- */

export type Tone = "green" | "amber" | "red" | "steel" | "gray" | "pine";

const TONE_PILL: Record<Tone, string> = {
  green: "bg-brand-100 text-brand-700",
  amber: "bg-warn-100 text-warn-700",
  red: "bg-danger-100 text-danger-700",
  steel: "bg-steel-100 text-steel-700",
  gray: "bg-line-soft text-ink-soft",
  pine: "bg-pine-800 text-brand-200",
};
const TONE_DOT: Record<Tone, string> = {
  green: "bg-brand-500", amber: "bg-warn-600", red: "bg-danger-600", steel: "bg-steel-600", gray: "bg-ink-faint", pine: "bg-brand-400",
};

export function Pill({ tone = "gray", children, dot = true, className = "" }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${TONE_PILL[tone]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[tone]}`} />}
      {children}
    </span>
  );
}

export const APPT_META: Record<string, { label: string; tone: Tone }> = {
  scheduled: { label: "Scheduled", tone: "steel" },
  "checked-in": { label: "Waiting", tone: "amber" },
  "in-consultation": { label: "In consult", tone: "pine" },
  completed: { label: "Completed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "gray" },
  "no-show": { label: "No-show", tone: "red" },
};
export const LAB_META: Record<string, { label: string; tone: Tone }> = {
  ordered: { label: "Ordered", tone: "steel" },
  collected: { label: "Collected", tone: "amber" },
  processing: { label: "Processing", tone: "amber" },
  completed: { label: "Awaiting verify", tone: "pine" },
  verified: { label: "Verified", tone: "green" },
};
export const BILL_META: Record<string, { label: string; tone: Tone }> = {
  unpaid: { label: "Unpaid", tone: "red" },
  partial: { label: "Partial", tone: "amber" },
  paid: { label: "Paid", tone: "green" },
  refunded: { label: "Refunded", tone: "gray" },
};
export const BED_META: Record<string, { label: string; tone: Tone }> = {
  available: { label: "Available", tone: "green" },
  occupied: { label: "Occupied", tone: "pine" },
  cleaning: { label: "Cleaning", tone: "amber" },
  maintenance: { label: "Maintenance", tone: "red" },
};

/* ---------- surfaces ---------- */

export function Card({ title, sub, action, children, className = "", pad = true }: {
  title?: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean;
}) {
  return (
    <section className={`bg-card border border-line rounded-xl shadow-[0_1px_2px_rgba(20,35,30,0.05)] ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5 border-b border-line-soft">
          <div>
            <h3 className="font-display font-bold text-[15px] text-ink leading-tight">{title}</h3>
            {sub && <p className="text-xs text-ink-faint mt-0.5">{sub}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, icon, tone = "green", delay = 0 }: {
  label: string; value: ReactNode; sub?: ReactNode; icon: string; tone?: Tone; delay?: number;
}) {
  const iconBg: Record<Tone, string> = {
    green: "bg-brand-100 text-brand-700", amber: "bg-warn-100 text-warn-700", red: "bg-danger-100 text-danger-700",
    steel: "bg-steel-100 text-steel-700", gray: "bg-line-soft text-ink-soft", pine: "bg-pine-800 text-brand-200",
  };
  return (
    <div className="fade-up bg-card border border-line rounded-xl px-4 py-3.5 flex items-start gap-3 hover:border-brand-400/60 hover:shadow-[0_4px_14px_rgba(14,130,98,0.08)] transition-all duration-200" style={{ animationDelay: `${delay}ms` }}>
      <span className={`mt-0.5 w-9 h-9 rounded-lg grid place-items-center shrink-0 ${iconBg[tone]}`}>
        <I name={icon} className="w-[18px] h-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="micro text-ink-faint">{label}</p>
        <p className="font-display font-extrabold text-[22px] leading-7 text-ink tabular-nums truncate">{value}</p>
        {sub && <p className="text-[11px] text-ink-soft mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ---------- charts (pure SVG) ---------- */

export function Sparkline({ data, w = 220, h = 56, stroke = "#0e8262" }: { data: number[]; w?: number; h?: number; stroke?: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * (w - 4) + 2,
    h - 6 - ((v - min) / (max - min || 1)) * (h - 14),
  ]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${h - 2} L${pts[0][0]},${h - 2} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkfill)" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" className="draw-line" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.2" fill={stroke} />
    </svg>
  );
}

export function Bars({ data, labels, h = 120, color = "#0e8262" }: { data: number[]; labels?: string[]; h?: number; color?: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-2" style={{ height: h + 18 }}>
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-default">
          <span className="text-[10px] font-mono text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">{v}</span>
          <div
            className="w-full rounded-t-[4px] grow-bar transition-colors group-hover:opacity-80"
            style={{ height: Math.max(4, (v / max) * h), background: i === data.length - 1 ? color : `${color}55`, animationDelay: `${i * 60}ms` }}
            title={`${labels?.[i] ?? i}: ${v}`}
          />
          {labels && <span className="text-[10px] text-ink-faint">{labels[i]}</span>}
        </div>
      ))}
    </div>
  );
}

export function Donut({ pct, size = 110, label, sub, color = "#0e8262" }: { pct: number; size?: number; label?: string; sub?: string; color?: string }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e9e4" strokeWidth="10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, pct)) / 100} style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      <div className="absolute text-center">
        <p className="font-display font-extrabold text-xl tabular-nums text-ink">{label ?? `${Math.round(pct)}%`}</p>
        {sub && <p className="micro text-ink-faint mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function Meter({ value, max, tone = "green" }: { value: number; max: number; tone?: Tone }) {
  const pct = Math.min(100, (value / (max || 1)) * 100);
  const bar: Record<Tone, string> = { green: "bg-brand-500", amber: "bg-warn-600", red: "bg-danger-600", steel: "bg-steel-600", gray: "bg-ink-faint", pine: "bg-pine-700" };
  return (
    <div className="h-1.5 w-full rounded-full bg-line-soft overflow-hidden">
      <div className={`h-full rounded-full ${bar[tone]} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ---------- form primitives ---------- */

export const inputCls =
  "w-full bg-white border border-line rounded-lg px-3 py-2 text-[16px] sm:text-sm text-ink placeholder:text-ink-faint/70 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="micro text-ink-soft block mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-ink-faint mt-1">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}
export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} resize-none ${props.className ?? ""}`} />;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "dark" | "outline" | "ghost" | "danger" | "warn"; size?: "sm" | "md"; icon?: string };

export function Btn({ variant = "primary", size = "md", icon, children, className = "", ...rest }: BtnProps) {
  const v: Record<string, string> = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-[0_2px_6px_rgba(14,130,98,0.3)]",
    dark: "bg-pine-900 hover:bg-pine-800 text-brand-100",
    outline: "bg-white border border-line hover:border-brand-500 hover:text-brand-700 text-ink",
    ghost: "hover:bg-brand-50 text-ink-soft hover:text-brand-700",
    danger: "bg-danger-600 hover:bg-danger-700 text-white shadow-[0_2px_6px_rgba(190,75,50,0.3)]",
    warn: "bg-warn-100 hover:bg-warn-600 hover:text-white text-warn-700 border border-warn-600/25",
  };
  const s = size === "sm" ? "px-2.5 py-1.5 text-xs gap-1.5" : "px-3.5 py-2 text-sm gap-2";
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none ${v[variant]} ${s} ${className}`}
    >
      {icon && <I name={icon} className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />}
      {children}
    </button>
  );
}

/* ---------- overlays ---------- */

export function Modal({ open, onClose, title, sub, children, footer, wide }: {
  open: boolean; onClose: () => void; title: ReactNode; sub?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-pine-950/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`pop-in relative bg-card rounded-xl border border-line shadow-2xl w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[88vh] flex flex-col`}>
        <header className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-line-soft">
          <div>
            <h3 className="font-display font-extrabold text-lg text-ink leading-tight">{title}</h3>
            {sub && <p className="text-xs text-ink-faint mt-0.5">{sub}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-ink-faint hover:text-danger-600 hover:bg-danger-50 transition-colors" aria-label="Close">
            <I name="x" className="w-4 h-4" />
          </button>
        </header>
        <div className="px-5 py-4 overflow-y-auto scroll-slim">{children}</div>
        {footer && <footer className="px-5 py-3.5 border-t border-line-soft flex justify-end gap-2 bg-paper/60 rounded-b-xl">{footer}</footer>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, children, width = 440 }: { open: boolean; onClose: () => void; children: ReactNode; width?: number }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-pine-950/45" onClick={onClose} />
      <div className="drawer-in absolute right-0 top-0 bottom-0 bg-paper border-l border-line shadow-2xl overflow-y-auto scroll-slim" style={{ width: `min(${width}px, 96vw)` }}>
        {children}
      </div>
    </div>
  );
}

/* ---------- misc ---------- */

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 bg-line-soft/70 rounded-lg p-1 w-fit max-w-full">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
            active === t.id ? "bg-card text-brand-700 shadow-sm border border-line" : "text-ink-soft hover:text-ink"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={`text-[10px] font-mono px-1.5 py-px rounded ${active === t.id ? "bg-brand-100 text-brand-700" : "bg-line text-ink-soft"}`}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, color, size = 36, className = "" }: { name: string; color: string; size?: number; className?: string }) {
  return (
    <span
      className={`inline-grid place-items-center rounded-full font-display font-bold text-white shrink-0 ring-2 ring-white/70 ${className}`}
      style={{ width: size, height: size, background: color, fontSize: size * 0.34 }}
    >
      {initialsOf(name)}
    </span>
  );
}

export function EmptyState({ icon = "search", title, desc }: { icon?: string; title: string; desc?: string }) {
  return (
    <div className="py-10 grid place-items-center text-center">
      <span className="w-12 h-12 rounded-xl bg-line-soft text-ink-faint grid place-items-center mb-3">
        <I name={icon} className="w-5 h-5" />
      </span>
      <p className="font-display font-bold text-ink text-sm">{title}</p>
      {desc && <p className="text-xs text-ink-faint mt-1 max-w-[260px]">{desc}</p>}
    </div>
  );
}

export function ECG({ className = "", color = "#3ED598" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 600 60" className={className} preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 30 H90 l10-8 10 8 h40 l8-18 10 34 8-16 h60 l10-8 10 8 h50 l8-22 12 40 8-18 h60 l10-8 10 8 h40 l8-18 10 34 8-16 h60 l10-8 10 8 h46"
        fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ecg-run" opacity="0.9"
      />
      <path d="M0 30 H600" stroke={color} strokeWidth="1" opacity="0.12" />
    </svg>
  );
}

export function KeyVal({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-line-soft last:border-0">
      <span className="micro text-ink-faint">{k}</span>
      <span className="text-[13px] font-medium text-ink text-right">{v}</span>
    </div>
  );
}

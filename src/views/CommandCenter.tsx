import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useApp } from "../lib/store";
import {
  OPD_7D, OPD_7D_LABELS, REVENUE_14D, REVENUE_BY_DEPT, billTotals,
  fmtMoney0, fullName, minutesWaiting, timeAgo,
} from "../lib/data";
import { Bars, Donut, Sparkline } from "../components/ui";
import { I } from "../components/icons";

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

function Panel({ title, icon, children, className = "", action }: {
  title: string; icon: string; children: ReactNode; className?: string; action?: ReactNode;
}) {
  return (
    <section className={`bg-white/[0.045] border border-white/10 rounded-xl overflow-hidden ${className}`}>
      <header className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-white/8">
        <I name={icon} className="w-3.5 h-3.5 text-brand-400" />
        <h3 className="micro text-pine-100/70">{title}</h3>
        {action && <div className="ml-auto">{action}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function CommandCenter() {
  const { s, go } = useApp();
  const now = useNow();

  const today = s.appointments.filter((a) => a.dayOffset === 0);
  const queue = today.filter((a) => a.status === "checked-in").sort((a, b) => (a.checkInAt ?? "").localeCompare(b.checkInAt ?? ""));
  const inConsult = today.filter((a) => a.status === "in-consultation");
  const done = today.filter((a) => a.status === "completed").length;

  const occupied = s.beds.filter((b) => b.status === "occupied").length;
  const cleaning = s.beds.filter((b) => b.status === "cleaning").length;
  const occPct = (occupied / s.beds.length) * 100;

  const todayISO = new Date().toISOString().slice(0, 10);
  const collectedToday = s.bills.reduce((x, b) => x + b.payments.filter((p) => p.at.slice(0, 10) === todayISO).reduce((y, p) => y + p.amount, 0), 0);
  const outstanding = s.bills.reduce((x, b) => x + billTotals(b).balance, 0);

  const statLabs = s.labOrders.filter((o) => o.urgent && !["verified"].includes(o.status));
  const lowStock = s.medicines.filter((m) => m.stock <= m.reorder);
  const pendingAdmits = s.admissions.filter((a) => a.status === "pending");

  const nowServing = useMemo(() => {
    const a = inConsult[0];
    if (!a) return null;
    return { patient: s.patients.find((p) => p.id === a.patientId), doctor: s.doctors.find((d) => d.id === a.doctorId), token: a.token };
  }, [inConsult, s.patients, s.doctors]);

  const alerts = useMemo(() => [
    ...lowStock.map((m) => ({ id: `ls-${m.id}`, kind: "warn" as const, text: `${m.name} at ${m.stock} u (reorder ${m.reorder})`, at: "now" })),
    ...pendingAdmits.map((a) => {
      const p = s.patients.find((x) => x.id === a.patientId);
      return { id: `ad-${a.id}`, kind: "danger" as const, text: `${p ? fullName(p) : "Patient"} awaiting bed — ${a.reason}`, at: "now" };
    }),
    ...statLabs.map((o) => ({ id: `lab-${o.id}`, kind: "warn" as const, text: `STAT ${o.tests.length} test(s) in pipeline — ${o.code}`, at: "now" })),
  ], [lowStock, pendingAdmits, statLabs]);

  const kpis = [
    { k: "Today's OPD", v: String(today.length), sub: `${done} completed · ${queue.length} waiting`, icon: "users" },
    { k: "Queue wait (max)", v: queue.length ? `${Math.max(...queue.map((a) => minutesWaiting(a.checkInAt)))}m` : "—", sub: `${inConsult.length} in consultation`, icon: "clock" },
    { k: "Bed occupancy", v: `${occupied}/${s.beds.length}`, sub: `${cleaning} cleaning · ${s.beds.filter((b) => b.status === "maintenance").length} maintenance`, icon: "bed" },
    { k: "Collections today", v: fmtMoney0(collectedToday), sub: `outstanding ${fmtMoney0(outstanding)}`, icon: "wallet" },
  ];

  return (
    <div className="-mx-3 sm:-mx-4 lg:-mx-6 -my-4 sm:-my-5 min-h-[calc(100vh-4rem)] bg-pine-950 text-white relative overflow-hidden">
      {/* ambient layers */}
      <div className="absolute inset-0 pine-tex pointer-events-none" />
      <div className="absolute inset-0 plus-grid opacity-[0.35] pointer-events-none" />
      <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(62,213,152,0.10), transparent 65%)" }} />

      <div className="relative max-w-[1240px] mx-auto px-3 sm:px-5 lg:px-8 py-5 space-y-4">
        {/* header */}
        <div className="fade-up flex flex-wrap items-center gap-x-5 gap-y-3">
          <div>
            <p className="micro text-brand-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 pulse-live" />
              Command center · live operations
            </p>
            <h1 className="font-display font-extrabold text-[24px] sm:text-[28px] tracking-tight leading-tight mt-1">{s.hospitalName}</h1>
          </div>

          <div className="ml-auto flex items-center gap-4">
            {/* radar */}
            <div className="relative w-14 h-14 rounded-full border border-brand-400/30 overflow-hidden hidden sm:block shrink-0" aria-hidden="true">
              <div className="absolute inset-2 rounded-full border border-brand-400/20" />
              <div className="absolute inset-4 rounded-full border border-brand-400/15" />
              <div className="sweep absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 0deg, rgba(62,213,152,0.5), transparent 70deg)" }} />
              <span className="absolute top-1/2 left-1/2 w-1 h-1 -ml-0.5 -mt-0.5 rounded-full bg-brand-400" />
            </div>
            <div className="text-right leading-none">
              <p className="font-mono font-bold text-[26px] sm:text-[32px] tabular-nums text-brand-200">
                {now.toLocaleTimeString("en-US", { hour12: false })}
              </p>
              <p className="micro text-pine-100/50 mt-1.5">
                {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
          {kpis.map((k, i) => (
            <div key={k.k} className="fade-up bg-white/[0.045] border border-white/10 rounded-xl px-4 py-3.5 hover:border-brand-400/40 transition-colors" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center justify-between">
                <p className="micro text-pine-100/55">{k.k}</p>
                <I name={k.icon} className="w-4 h-4 text-brand-400/70" />
              </div>
              <p className="font-display font-extrabold text-[24px] sm:text-[26px] tabular-nums mt-1 text-white">{k.v}</p>
              <p className="text-[11px] text-pine-100/55 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* now serving + queue */}
        <div className="grid lg:grid-cols-3 gap-2.5 sm:gap-3">
          <section className="fade-up relative overflow-hidden rounded-xl bg-gradient-to-br from-pine-800 to-pine-900 border border-brand-400/25 px-5 py-4" style={{ animationDelay: "120ms" }}>
            <p className="micro text-brand-400">Now serving</p>
            {nowServing ? (
              <div className="flex items-center gap-4 mt-2">
                <span className="token-notch shrink-0 bg-brand-400 text-pine-950 font-mono font-extrabold text-[22px] px-4 py-2 rounded-lg">
                  Q-{String(nowServing.token ?? 0).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="font-display font-extrabold text-[19px] leading-tight truncate">{nowServing.patient ? fullName(nowServing.patient) : "—"}</p>
                  <p className="text-[12px] text-pine-100/70 mt-0.5 truncate">with {nowServing.doctor?.name} · {nowServing.doctor?.specialization}</p>
                </div>
              </div>
            ) : (
              <p className="font-display font-bold text-[17px] text-pine-100/60 mt-2">No active consultation</p>
            )}
            <svg viewBox="0 0 600 40" className="absolute bottom-0 left-0 w-full h-8 opacity-25" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 20 H120 l8-6 8 6 h60 l6-14 8 26 6-12 h80 l8-6 8 6 h70 l6-14 8 26 6-12 h80 l8-6 8 6 h114" fill="none" stroke="#3ED598" strokeWidth="1.6" className="ecg-run" />
            </svg>
          </section>

          <Panel title="Waiting queue" icon="queue" className="lg:col-span-2 fade-up" action={
            <button onClick={() => go("opd")} className="micro text-brand-400 hover:text-brand-200 transition-colors flex items-center gap-1">OPD desk <I name="arrow-r" className="w-3 h-3" /></button>
          }>
            {queue.length === 0 ? (
              <p className="text-[12.5px] text-pine-100/55 py-3">Queue clear — no patients waiting.</p>
            ) : (
              <ul className="space-y-1.5">
                {queue.slice(0, 5).map((a) => {
                  const p = s.patients.find((x) => x.id === a.patientId);
                  const w = minutesWaiting(a.checkInAt);
                  return (
                    <li key={a.id} className="flex items-center gap-3 bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2">
                      <span className="font-mono font-bold text-[13px] text-brand-200 w-10">Q-{String(a.token ?? 0).padStart(2, "0")}</span>
                      <span className="text-[13px] font-medium truncate">{p ? fullName(p) : "—"}</span>
                      <span className="text-[11px] text-pine-100/50 hidden sm:inline truncate">{s.doctors.find((d) => d.id === a.doctorId)?.specialization}</span>
                      <span className={`ml-auto font-mono text-[11.5px] font-semibold tabular-nums ${w >= 25 ? "text-warn-100 bg-warn-600/40 px-2 py-0.5 rounded" : "text-brand-200"}`}>{w}m</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        {/* charts row */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
          <Panel title="Collections · 14 days" icon="chart" className="fade-up" action={<span className="font-mono text-[12px] font-bold text-brand-200">{fmtMoney0(REVENUE_14D.reduce((a, b) => a + b, 0))}</span>}>
            <Sparkline data={REVENUE_14D} h={92} stroke="#3ED598" />
            <p className="text-[11px] text-pine-100/50 mt-2">Daily trend across all revenue centres.</p>
          </Panel>

          <Panel title="OPD volume · 7 days" icon="users" className="fade-up">
            <Bars data={OPD_7D} labels={OPD_7D_LABELS} h={92} color="#3ED598" />
          </Panel>

          <Panel title="Bed census" icon="bed" className="fade-up md:col-span-2 xl:col-span-1">
            <div className="flex items-center gap-4">
              <Donut pct={occPct} size={104} color="#3ED598" sub="occupied" />
              <div className="flex-1 space-y-2 min-w-0">
                {s.wards.map((w) => {
                  const wb = s.beds.filter((b) => b.wardId === w.id);
                  const occ = wb.filter((b) => b.status === "occupied").length;
                  return (
                    <div key={w.id} className="flex items-center gap-2">
                      <span className="text-[11px] text-pine-100/65 w-[72px] truncate">{w.name}</span>
                      <div className="flex gap-[3px] flex-wrap">
                        {wb.map((b) => (
                          <span key={b.id} title={`${b.label} · ${b.status}`}
                            className={`w-2.5 h-2.5 rounded-[3px] ${b.status === "occupied" ? "bg-brand-400" : b.status === "available" ? "bg-white/15" : b.status === "cleaning" ? "bg-warn-600" : "bg-danger-600"}`} />
                        ))}
                      </div>
                      <span className="ml-auto font-mono text-[10.5px] text-pine-100/55">{occ}/{wb.length}</span>
                    </div>
                  );
                })}
                <button onClick={() => go("wards")} className="micro text-brand-400 hover:text-brand-200 transition-colors flex items-center gap-1 pt-0.5">Ward map <I name="arrow-r" className="w-3 h-3" /></button>
              </div>
            </div>
          </Panel>
        </div>

        {/* bottom row */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
          <Panel title="Alert feed" icon="alert" className="fade-up xl:row-span-2" action={<span className={`micro ${alerts.length ? "text-warn-100 blink-soft" : "text-pine-100/40"}`}>{alerts.length} active</span>}>
            {alerts.length === 0 ? (
              <p className="text-[12.5px] text-pine-100/55 py-3">All systems nominal.</p>
            ) : (
              <ul className="space-y-1.5">
                {alerts.map((a) => (
                  <li key={a.id} className="flex items-start gap-2.5 bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2.5">
                    <span className={`mt-0.5 w-5 h-5 rounded grid place-items-center shrink-0 ${a.kind === "danger" ? "bg-danger-600/30 text-danger-100" : "bg-warn-600/30 text-warn-100"}`}>
                      <I name={a.kind === "danger" ? "bed" : "flask"} className="w-3 h-3" />
                    </span>
                    <p className="text-[12px] leading-snug text-pine-100/85">{a.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Department revenue · month" icon="building" className="fade-up">
            <ul className="space-y-2">
              {REVENUE_BY_DEPT.slice(0, 5).map((d) => (
                <li key={d.dept} className="flex items-center gap-2.5">
                  <span className="text-[11.5px] text-pine-100/70 w-[104px] truncate">{d.dept}</span>
                  <div className="flex-1 h-[7px] rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-1000" style={{ width: `${(d.value / REVENUE_BY_DEPT[0].value) * 100}%` }} />
                  </div>
                  <span className="font-mono text-[10.5px] text-pine-100/60 w-[52px] text-right">{fmtMoney0(d.value)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Recent activity" icon="shield" className="fade-up">
            <ul className="space-y-2">
              {s.audit.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-start gap-2.5">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400/70 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] text-pine-100/85 leading-snug truncate"><span className="font-semibold text-white">{e.action}</span> · {e.entity}</p>
                    <p className="micro text-pine-100/40 mt-0.5">{e.user} · {timeAgo(e.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <p className="micro text-pine-100/35 text-center pb-1">
          Command center refreshes every second · figures derived from live module data · {s.branchId === "main" ? "Main Campus" : "Northside Clinic"}
        </p>
      </div>
    </div>
  );
}

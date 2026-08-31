import { useMemo } from "react";
import { useApp } from "../lib/store";
import {
  REVENUE_14D, OPD_7D, OPD_7D_LABELS, billTotals, deptName, fmtMoney0, fullName, minutesWaiting, timeAgo, dayLabel,
} from "../lib/data";
import { Bars, Card, Donut, Pill, Sparkline, Stat, ECG, Avatar, Btn, APPT_META } from "../components/ui";
import { I } from "../components/icons";

export function Dashboard() {
  const { s, go } = useApp();
  const role = s.session?.role ?? "admin";
  const today = s.appointments.filter((a) => a.dayOffset === 0);
  const waiting = today.filter((a) => a.status === "checked-in");
  const inConsult = today.filter((a) => a.status === "in-consultation");
  const completed = today.filter((a) => a.status === "completed");
  const occupied = s.beds.filter((b) => b.status === "occupied").length;
  const occPct = (occupied / s.beds.length) * 100;
  const lowStock = s.medicines.filter((m) => m.stock <= m.reorder);
  const pendingRx = s.prescriptions.filter((r) => r.status === "sent");
  const outstanding = s.bills.filter((b) => b.status !== "paid").reduce((sum, b) => sum + billTotals(b).balance, 0);
  const paidToday = s.bills.reduce((sum, b) => sum + b.payments.filter((p) => p.at.slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((x, p) => x + p.amount, 0), 0);
  const pendingClaims = s.bills.filter((b) => b.claimStatus === "pending").length;
  const labPending = s.labOrders.filter((o) => ["ordered", "collected", "processing"].includes(o.status)).length;
  const labVerify = s.labOrders.filter((o) => o.status === "completed").length;
  const imagingPending = s.imagingOrders.filter((o) => ["ordered", "scheduled", "completed"].includes(o.status)).length;
  const expiringSoon = s.medicines.filter((m) => (new Date(m.expiry).getTime() - Date.now()) / 86400000 < 60);

  const deptCounts = useMemo(() => {
    const map = new Map<string, number>();
    today.forEach((a) => {
      const d = s.doctors.find((x) => x.id === a.doctorId);
      if (d) map.set(d.departmentId, (map.get(d.departmentId) ?? 0) + 1);
    });
    return [...map.entries()].map(([id, n]) => ({ name: deptName(id), n })).sort((a, b) => b.n - a.n);
  }, [today, s.doctors]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }, []);

  const meta = { super: "System", admin: "Operations", reception: "Front desk", doctor: "Clinical", nurse: "Ward", pharmacist: "Dispensary", lab: "Laboratory", radiology: "Imaging", billing: "Revenue", patient: "Portal" }[role];

  const patientOf = (id: string) => s.patients.find((p) => p.id === id);

  return (
    <div className="space-y-4">
      {/* header strip */}
      <div className="fade-up relative overflow-hidden bg-pine-900 pine-tex rounded-xl border border-pine-800 px-5 py-4 text-white flex flex-wrap items-center gap-4">
        <div className="min-w-0">
          <p className="micro text-brand-400">{dayLabel(0)} · {meta} view</p>
          <h1 className="font-display font-extrabold text-[22px] leading-tight tracking-tight mt-1">
            {greeting}, {s.session?.userId.split(" ")[0]} — here's the pulse of the floor.
          </h1>
          <p className="text-[12.5px] text-pine-100/70 mt-1">
            {today.length} appointments · {waiting.length + inConsult.length} in queue · {occupied} beds occupied · {pendingRx.length} Rx pending
          </p>
        </div>
        <div className="ml-auto hidden md:block w-[300px] opacity-80">
          <ECG className="w-full h-12" />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {(role === "doctor" || role === "nurse" || role === "super" || role === "admin" || role === "reception") && (
          <Stat label="Patients today" value={today.length} sub={`${completed.length} completed`} icon="users" tone="green" delay={0} />
        )}
        {(role === "doctor" || role === "nurse" || role === "super" || role === "admin" || role === "reception") && (
          <Stat label="In queue now" value={waiting.length + inConsult.length} sub={`${waiting.length} waiting · ${inConsult.length} in consult`} icon="queue" tone="amber" delay={60} />
        )}
        {(role === "doctor" || role === "super" || role === "admin" || role === "nurse") && (
          <Stat label="Bed occupancy" value={`${Math.round(occPct)}%`} sub={`${occupied}/${s.beds.length} beds`} icon="bed" tone="steel" delay={120} />
        )}
        {(role === "super" || role === "admin" || role === "billing" || role === "reception") && (
          <Stat label="Collected today" value={fmtMoney0(paidToday)} sub={`${s.bills.filter((b) => b.status !== "paid").length} open invoices`} icon="wallet" tone="green" delay={180} />
        )}
        {role === "pharmacist" && (
          <>
            <Stat label="Pending Rx" value={pendingRx.length} sub="awaiting dispensing" icon="pill" tone="amber" delay={0} />
            <Stat label="Low stock items" value={lowStock.length} sub="below reorder level" icon="alert" tone="red" delay={60} />
            <Stat label="Expiring < 60d" value={expiringSoon.length} sub="batches to rotate" icon="clock" tone="steel" delay={120} />
            <Stat label="Catalog items" value={s.medicines.length} sub="active formulary" icon="box" tone="green" delay={180} />
          </>
        )}
        {role === "lab" && (
          <>
            <Stat label="Orders in pipeline" value={labPending} sub="ordered → processing" icon="flask" tone="steel" delay={0} />
            <Stat label="Awaiting verification" value={labVerify} sub="results entered" icon="check" tone="amber" delay={60} />
            <Stat label="Urgent orders" value={s.labOrders.filter((o) => o.urgent && o.status !== "verified").length} sub="priority handling" icon="alert" tone="red" delay={120} />
            <Stat label="Verified today" value={s.labOrders.filter((o) => o.status === "verified").length} sub="reports released" icon="shield" tone="green" delay={180} />
          </>
        )}
        {role === "radiology" && (
          <>
            <Stat label="Imaging queue" value={imagingPending} sub="to scan or report" icon="scan" tone="steel" delay={0} />
            <Stat label="Reported" value={s.imagingOrders.filter((o) => o.status === "reported").length} sub="findings released" icon="check" tone="green" delay={60} />
            <Stat label="MRI slots today" value={s.imagingOrders.filter((o) => o.modality === "MRI" && o.dayOffset === 0).length} sub="scheduled" icon="clock" tone="amber" delay={120} />
            <Stat label="Lab pipeline" value={labPending} sub="cross-department" icon="flask" tone="pine" delay={180} />
          </>
        )}
        {role === "billing" && (
          <>
            <Stat label="Collected today" value={fmtMoney0(paidToday)} sub="all methods" icon="wallet" tone="green" delay={0} />
            <Stat label="Outstanding" value={fmtMoney0(outstanding)} sub="across open invoices" icon="receipt" tone="red" delay={60} />
            <Stat label="Claims pending" value={pendingClaims} sub="with payers" icon="shield" tone="amber" delay={120} />
            <Stat label="Avg invoice" value={fmtMoney0(s.bills.reduce((x, b) => x + billTotals(b).total, 0) / Math.max(1, s.bills.length))} sub={`${s.bills.length} invoices`} icon="chart" tone="steel" delay={180} />
          </>
        )}
      </div>

      {/* main grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* live queue */}
        <Card
          title="Live OPD queue"
          sub="tokens in waiting order"
          action={<Btn variant="ghost" size="sm" icon="arrow-r" onClick={() => go("opd")}>Open OPD</Btn>}
          className="lg:col-span-1"
        >
          {waiting.length + inConsult.length === 0 ? (
            <p className="text-xs text-ink-faint py-6 text-center">Queue is clear — no patients waiting.</p>
          ) : (
            <ul className="space-y-2">
              {[...inConsult, ...waiting].sort((a, b) => (a.token ?? 0) - (b.token ?? 0)).slice(0, 5).map((a) => {
                const p = patientOf(a.patientId);
                const d = s.doctors.find((x) => x.id === a.doctorId);
                const mins = minutesWaiting(a.checkInAt);
                return (
                  <li key={a.id} className="flex items-center gap-2.5 bg-white border border-line-soft rounded-lg px-2.5 py-2 hover:border-brand-400/50 transition-colors">
                    <span className="token-notch bg-pine-900 text-brand-200 font-mono text-[11px] font-semibold px-2 py-1 rounded">Q-{a.token}</span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink truncate">{p ? fullName(p) : "—"}</p>
                      <p className="text-[11px] text-ink-faint truncate">{d?.name} · {a.time}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <Pill tone={a.status === "in-consultation" ? "pine" : mins > 45 ? "red" : "amber"}>{a.status === "in-consultation" ? "In consult" : `${mins}m wait`}</Pill>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* revenue / clinical chart */}
        <Card title={role === "pharmacist" || role === "lab" || role === "radiology" ? "OPD volume · 7 days" : "Revenue · last 14 days"} sub={role === "pharmacist" || role === "lab" || role === "radiology" ? "outpatient visits across departments" : "daily collections, all branches"} className="lg:col-span-2">
          {role === "pharmacist" || role === "lab" || role === "radiology" ? (
            <Bars data={OPD_7D} labels={OPD_7D_LABELS} h={130} />
          ) : (
            <>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="font-display font-extrabold text-2xl tabular-nums">{fmtMoney0(REVENUE_14D.reduce((a, b) => a + b, 0))}</p>
                  <p className="text-[11px] text-ink-faint">total over the window · <span className="text-brand-700 font-semibold">▲ 12.4%</span> vs prior</p>
                </div>
                <Pill tone="green">trending up</Pill>
              </div>
              <Sparkline data={REVENUE_14D} h={96} />
              <div className="flex justify-between micro text-ink-faint mt-1">
                <span>14 days ago</span><span>today</span>
              </div>
            </>
          )}
        </Card>

        {/* bed occupancy */}
        <Card title="Bed census" sub="hospital-wide right now" action={<Btn variant="ghost" size="sm" icon="arrow-r" onClick={() => go("wards")}>Ward map</Btn>}>
          <div className="flex items-center gap-5">
            <Donut pct={occPct} sub="occupied" />
            <ul className="flex-1 space-y-1.5">
              {(["occupied", "available", "cleaning", "maintenance"] as const).map((st) => {
                const n = s.beds.filter((b) => b.status === st).length;
                const dotCls: Record<string, string> = { occupied: "bg-pine-700", available: "bg-brand-500", cleaning: "bg-warn-600", maintenance: "bg-danger-600" };
                return (
                  <li key={st} className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-2 text-ink-soft capitalize"><span className={`w-2 h-2 rounded-full ${dotCls[st]}`} /> {st}</span>
                    <span className="font-mono font-semibold text-ink">{n}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          {s.admissions.filter((a) => a.status === "pending").length > 0 && (
            <div className="mt-3 flex items-center gap-2 bg-warn-50 border border-warn-600/20 rounded-lg px-3 py-2">
              <I name="alert" className="w-4 h-4 text-warn-600 shrink-0" />
              <p className="text-[11.5px] text-warn-700 font-medium">
                {s.admissions.filter((a) => a.status === "pending").length} admission(s) awaiting bed assignment.
              </p>
            </div>
          )}
        </Card>

        {/* department census */}
        <Card title="Appointments by department" sub={dayLabel(0).toLowerCase()}>
          <div className="space-y-2.5">
            {deptCounts.map((d) => (
              <div key={d.name}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="font-medium text-ink">{d.name}</span>
                  <span className="font-mono text-ink-faint">{d.n}</span>
                </div>
                <div className="h-2 rounded-full bg-line-soft overflow-hidden">
                  <div className="h-full rounded-full bg-brand-500/80 transition-all duration-700" style={{ width: `${(d.n / Math.max(1, deptCounts[0]?.n ?? 1)) * 100}%` }} />
                </div>
              </div>
            ))}
            {deptCounts.length === 0 && <p className="text-xs text-ink-faint text-center py-6">No appointments scheduled today.</p>}
          </div>
        </Card>

        {/* alerts & attention */}
        <Card title="Needs attention" sub="alerts routed to your role" className="lg:col-span-1">
          <ul className="space-y-2">
            {role !== "patient" && lowStock.slice(0, 3).map((m) => (
              <li key={m.id} className="flex items-center gap-2.5 bg-danger-50 border border-danger-600/15 rounded-lg px-3 py-2">
                <I name="pill" className="w-4 h-4 text-danger-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-ink truncate">{m.name}</p>
                  <p className="text-[11px] text-danger-700">{m.stock} left · reorder at {m.reorder}</p>
                </div>
                {(role === "pharmacist" || role === "admin" || role === "super") && (
                  <Btn variant="outline" size="sm" className="ml-auto" onClick={() => go("pharmacy")}>Fix</Btn>
                )}
              </li>
            ))}
            {pendingClaims > 0 && (role === "billing" || role === "admin" || role === "super") && (
              <li className="flex items-center gap-2.5 bg-warn-50 border border-warn-600/15 rounded-lg px-3 py-2">
                <I name="shield" className="w-4 h-4 text-warn-600 shrink-0" />
                <p className="text-[12px] text-warn-700 font-medium">{pendingClaims} insurance claim(s) pending adjudication.</p>
              </li>
            )}
            {labVerify > 0 && (role === "doctor" || role === "admin" || role === "super") && (
              <li className="flex items-center gap-2.5 bg-steel-50 border border-steel-600/15 rounded-lg px-3 py-2">
                <I name="flask" className="w-4 h-4 text-steel-600 shrink-0" />
                <p className="text-[12px] text-steel-700 font-medium">{labVerify} lab report(s) awaiting your verification.</p>
              </li>
            )}
            {pendingRx.length > 0 && role === "pharmacist" && (
              <li className="flex items-center gap-2.5 bg-steel-50 border border-steel-600/15 rounded-lg px-3 py-2">
                <I name="pill" className="w-4 h-4 text-steel-600 shrink-0" />
                <p className="text-[12px] text-steel-700 font-medium">{pendingRx.length} prescription(s) waiting at the counter.</p>
              </li>
            )}
            {outstanding > 0 && role === "billing" && (
              <li className="flex items-center gap-2.5 bg-danger-50 border border-danger-600/15 rounded-lg px-3 py-2">
                <I name="receipt" className="w-4 h-4 text-danger-600 shrink-0" />
                <p className="text-[12px] text-danger-700 font-medium">{fmtMoney0(outstanding)} uncollected across open bills.</p>
              </li>
            )}
            {s.admissions.filter((a) => a.status === "pending").map((a) => {
              const p = patientOf(a.patientId);
              return (
                <li key={a.id} className="flex items-center gap-2.5 bg-warn-50 border border-warn-600/15 rounded-lg px-3 py-2">
                  <I name="bed" className="w-4 h-4 text-warn-600 shrink-0" />
                  <p className="text-[12px] text-warn-700 font-medium">{p ? fullName(p) : "Patient"} awaiting bed — {a.reason}.</p>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* activity */}
        <Card title="Recent activity" sub="latest audited events" className="lg:col-span-1">
          <ul className="space-y-0.5">
            {s.audit.slice(0, 6).map((e) => (
              <li key={e.id} className="flex gap-2.5 py-2 border-b border-line-soft last:border-0">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12.5px] text-ink leading-snug"><span className="font-semibold">{e.user}</span> · {e.action}</p>
                  <p className="text-[11px] text-ink-faint truncate">{e.entity} · {timeAgo(e.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

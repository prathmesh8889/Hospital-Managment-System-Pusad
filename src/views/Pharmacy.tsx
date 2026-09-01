import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { fmtMoney, fullName, timeAgo } from "../lib/data";
import { Avatar, Btn, Card, EmptyState, Meter, Pill, Tabs } from "../components/ui";
import { I } from "../components/icons";

export function Pharmacy() {
  const { s, dispense, restock } = useApp();
  const [tab, setTab] = useState("queue");

  const pending = s.prescriptions.filter((r) => r.status === "sent");
  const low = s.medicines.filter((m) => m.stock <= m.reorder);
  const expiring = useMemo(
    () => s.medicines
      .map((m) => ({ m, days: Math.floor((new Date(m.expiry + "T00:00:00").getTime() - Date.now()) / 86400000) }))
      .filter((x) => x.days < 90)
      .sort((a, b) => a.days - b.days),
    [s.medicines]
  );
  const dispensedToday = s.prescriptions.filter((r) => r.status === "dispensed");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="micro text-brand-700">Dispensary</p>
          <h1 className="font-display font-extrabold text-[22px] tracking-tight text-ink">Pharmacy</h1>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[12px] text-ink-soft">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warn-600" /> {pending.length} pending</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger-600" /> {low.length} low stock</span>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "queue", label: "Dispense queue", count: pending.length },
          { id: "stock", label: "Drug stock", count: s.medicines.length },
          { id: "expiry", label: "Expiry watch", count: expiring.length },
        ]}
        active={tab} onChange={setTab}
      />

      {tab === "queue" && (
        <div className="grid md:grid-cols-2 gap-4">
          {pending.length === 0 && (
            <div className="md:col-span-2 w-full">
              <Card><EmptyState icon="pill" title="Dispense queue is empty" desc="Prescriptions signed by doctors land here in real time." /></Card>
            </div>
          )}
          {pending.map((rx, idx) => {
            const patient = s.patients.find((p) => p.id === rx.patientId);
            const doctor = s.doctors.find((d) => d.id === rx.doctorId);
            let short = false;
            return (
              <Card key={rx.id} className="fade-up" pad={false}
                title={<span className="flex items-center gap-2">{rx.code}<Pill tone="amber">awaiting dispense</Pill></span>}
                sub={`${doctor?.name ?? ""} · ${timeAgo(rx.createdAt)}`}
                action={<Btn size="sm" icon="check" onClick={() => dispense(rx.id)} style={{ animationDelay: `${idx * 40}ms` }}>Dispense</Btn>}>
                <div className="p-4 pt-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 bg-paper rounded-lg px-3 py-2">
                    {patient && <Avatar name={fullName(patient)} color={patient.color} size={28} />}
                    <p className="text-[13px] font-semibold text-ink">{patient ? fullName(patient) : "—"}</p>
                    <span className="font-mono text-[10.5px] text-ink-faint">{patient?.code}</span>
                    {patient && patient.allergies.length > 0 && <Pill tone="red" className="sm:ml-auto">⚠ {patient.allergies.join(", ")}</Pill>}
                  </div>
                  <div className="overflow-x-auto scroll-slim">
                  <table className="w-full text-[12px] min-w-[380px]">
                    <thead>
                      <tr className="micro text-ink-faint text-left">
                        <th className="pb-1.5 font-medium">Medicine</th>
                        <th className="pb-1.5 font-medium">Sig</th>
                        <th className="pb-1.5 font-medium text-right">Qty</th>
                        <th className="pb-1.5 font-medium text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rx.items.map((it, i) => {
                        const m = s.medicines.find((x) => x.id === it.medicineId);
                        const ok = (m?.stock ?? 0) >= it.qty;
                        if (!ok) short = true;
                        return (
                          <tr key={i} className="border-t border-line-soft">
                            <td className="py-1.5 font-medium text-ink">{m?.name}</td>
                            <td className="py-1.5 text-ink-soft">{it.dosage} · {it.frequency}</td>
                            <td className="py-1.5 text-right font-mono">{it.qty}</td>
                            <td className={`py-1.5 text-right font-mono font-semibold ${ok ? "text-brand-700" : "text-danger-600"}`}>{m?.stock ?? 0}{!ok && " !"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                  {short && (
                    <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-danger-700 bg-danger-50 border border-danger-600/20 rounded-md px-2.5 py-1.5">
                      <I name="alert" className="w-3.5 h-3.5" /> Short stock on one or more items — restock before dispensing.
                    </p>
                  )}
                  {rx.notes && <p className="text-[11.5px] text-ink-soft italic">“{rx.notes}”</p>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "stock" && (
        <Card pad={false} title="Formulary & stock levels" sub="auto-decrements on dispense">
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="micro text-ink-faint text-left border-b border-line">
                  <th className="px-4 py-2.5 font-medium">Medicine</th>
                  <th className="px-3 py-2.5 font-medium hidden md:table-cell">Category</th>
                  <th className="px-3 py-2.5 font-medium">Price</th>
                  <th className="px-3 py-2.5 font-medium w-[190px]">Stock vs reorder</th>
                  <th className="px-3 py-2.5 font-medium text-right">Receive +50</th>
                </tr>
              </thead>
              <tbody>
                {s.medicines.map((m) => {
                  const isLow = m.stock <= m.reorder;
                  return (
                    <tr key={m.id} className="border-b border-line-soft last:border-0 hover:bg-brand-50/60 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-ink">{m.name}</p>
                        <p className="text-[10.5px] text-ink-faint font-mono">{m.generic} · {m.form}</p>
                      </td>
                      <td className="px-3 py-2.5 text-ink-soft hidden md:table-cell">{m.category}</td>
                      <td className="px-3 py-2.5 font-mono text-ink-soft">{fmtMoney(m.price)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1"><Meter value={m.stock} max={m.reorder * 3} tone={isLow ? "red" : m.stock <= m.reorder * 1.5 ? "amber" : "green"} /></div>
                          <span className={`font-mono text-[11.5px] font-semibold w-14 text-right ${isLow ? "text-danger-600" : "text-ink"}`}>{m.stock} u</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Btn size="sm" variant="outline" icon="plus" onClick={() => restock(m.id, 50)}>Receive</Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "expiry" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Batches expiring < 90 days" sub="rotate or return to supplier" pad={false}>
            <ul>
              {expiring.map(({ m, days }) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-line-soft last:border-0">
                  <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${days < 45 ? "bg-danger-100 text-danger-700" : "bg-warn-100 text-warn-700"}`}>
                    <I name="clock" className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink">{m.name}</p>
                    <p className="text-[11px] text-ink-faint">stock {m.stock} · expires {new Date(m.expiry + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                  <Pill tone={days < 45 ? "red" : "amber"} className="ml-auto">{days}d left</Pill>
                </li>
              ))}
              {expiring.length === 0 && <EmptyState icon="check" title="No near-expiry batches" />}
            </ul>
          </Card>
          <Card title="Dispensing history" sub={`${dispensedToday.length} prescription(s) fulfilled`} pad={false}>
            <ul>
              {s.prescriptions.filter((r) => r.status === "dispensed").map((r) => {
                const p = s.patients.find((x) => x.id === r.patientId);
                return (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-line-soft last:border-0">
                    <I name="check" className="w-4 h-4 text-brand-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink">{r.code} · {p ? fullName(p) : "—"}</p>
                      <p className="text-[11px] text-ink-faint">{r.items.length} item(s) · {timeAgo(r.createdAt)}</p>
                    </div>
                    <Pill tone="green" className="ml-auto">dispensed</Pill>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

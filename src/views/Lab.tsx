import { useEffect, useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { dayLabel, fmtDate, fullName, timeAgo } from "../lib/data";
import type { LabAnalyte, LabOrder } from "../lib/data";
import { Avatar, Btn, Card, EmptyState, Pill, Select, Tabs, TextArea, LAB_META } from "../components/ui";
import { I } from "../components/icons";

const flag = (a: LabAnalyte) => (a.result !== undefined ? (a.result < a.low ? "L" : a.result > a.high ? "H" : null) : null);

function ResultEntry({ order }: { order: LabOrder }) {
  const { s, saveLabResults, verifyLab } = useApp();
  const role = s.session?.role ?? "lab";
  const [vals, setVals] = useState<LabAnalyte[]>(order.analytes.map((a) => ({ ...a })));
  useEffect(() => setVals(order.analytes.map((a) => ({ ...a }))), [order.id]);

  const patient = s.patients.find((p) => p.id === order.patientId);
  const canEnter = role === "lab" || role === "admin" || role === "super";
  const canVerify = role === "doctor" || role === "admin" || role === "super";
  const abnormal = vals.filter((a) => flag(a)).length;

  return (
    <Card
      title={<span className="flex items-center gap-2">{order.code}<Pill tone={LAB_META[order.status].tone}>{LAB_META[order.status].label}</Pill>{order.urgent && <Pill tone="red">STAT</Pill>}</span>}
      sub={`${order.tests.join(" + ")} · ordered ${dayLabel(order.dayOffset)}`}
      pad={false}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2.5 bg-paper rounded-lg px-3 py-2">
          {patient && <Avatar name={fullName(patient)} color={patient.color} size={28} />}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">{patient ? fullName(patient) : "—"}</p>
            <p className="text-[10.5px] text-ink-faint font-mono">{patient?.code} · {s.doctors.find((d) => d.id === order.doctorId)?.name}</p>
          </div>
          {abnormal > 0 && <Pill tone="red" className="ml-auto">{abnormal} abnormal</Pill>}
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          {vals.map((a, i) => {
            const f = flag(a);
            return (
              <div key={i} className={`rounded-lg border px-3 py-2 ${f ? "bg-danger-50 border-danger-600/25" : "bg-white border-line-soft"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-ink">{a.name}</p>
                  <span className="font-mono text-[10px] text-ink-faint">ref {a.low}–{a.high} {a.unit}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number" step="0.1" value={a.result ?? ""} placeholder="enter"
                    disabled={!canEnter}
                    onChange={(e) => setVals((p) => p.map((x, j) => (j === i ? { ...x, result: e.target.value === "" ? undefined : Number(e.target.value) } : x)))}
                    className="w-24 bg-white border border-line rounded-md px-2 py-1 font-mono text-[16px] sm:text-[13px] font-semibold outline-none focus:border-brand-500 disabled:bg-line-soft/50"
                  />
                  {f && <span className={`font-mono text-[11px] font-bold ${f === "H" ? "text-danger-600" : "text-steel-600"}`}>{f === "H" ? "▲ HIGH" : "▼ LOW"}</span>}
                  {!f && a.result !== undefined && <span className="font-mono text-[11px] font-bold text-brand-700">IN RANGE</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-ink-faint">Technician: {order.technician ?? "—"}</p>
          <div className="flex gap-2">
            {canEnter && order.status === "processing" && (
              <Btn size="sm" icon="check" onClick={() => saveLabResults(order.id, vals)}
                disabled={vals.some((a) => a.result === undefined)}>
                Save results
              </Btn>
            )}
            {canVerify && order.status === "completed" && (
              <Btn size="sm" icon="shield" onClick={() => verifyLab(order.id)}>Verify & release</Btn>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function Lab() {
  const { s, advanceLab, setImaging } = useApp();
  const role = s.session?.role ?? "lab";
  const [tab, setTab] = useState(role === "radiology" ? "imaging" : "samples");
  const [imgDrafts, setImgDrafts] = useState<Record<string, string>>({});

  const samples = useMemo(() => [...s.labOrders].sort((a, b) => (a.urgent === b.urgent ? 0 : a.urgent ? -1 : 1)), [s.labOrders]);
  const entryQueue = s.labOrders.filter((o) => ["processing", "completed"].includes(o.status));
  const canMove = role === "lab" || role === "admin" || role === "super";

  const statusFlow: { st: LabOrder["status"]; label: string; n: number }[] = [
    { st: "ordered", label: "Ordered", n: s.labOrders.filter((o) => o.status === "ordered").length },
    { st: "collected", label: "Collected", n: s.labOrders.filter((o) => o.status === "collected").length },
    { st: "processing", label: "Processing", n: s.labOrders.filter((o) => o.status === "processing").length },
    { st: "verified", label: "Verified", n: s.labOrders.filter((o) => o.status === "verified").length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="micro text-brand-700">Diagnostics</p>
          <h1 className="font-display font-extrabold text-[22px] tracking-tight text-ink">Laboratory & Imaging</h1>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {statusFlow.map((x) => (
            <div key={x.st} className="bg-card border border-line rounded-lg px-3 py-1.5 text-center">
              <p className="font-mono font-bold text-[15px] text-ink tabular-nums">{x.n}</p>
              <p className="micro text-ink-faint">{x.label}</p>
            </div>
          ))}
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "samples", label: "Sample pipeline", count: s.labOrders.length },
          { id: "results", label: "Result entry", count: entryQueue.length },
          { id: "imaging", label: "Imaging", count: s.imagingOrders.length },
        ]}
        active={tab} onChange={setTab}
      />

      {tab === "samples" && (
        <Card pad={false} title="Sample tracking" sub="ordered → collected → processing → verified">
          {samples.length === 0 && <EmptyState icon="flask" title="No lab orders" />}
          <ul>
            {samples.map((o, idx) => {
              const p = s.patients.find((x) => x.id === o.patientId);
              const meta = LAB_META[o.status];
              return (
                <li key={o.id} className="fade-up flex items-center gap-3 px-4 py-3 border-b border-line-soft last:border-0 hover:bg-brand-50/60 transition-colors" style={{ animationDelay: `${Math.min(idx, 10) * 35}ms` }}>
                  <span className="w-9 h-9 rounded-lg bg-steel-100 text-steel-700 grid place-items-center shrink-0">
                    <I name="vial" className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink">
                      {o.code} <span className="font-mono text-[10.5px] text-ink-faint ml-1">barcode ·{o.code.slice(-4)}</span>
                      {o.urgent && <Pill tone="red" className="ml-2">STAT</Pill>}
                    </p>
                    <p className="text-[11.5px] text-ink-soft truncate">{p ? fullName(p) : "—"} · {o.tests.join(" + ")} · {dayLabel(o.dayOffset)}</p>
                  </div>
                  <Pill tone={meta.tone}>{meta.label}</Pill>
                  {canMove && o.status === "ordered" && <Btn size="sm" variant="outline" onClick={() => advanceLab(o.id, "collected")}>Collect</Btn>}
                  {canMove && o.status === "collected" && <Btn size="sm" variant="dark" onClick={() => advanceLab(o.id, "processing")}>Process</Btn>}
                  {(o.status === "processing" || o.status === "completed") && (
                    <Btn size="sm" variant="ghost" onClick={() => setTab("results")}>Open →</Btn>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {tab === "results" && (
        <div className="grid xl:grid-cols-2 gap-4">
          {entryQueue.length === 0 && (
            <div className="xl:col-span-2 w-full">
              <Card><EmptyState icon="flask" title="Nothing awaiting results" desc="Move samples to “processing” from the pipeline to enter values here." /></Card>
            </div>
          )}
          {entryQueue.map((o) => <ResultEntry key={o.id} order={o} />)}
        </div>
      )}

      {tab === "imaging" && (
        <div className="grid md:grid-cols-2 gap-4">
          {s.imagingOrders.map((o) => {
            const p = s.patients.find((x) => x.id === o.patientId);
            const isRad = role === "radiology" || role === "admin" || role === "super";
            return (
              <Card key={o.id} pad={false}
                title={<span className="flex items-center gap-2">{o.code} · {o.modality}<Pill tone={o.status === "reported" ? "green" : o.status === "completed" ? "pine" : "steel"}>{o.status}</Pill></span>}
                sub={`${o.bodyPart} · ${fmtDate(new Date(new Date().setDate(new Date().getDate() + o.dayOffset)).toISOString())}`}>
                <div className="p-4 pt-0 space-y-2.5">
                  <div className="flex items-center gap-2.5 bg-paper rounded-lg px-3 py-2">
                    {p && <Avatar name={fullName(p)} color={p.color} size={28} />}
                    <p className="text-[13px] font-semibold text-ink">{p ? fullName(p) : "—"}</p>
                    <span className="ml-auto text-[11px] text-ink-faint">{s.doctors.find((d) => d.id === o.doctorId)?.name}</span>
                  </div>

                  {o.status === "reported" && o.findings ? (
                    <div className="bg-pine-900 rounded-lg px-3.5 py-3 text-pine-100 relative overflow-hidden">
                      <I name="scan" className="w-24 h-24 absolute -right-4 -bottom-6 opacity-10" />
                      <p className="micro text-brand-400 mb-1">Radiologist findings</p>
                      <p className="text-[12.5px] leading-relaxed">{o.findings}</p>
                    </div>
                  ) : isRad && o.status === "completed" ? (
                    <>
                      <TextArea rows={3} placeholder="Dictate findings…" value={imgDrafts[o.id] ?? ""} onChange={(e) => setImgDrafts((d) => ({ ...d, [o.id]: e.target.value }))} />
                      <div className="flex justify-end">
                        <Btn size="sm" icon="shield" disabled={!(imgDrafts[o.id] ?? "").trim()}
                          onClick={() => setImaging(o.id, { status: "reported", findings: (imgDrafts[o.id] ?? "").trim() })}>
                          Sign report
                        </Btn>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-[11.5px] text-ink-faint">
                        {o.status === "ordered" ? "Awaiting scheduling at imaging desk." : o.status === "scheduled" ? "Patient scheduled — ready for scan." : "Scan complete, awaiting report."}
                      </p>
                      {isRad && o.status === "ordered" && <Btn size="sm" variant="outline" onClick={() => setImaging(o.id, { status: "scheduled" })}>Schedule</Btn>}
                      {isRad && o.status === "scheduled" && <Btn size="sm" variant="dark" onClick={() => setImaging(o.id, { status: "completed" })}>Mark scanned</Btn>}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

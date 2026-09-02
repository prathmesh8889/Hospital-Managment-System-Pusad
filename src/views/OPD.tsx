import { useEffect, useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { INTERACTION_PAIRS, LAB_CATALOG, ageOf, fullName, fmtMoney, minutesWaiting } from "../lib/data";
import type { PrescriptionItem, Vitals } from "../lib/data";
import { Avatar, Btn, Card, EmptyState, Field, Pill, Select, TextArea, TextInput } from "../components/ui";
import { I } from "../components/icons";

const ALLERGY_MATCH: Record<string, string[]> = {
  penicillin: ["penicillin"],
  "sulfa drugs": ["sulfa"],
  aspirin: ["nsaid"],
  nsaid: ["nsaid"],
  latex: [],
};

function allergyConflict(patientAllergies: string[], allergyClass?: string) {
  if (!allergyClass) return null;
  for (const a of patientAllergies) {
    const classes = ALLERGY_MATCH[a.toLowerCase()] ?? [];
    if (classes.includes(allergyClass)) return a;
  }
  return null;
}

function VitalsPanel({ consultId, vitals, canEdit, onSave }: { consultId: string; vitals: Vitals; canEdit: boolean; onSave: (v: Vitals) => void }) {
  const [v, setV] = useState<Vitals>(vitals);
  useEffect(() => setV(vitals), [consultId, vitals]);
  const num = (k: keyof Vitals) => (e: { target: { value: string } }) =>
    setV((p) => ({ ...p, [k]: e.target.value === "" ? undefined : Number(e.target.value) }));
  const fields: { k: keyof Vitals; label: string; unit: string }[] = [
    { k: "bpSys", label: "BP sys", unit: "mmHg" }, { k: "bpDia", label: "BP dia", unit: "mmHg" },
    { k: "hr", label: "Heart rate", unit: "bpm" }, { k: "temp", label: "Temp", unit: "°C" },
    { k: "spo2", label: "SpO₂", unit: "%" }, { k: "weight", label: "Weight", unit: "kg" },
  ];
  const abnormal = (v.temp ?? 0) >= 37.5 || (v.spo2 ?? 100) < 94 || (v.bpSys ?? 0) >= 140;
  return (
    <Card title="Vitals & triage" sub="recorded by nursing staff"
      action={canEdit ? <Btn size="sm" icon="check" onClick={() => onSave(v)}>Save vitals</Btn> : <Pill tone="gray">read-only</Pill>}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {fields.map((f) => (
          <div key={f.k}>
            <p className="micro text-ink-faint mb-1">{f.label}</p>
            {canEdit ? (
              <input type="number" value={v[f.k] ?? ""} onChange={num(f.k)} placeholder="—"
                className="w-full bg-white border border-line rounded-lg px-2.5 py-1.5 text-[16px] sm:text-[13px] font-mono outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
            ) : (
              <p className={`font-mono text-[15px] font-semibold px-2.5 py-1.5 rounded-lg border ${v[f.k] === undefined ? "text-ink-faint border-line-soft" : "text-ink border-line-soft bg-white"}`}>
                {v[f.k] ?? "—"}<span className="text-[9.5px] text-ink-faint ml-1">{f.unit}</span>
              </p>
            )}
          </div>
        ))}
      </div>
      {abnormal && (
        <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-warn-700 bg-warn-50 border border-warn-600/20 rounded-md px-2.5 py-1.5">
          <I name="alert" className="w-3.5 h-3.5" /> Abnormal readings flagged — bring to the doctor's attention.
        </p>
      )}
    </Card>
  );
}

function RxBuilder({ patientId, patientAllergies, onSent }: { patientId: string; patientAllergies: string[]; onSent: () => void }) {
  const { s, sendPrescription, toast } = useApp();
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState("");

  const matches = q.trim().length >= 2
    ? s.medicines.filter((m) => `${m.name} ${m.generic} ${m.category}`.toLowerCase().includes(q.toLowerCase())).slice(0, 5)
    : [];

  const add = (medId: string) => {
    if (items.some((i) => i.medicineId === medId)) return;
    setItems((p) => [...p, { medicineId: medId, dosage: "", frequency: "", duration: "", qty: 10 }]);
    setQ("");
  };

  const conflictFor = (medId: string) => allergyConflict(patientAllergies, s.medicines.find((m) => m.id === medId)?.allergyClass);

  const interactions = useMemo(() => {
    const ids = items.map((i) => i.medicineId);
    return INTERACTION_PAIRS.filter(([a, b]) => ids.includes(a) && ids.includes(b)).map(([, , msg]) => msg);
  }, [items]);

  const hasConflict = items.some((i) => conflictFor(i.medicineId));

  const send = () => {
    if (items.length === 0) { toast("error", "Empty prescription", "Add at least one medicine."); return; }
    if (items.some((i) => !i.dosage.trim() || !i.frequency.trim())) { toast("error", "Incomplete dosage", "Fill dosage and frequency for every item."); return; }
    if (hasConflict) { toast("error", "Allergy conflict", "Remove the conflicting medicine before sending."); return; }
    sendPrescription(patientId, items, notes.trim());
    setItems([]); setNotes("");
    onSent();
  };

  return (
    <Card title="Prescription builder" sub="sends straight to the pharmacy queue" pad={false}>
      <div className="p-3.5 space-y-3">
        <div className="relative">
          <I name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search formulary — e.g. amox, salbutamol…"
            className="w-full bg-white border border-line rounded-lg pl-9 pr-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
          {matches.length > 0 && (
            <div className="pop-in absolute z-20 left-0 right-0 top-full mt-1 bg-card border border-line rounded-lg shadow-lg overflow-hidden">
              {matches.map((m) => {
                const conflict = allergyConflict(patientAllergies, m.allergyClass);
                return (
                  <button key={m.id} onClick={() => add(m.id)} disabled={!!conflict || items.some((i) => i.medicineId === m.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-brand-50 transition-colors disabled:opacity-55 disabled:cursor-not-allowed border-b border-line-soft last:border-0">
                    <I name="pill" className="w-4 h-4 text-brand-600 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-semibold text-ink">{m.name}</span>
                      <span className="block text-[10.5px] text-ink-faint">{m.category} · stock {m.stock}</span>
                    </span>
                    {conflict && <Pill tone="red" className="ml-auto">allergy: {conflict}</Pill>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-[11.5px] text-ink-faint bg-paper rounded-lg px-3 py-3 text-center">Search and add medicines — dosage, frequency and duration go here.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it, idx) => {
              const m = s.medicines.find((x) => x.id === it.medicineId);
              const conflict = conflictFor(it.medicineId);
              return (
                <li key={it.medicineId} className={`border rounded-lg p-2.5 space-y-1.5 pop-in ${conflict ? "border-danger-600/40 bg-danger-50" : "border-line bg-white"}`}>
                  <div className="flex items-center gap-2">
                    <p className="text-[12.5px] font-semibold text-ink">{m?.name}</p>
                    <span className="font-mono text-[10px] text-ink-faint">{m?.form}</span>
                    {conflict && <Pill tone="red" className="ml-auto">⛔ {conflict} allergy</Pill>}
                    <button onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} className={`${conflict ? "" : "ml-auto"} text-ink-faint hover:text-danger-600 transition-colors`} aria-label="Remove">
                      <I name="x" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <TextInput placeholder="Dosage" value={it.dosage} onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, dosage: e.target.value } : x)))} className="!py-1.5 !text-xs" />
                    <TextInput placeholder="Freq (1-0-1)" value={it.frequency} onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, frequency: e.target.value } : x)))} className="!py-1.5 !text-xs" />
                    <TextInput placeholder="Duration" value={it.duration} onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, duration: e.target.value } : x)))} className="!py-1.5 !text-xs" />
                    <TextInput type="number" placeholder="Qty" value={it.qty} onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, qty: Number(e.target.value) } : x)))} className="!py-1.5 !text-xs font-mono" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {interactions.length > 0 && (
          <div className="bg-warn-50 border border-warn-600/25 rounded-lg px-3 py-2 space-y-1">
            {interactions.map((msg, i) => (
              <p key={i} className="text-[11.5px] text-warn-700 font-medium flex gap-1.5"><I name="alert" className="w-3.5 h-3.5 shrink-0" />{msg}</p>
            ))}
          </div>
        )}

        <TextArea rows={2} placeholder="Pharmacist notes — e.g. take with food" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Btn className="w-full" icon="send" onClick={send} disabled={hasConflict || items.length === 0}>
          Sign & send to pharmacy
        </Btn>
      </div>
    </Card>
  );
}

function LabOrderPanel({ patientId, doctorId }: { patientId: string; doctorId: string }) {
  const { s, orderLab } = useApp();
  const [picked, setPicked] = useState<string[]>([]);
  const [urgent, setUrgent] = useState(false);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const total = LAB_CATALOG.filter((t) => picked.includes(t.id)).reduce((x, t) => x + t.price, 0);

  return (
    <Card title="Order lab tests" sub="bill drafted automatically" pad={false}>
      <div className="p-3.5 space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          {LAB_CATALOG.map((t) => (
            <button key={t.id} onClick={() => toggle(t.id)}
              className={`text-left px-2.5 py-2 rounded-lg border transition-all duration-100 ${picked.includes(t.id) ? "border-brand-500 bg-brand-50 shadow-[0_0_0_1px_#0e8262]" : "border-line bg-white hover:border-brand-400/60"}`}>
              <p className="text-[12px] font-semibold text-ink leading-tight">{t.name}</p>
              <p className="font-mono text-[10px] text-ink-faint mt-0.5">{fmtMoney(t.price)} · {t.analytes.length} analytes</p>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[12px] font-medium text-ink-soft cursor-pointer select-none">
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="accent-[#be4b32] w-3.5 h-3.5" />
          Mark as urgent (STAT)
        </label>
        <div className="flex items-center justify-between pt-1">
          <p className="text-[12px] text-ink-soft">{picked.length} test(s) · <span className="font-mono font-semibold text-ink">{fmtMoney(total)}</span></p>
          <Btn size="sm" icon="flask" disabled={picked.length === 0}
            onClick={() => { orderLab(patientId, doctorId, picked, urgent); setPicked([]); setUrgent(false); }}>
            Place order
          </Btn>
        </div>
      </div>
    </Card>
  );
}

export function OPD() {
  const { s, startConsult, saveVitals, updateConsult, completeConsult, checkIn, toast, hasPermission } = useApp();
  const role = s.session?.role ?? "admin";
  const [, forceTick] = useState(0);
  const [activeApptId, setActiveApptId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => forceTick((x) => x + 1), 30000);
    return () => window.clearInterval(t);
  }, []);

  const today = s.appointments.filter((a) => a.dayOffset === 0);
  const queue = today.filter((a) => a.status === "checked-in").sort((a, b) => (a.token ?? 0) - (b.token ?? 0));
  const inConsult = today.filter((a) => a.status === "in-consultation");
  const done = today.filter((a) => a.status === "completed").sort((a, b) => b.time.localeCompare(a.time));
  const upcoming = today.filter((a) => a.status === "scheduled").sort((a, b) => a.time.localeCompare(b.time));

  const active = activeApptId ? inConsult.find((a) => a.id === activeApptId) ?? inConsult[0] : inConsult[0];
  const consult = active ? s.consultations.find((c) => c.appointmentId === active.id) : undefined;
  const patient = active ? s.patients.find((p) => p.id === active.patientId) : undefined;

  const canEdit = hasPermission("opd", "edit");
  const isDoctor = canEdit && (role === "doctor" || role === "admin" || role === "super");
  const isNurse = canEdit && (role === "nurse" || role === "admin" || role === "super");

  const finish = () => {
    if (!consult) return;
    if (!consult.diagnosis.trim()) { toast("error", "Diagnosis required", "Enter a diagnosis before closing the encounter."); return; }
    completeConsult(consult.id);
    setActiveApptId(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="micro text-brand-700">Outpatient department</p>
        <h1 className="font-display font-extrabold text-[22px] tracking-tight text-ink">OPD queue & consultation</h1>
      </div>

      <div className="grid lg:grid-cols-12 gap-4 items-start">
        {/* queue column */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <Card title="Waiting queue" sub={`${queue.length} patient(s) with token`} pad={false}>
            {queue.length === 0 && inConsult.length === 0 && (
              <EmptyState icon="queue" title="Queue is clear" desc="Check patients in from the Appointments desk." />
            )}
            <ul className="p-2 space-y-1.5">
              {inConsult.map((a) => {
                const p = s.patients.find((x) => x.id === a.patientId);
                return (
                  <li key={a.id}>
                    <button onClick={() => setActiveApptId(a.id)}
                      className={`w-full flex items-center gap-2.5 rounded-lg border px-2.5 py-2.5 text-left transition-all ${active?.id === a.id ? "border-brand-500 bg-brand-50 shadow-[0_0_0_1px_#0e8262]" : "border-pine-700 bg-pine-900 text-white"}`}>
                      <span className="token-notch bg-brand-600 text-white font-mono text-[11px] font-bold px-2 py-1 rounded">Q-{a.token}</span>
                      <div className="min-w-0">
                        <p className={`text-[13px] font-semibold truncate ${active?.id === a.id ? "text-ink" : "text-white"}`}>{p ? fullName(p) : "—"}</p>
                        <p className={`text-[10.5px] truncate ${active?.id === a.id ? "text-ink-faint" : "text-pine-100/60"}`}>in consultation · {a.time}</p>
                      </div>
                      <span className="ml-auto w-2 h-2 rounded-full bg-brand-500 pulse-live shrink-0" />
                    </button>
                  </li>
                );
              })}
              {queue.map((a) => {
                const p = s.patients.find((x) => x.id === a.patientId);
                const mins = minutesWaiting(a.checkInAt);
                return (
                  <li key={a.id} className="flex items-center gap-2.5 bg-white border border-line-soft rounded-lg px-2.5 py-2.5 hover:border-brand-400/60 transition-colors">
                    <span className="token-notch bg-pine-900 text-brand-200 font-mono text-[11px] font-bold px-2 py-1 rounded">Q-{a.token}</span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink truncate">{p ? fullName(p) : "—"}</p>
                      <p className="text-[10.5px] text-ink-faint truncate">{s.doctors.find((d) => d.id === a.doctorId)?.name}</p>
                    </div>
                    <div className="ml-auto text-right shrink-0">
                      <p className={`font-mono text-[11px] font-semibold ${mins > 45 ? "text-danger-600" : "text-ink-soft"}`}>{mins}m</p>
                      {isDoctor && (
                        <button onClick={() => { startConsult(a.id); setActiveApptId(a.id); }}
                          className="text-[10px] font-bold text-brand-700 hover:underline">call in →</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="Next scheduled" sub="awaiting check-in" pad={false}>
            <ul className="p-2 space-y-1">
              {upcoming.slice(0, 5).map((a) => {
                const p = s.patients.find((x) => x.id === a.patientId);
                return (
                  <li key={a.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-brand-50/70 transition-colors">
                    <span className="font-mono text-[11.5px] font-semibold text-ink-soft w-10">{a.time}</span>
                    <span className="text-[12.5px] text-ink truncate">{p ? fullName(p) : "—"}</span>
                    {canEdit && (role === "reception" || role === "admin" || role === "super") && (
                      <button onClick={() => checkIn(a.id)} className="ml-auto text-[10px] font-bold text-brand-700 hover:underline shrink-0">check-in</button>
                    )}
                  </li>
                );
              })}
              {upcoming.length === 0 && <p className="text-[11.5px] text-ink-faint px-2 py-3 text-center">Everyone is checked in.</p>}
            </ul>
          </Card>
        </div>

        {/* encounter column */}
        <div className="lg:col-span-8 xl:col-span-5 space-y-4">
          {!active || !consult || !patient ? (
            <Card>
              <EmptyState icon="stetho" title="No active consultation" desc="Call the next patient in from the waiting queue to open their encounter." />
            </Card>
          ) : (
            <>
              <div className="fade-up bg-card border border-line rounded-xl overflow-hidden">
                <div className="bg-pine-900 pine-tex px-4 py-3 text-white">
                  <div className="flex items-center gap-3">
                  <Avatar name={fullName(patient)} color={patient.color} size={40} />
                  <div className="min-w-0">
                    <p className="font-display font-bold text-[15px] leading-tight">{fullName(patient)} <span className="font-mono text-[10.5px] text-brand-400 ml-1">{patient.code}</span></p>
                    <p className="text-[11.5px] text-pine-100/70">{ageOf(patient.dob)} yrs · {patient.gender} · token Q-{active.token} · {s.doctors.find((d) => d.id === active.doctorId)?.name}</p>
                  </div>
                  {patient.allergies.length > 0 && (
                    <span className="ml-auto flex items-center gap-1 bg-danger-600 text-white text-[10.5px] font-bold px-2 py-1 rounded-md uppercase">
                      <I name="alert" className="w-3 h-3" /> {patient.allergies.join(", ")}
                    </span>
                  )}
                  </div>
                  {patient.conditions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <I name="pulse" className="w-3 h-3 text-brand-400" />
                      <span className="micro text-pine-100/50">History</span>
                      {patient.conditions.map((c) => (
                        <span key={c} className="bg-white/10 border border-white/15 text-pine-100 text-[10px] font-semibold px-2 py-0.5 rounded-md">{c}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3.5">
                  <VitalsPanel consultId={consult.id} vitals={consult.vitals} canEdit={isNurse} onSave={(v) => saveVitals(consult.id, v)} />

                  <Field label="Chief complaint">
                    <TextArea rows={2} value={consult.complaint} disabled={!isDoctor}
                      onChange={(e) => updateConsult(consult.id, { complaint: e.target.value })} />
                  </Field>
                  <Field label="Examination findings">
                    <TextArea rows={2} placeholder="e.g. bilateral wheeze, no crackles…" value={consult.examination} disabled={!isDoctor}
                      onChange={(e) => updateConsult(consult.id, { examination: e.target.value })} />
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Diagnosis (ICD-10)" hint="required to close the encounter">
                      <TextInput placeholder="e.g. Acute bronchitis (J20.9)" value={consult.diagnosis} disabled={!isDoctor}
                        onChange={(e) => updateConsult(consult.id, { diagnosis: e.target.value })} />
                    </Field>
                    <Field label="Follow-up">
                      <Select value={consult.followUpOffset ?? ""} disabled={!isDoctor}
                        onChange={(e) => updateConsult(consult.id, { followUpOffset: e.target.value === "" ? undefined : Number(e.target.value) })}>
                        <option value="">None</option>
                        <option value={1}>Tomorrow</option>
                        <option value={7}>In 1 week</option>
                        <option value={14}>In 2 weeks</option>
                        <option value={30}>In 1 month</option>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Advice / plan">
                    <TextArea rows={2} value={consult.advice} disabled={!isDoctor}
                      onChange={(e) => updateConsult(consult.id, { advice: e.target.value })} />
                  </Field>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-ink-faint">Encounter opened {consult.at ? new Date(consult.at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                    {isDoctor ? (
                      <Btn icon="check" onClick={finish}>Complete consultation</Btn>
                    ) : (
                      <Pill tone="steel">awaiting doctor</Pill>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <Card title="Completed today" sub={`${done.length} visit(s) closed`} pad={false}>
            <ul className="p-2 space-y-1">
              {done.map((a) => {
                const p = s.patients.find((x) => x.id === a.patientId);
                const c = s.consultations.find((x) => x.appointmentId === a.id);
                return (
                  <li key={a.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-brand-50/70 transition-colors">
                    <I name="check" className="w-4 h-4 text-brand-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-ink truncate">{p ? fullName(p) : "—"}</p>
                      <p className="text-[10.5px] text-ink-faint truncate">{c?.diagnosis || a.reason}</p>
                    </div>
                    <span className="ml-auto font-mono text-[10.5px] text-ink-faint shrink-0">{a.time}</span>
                  </li>
                );
              })}
              {done.length === 0 && <p className="text-[11.5px] text-ink-faint px-2 py-3 text-center">No completed visits yet today.</p>}
            </ul>
          </Card>
        </div>

        {/* orders column */}
        <div className="xl:col-span-4 space-y-4">
          {active && patient && consult && isDoctor ? (
            <>
              <RxBuilder key={consult.id} patientId={patient.id} patientAllergies={patient.allergies} onSent={() => setActiveApptId(active.id)} />
              <LabOrderPanel patientId={patient.id} doctorId={active.doctorId} />
            </>
          ) : (
            <Card>
              <EmptyState icon="pill" title={isDoctor ? "No encounter open" : "Doctor workspace"} desc={isDoctor ? "Orders and prescriptions attach to the active consultation." : "Prescription and lab ordering tools appear here for doctors during a consultation."} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

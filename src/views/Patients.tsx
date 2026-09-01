import { useEffect, useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { ageOf, billTotals, dayLabel, deptName, fmtDate, fmtMoney, fullName, timeAgo } from "../lib/data";
import type { Patient } from "../lib/data";
import { Avatar, Btn, Card, Drawer, EmptyState, Field, KeyVal, Modal, Pill, Select, Tabs, TextArea, TextInput, BILL_META, LAB_META } from "../components/ui";
import { I } from "../components/icons";
import { RxLetterModal } from "../components/RxLetter";

function ChipInput({ label, hint, items, setItems, tone }: { label: string; hint: string; items: string[]; setItems: (v: string[]) => void; tone: "red" | "steel" }) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim();
    if (!v) return;
    if (!items.some((x) => x.toLowerCase() === v.toLowerCase())) setItems([...items, v]);
    setVal("");
  };
  return (
    <div>
      <p className="micro text-ink-soft mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[26px]">
        {items.length === 0 && <span className="text-[11.5px] text-ink-faint self-center">{hint}</span>}
        {items.map((c) => (
          <span key={c} className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2 py-1 rounded-md ${tone === "red" ? "bg-danger-50 text-danger-700 border border-danger-600/20" : "bg-steel-50 text-steel-700 border border-steel-600/20"}`}>
            {c}
            <button onClick={() => setItems(items.filter((x) => x !== c))} className="hover:opacity-60 transition-opacity" aria-label={`Remove ${c}`}>
              <I name="x" className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <TextInput value={val} onChange={(e) => setVal(e.target.value)} placeholder={`Add ${label.toLowerCase()}…`}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Btn variant="outline" size="sm" icon="plus" onClick={add} className="shrink-0">Add</Btn>
      </div>
    </div>
  );
}

function ClinicalEditor({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { updatePatientClinical } = useApp();
  const [conditions, setConditions] = useState<string[]>([...patient.conditions]);
  const [allergies, setAllergies] = useState<string[]>([...patient.allergies]);
  return (
    <Modal open onClose={onClose} title="Clinical profile" wide
      sub={`${fullName(patient)} · ${patient.code} — changes are audit-logged and visible to the whole care team`}
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn icon="check" onClick={() => { updatePatientClinical(patient.id, { conditions, allergies }); onClose(); }}>Save changes</Btn></>}>
      <div className="space-y-5">
        <ChipInput label="Allergies" hint="No known allergies recorded" items={allergies} setItems={setAllergies} tone="red" />
        <div className="h-px bg-line-soft" />
        <ChipInput label="Conditions" hint="No chronic conditions recorded" items={conditions} setItems={setConditions} tone="steel" />
        <p className="text-[11.5px] text-warn-700 bg-warn-50 border border-warn-600/20 rounded-lg px-3 py-2 flex gap-1.5">
          <I name="alert" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Allergy changes instantly update dispensing safety checks in OPD prescribing and Pharmacy, and alert the pharmacist.
        </p>
      </div>
    </Modal>
  );
}

const blankForm = {
  firstName: "", lastName: "", dob: "1990-01-01", gender: "Female" as Patient["gender"], phone: "", email: "",
  address: "", blood: "O+", emergencyName: "", emergencyPhone: "", insuranceProviderId: "", policyNumber: "",
  allergies: "", conditions: "",
};

function RegisterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, registerPatient, toast } = useApp();
  const [f, setF] = useState(blankForm);
  const set = (k: keyof typeof blankForm) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = () => {
    if (!f.firstName.trim() || !f.lastName.trim() || !f.phone.trim()) {
      toast("error", "Missing fields", "First name, last name and phone are required.");
      return;
    }
    const code = registerPatient({
      firstName: f.firstName.trim(), lastName: f.lastName.trim(), dob: f.dob, gender: f.gender,
      phone: f.phone.trim(), email: f.email.trim(), address: f.address.trim(), blood: f.blood,
      emergencyName: f.emergencyName.trim() || "—", emergencyPhone: f.emergencyPhone.trim() || "—",
      insuranceProviderId: f.insuranceProviderId || undefined, policyNumber: f.policyNumber.trim() || undefined,
      allergies: f.allergies.split(",").map((x) => x.trim()).filter(Boolean),
      conditions: f.conditions.split(",").map((x) => x.trim()).filter(Boolean),
    });
    toast("success", `Patient registered · ${code}`, "Unique patient ID generated.");
    setF(blankForm);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Register new patient" sub="A unique patient ID is generated on save" wide
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn icon="check" onClick={submit}>Register patient</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3.5">
        <Field label="First name *"><TextInput value={f.firstName} onChange={set("firstName")} placeholder="e.g. Rosa" /></Field>
        <Field label="Last name *"><TextInput value={f.lastName} onChange={set("lastName")} placeholder="e.g. Delgado" /></Field>
        <Field label="Date of birth"><TextInput type="date" value={f.dob} onChange={set("dob")} /></Field>
        <Field label="Gender">
          <Select value={f.gender} onChange={set("gender")}>
            <option>Female</option><option>Male</option><option>Other</option>
          </Select>
        </Field>
        <Field label="Phone *"><TextInput value={f.phone} onChange={set("phone")} placeholder="+1 555-0100" /></Field>
        <Field label="Email"><TextInput value={f.email} onChange={set("email")} placeholder="name@mail.com" /></Field>
        <Field label="Address"><TextInput value={f.address} onChange={set("address")} placeholder="Street, district" /></Field>
        <Field label="Blood group">
          <Select value={f.blood} onChange={set("blood")}>
            {["O+", "O−", "A+", "A−", "B+", "B−", "AB+", "AB−"].map((b) => <option key={b}>{b}</option>)}
          </Select>
        </Field>
        <Field label="Emergency contact"><TextInput value={f.emergencyName} onChange={set("emergencyName")} placeholder="Contact name" /></Field>
        <Field label="Emergency phone"><TextInput value={f.emergencyPhone} onChange={set("emergencyPhone")} placeholder="+1 555-0100" /></Field>
        <Field label="Insurance provider">
          <Select value={f.insuranceProviderId} onChange={set("insuranceProviderId")}>
            <option value="">Self-pay / none</option>
            {s.insurers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>
        </Field>
        <Field label="Policy number"><TextInput value={f.policyNumber} onChange={set("policyNumber")} placeholder="XX-00000-00" /></Field>
        <Field label="Allergies" hint="comma separated — e.g. Penicillin, Latex"><TextInput value={f.allergies} onChange={set("allergies")} /></Field>
        <Field label="Known conditions" hint="comma separated"><TextInput value={f.conditions} onChange={set("conditions")} /></Field>
      </div>
    </Modal>
  );
}

function PatientDrawer({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { s, go, setBookPatient, createAdmission, toast } = useApp();
  const [tab, setTab] = useState("timeline");
  const [editClinical, setEditClinical] = useState(false);
  const [letterId, setLetterId] = useState<string | null>(null);
  const role = s.session?.role ?? "admin";
  const canWrite = role !== "patient";
  const canEditClinical = ["doctor", "nurse", "admin", "super"].includes(role);

  useEffect(() => setTab("timeline"), [patient.id]);

  const timeline = useMemo(() => {
    type Ev = { at: string; kind: string; tone: "green" | "amber" | "red" | "steel" | "pine" | "gray"; title: string; sub: string; icon: string };
    const evs: Ev[] = [];
    s.consultations.filter((c) => c.patientId === patient.id).forEach((c) => {
      const d = s.doctors.find((x) => x.id === c.doctorId);
      evs.push({ at: c.at, kind: c.status === "completed" ? "Consultation" : "Consultation (open)", tone: c.status === "completed" ? "green" : "amber", title: c.status === "completed" ? c.diagnosis : "In progress", sub: `${d?.name ?? ""} · ${c.complaint.slice(0, 60)}`, icon: "stetho" });
    });
    s.prescriptions.filter((r) => r.patientId === patient.id).forEach((r) =>
      evs.push({ at: r.createdAt, kind: "Prescription", tone: "pine", title: `${r.code} · ${r.items.length} item(s) · ${r.status}`, sub: r.items.map((i) => s.medicines.find((m) => m.id === i.medicineId)?.name).join(", "), icon: "pill" }));
    s.labOrders.filter((o) => o.patientId === patient.id).forEach((o) =>
      evs.push({ at: o.verifiedAt ?? new Date(new Date().setDate(new Date().getDate() + o.dayOffset)).toISOString(), kind: "Lab order", tone: o.status === "verified" ? "green" : "steel", title: `${o.code} · ${LAB_META[o.status].label}`, sub: o.tests.join(" + "), icon: "flask" }));
    s.admissions.filter((a) => a.patientId === patient.id).forEach((a) => {
      const ward = s.wards.find((w) => w.id === a.wardId);
      evs.push({ at: new Date(new Date().setDate(new Date().getDate() + a.admittedOffset)).toISOString(), kind: "Admission", tone: a.status === "discharged" ? "gray" : "red", title: `${a.code} · ${a.reason} (${a.status})`, sub: ward?.name ?? "", icon: "bed" });
    });
    s.bills.filter((b) => b.patientId === patient.id).forEach((b) =>
      evs.push({ at: b.createdAt, kind: "Invoice", tone: b.status === "paid" ? "green" : "amber", title: `${b.code} · ${fmtMoney(billTotals(b).total)} · ${b.status}`, sub: b.items.slice(0, 2).map((i) => i.desc).join(" · "), icon: "receipt" }));
    return evs.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  }, [patient.id, s]);

  const insurer = s.insurers.find((i) => i.id === patient.insuranceProviderId);
  const rxList = s.prescriptions.filter((r) => r.patientId === patient.id);
  const labs = s.labOrders.filter((o) => o.patientId === patient.id);
  const imgs = s.imagingOrders.filter((o) => o.patientId === patient.id);
  const bills = s.bills.filter((b) => b.patientId === patient.id);

  const admit = () => {
    createAdmission({ patientId: patient.id, doctorId: "d2", wardId: "w1", reason: "Observation — from OPD", plan: "Vitals q4h, review in 24h.", bedId: undefined });
    toast("info", "Admission request created", "Bed assignment is pending in Wards.");
  };

  return (
    <Drawer open onClose={onClose} width={520}>
      {/* header */}
      <div className="sticky top-0 z-10 bg-pine-900 pine-tex text-white px-5 py-4">
        <div className="flex items-start gap-3">
          <Avatar name={fullName(patient)} color={patient.color} size={48} />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[0.14em] text-brand-400 uppercase">{patient.code} · blood {patient.blood}</p>
            <h2 className="font-display font-extrabold text-lg leading-tight truncate">{fullName(patient)}</h2>
            <p className="text-[12px] text-pine-100/70">{ageOf(patient.dob)} yrs · {patient.gender} · {patient.phone}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-pine-100/70 hover:text-white hover:bg-white/10 transition-colors" aria-label="Close">
            <I name="x" className="w-4 h-4" />
          </button>
        </div>
        {patient.allergies.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <I name="alert" className="w-3.5 h-3.5 text-danger-100" />
            {patient.allergies.map((a) => (
              <span key={a} className="bg-danger-600 text-white text-[10.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">{a} allergy</span>
            ))}
          </div>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <I name="pulse" className="w-3.5 h-3.5 text-brand-400" />
          {patient.conditions.length === 0 && <span className="text-[11px] text-pine-100/60">No recorded conditions</span>}
          {patient.conditions.map((c) => (
            <span key={c} className="bg-white/10 border border-white/15 text-pine-100 text-[10.5px] font-semibold px-2 py-0.5 rounded-md">{c}</span>
          ))}
          {canEditClinical && (
            <button onClick={() => setEditClinical(true)}
              className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-bold text-brand-400 hover:text-brand-200 transition-colors">
              <I name="edit" className="w-3 h-3" /> Edit clinical
            </button>
          )}
        </div>
        {canWrite && (
          <div className="mt-3 flex gap-2">
            <Btn size="sm" icon="calendar" className="!bg-brand-500 hover:!bg-brand-400" onClick={() => { setBookPatient(patient.id); go("appointments"); }}>Book appointment</Btn>
            <Btn size="sm" variant="dark" icon="bed" className="!bg-white/10 hover:!bg-white/20 border border-white/15" onClick={admit}>Request admission</Btn>
          </div>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        <Tabs
          tabs={[
            { id: "timeline", label: "Timeline" },
            { id: "rx", label: "Rx", count: rxList.length },
            { id: "labs", label: "Lab & Img", count: labs.length + imgs.length },
            { id: "bills", label: "Bills", count: bills.length },
            { id: "info", label: "Info" },
          ]}
          active={tab} onChange={setTab}
        />

        {tab === "timeline" && (
          <div className="relative pl-5">
            <span className="absolute left-[7px] top-2 bottom-2 w-px bg-line" />
            {timeline.length === 0 && <EmptyState icon="pulse" title="No recorded events" desc="Consultations, prescriptions, labs and bills will appear here." />}
            {timeline.map((e, i) => (
              <div key={i} className="relative pb-4 fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <span className={`absolute -left-5 top-1 w-[15px] h-[15px] rounded-full border-[3px] border-paper ${
                  e.tone === "green" ? "bg-brand-500" : e.tone === "amber" ? "bg-warn-600" : e.tone === "red" ? "bg-danger-600" : e.tone === "pine" ? "bg-pine-700" : e.tone === "steel" ? "bg-steel-600" : "bg-ink-faint"
                }`} />
                <div className="bg-white border border-line-soft rounded-lg px-3.5 py-2.5 hover:border-brand-400/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <I name={e.icon} className="w-3.5 h-3.5 text-ink-faint" />
                    <p className="micro text-ink-faint">{e.kind}</p>
                    <span className="ml-auto micro text-ink-faint">{timeAgo(e.at)}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-ink mt-1 leading-snug">{e.title}</p>
                  {e.sub && <p className="text-[11.5px] text-ink-soft mt-0.5 leading-snug">{e.sub}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "rx" && (
          <div className="space-y-3">
            {rxList.length === 0 && <EmptyState icon="pill" title="No prescriptions" />}
            {rxList.map((r) => (
              <Card key={r.id} className="!rounded-lg" pad={false}
                title={<span className="flex items-center gap-2">{r.code}<Pill tone={r.status === "dispensed" ? "green" : "amber"}>{r.status}</Pill></span>}
                sub={`${s.doctors.find((d) => d.id === r.doctorId)?.name} · ${timeAgo(r.createdAt)}`}>
                <div className="p-3 pt-0">
                  <div className="overflow-x-auto scroll-slim">
                  <table className="w-full text-[12px] min-w-[360px]">
                    <thead><tr className="micro text-ink-faint text-left"><th className="pb-1.5 font-medium">Medicine</th><th className="pb-1.5 font-medium">Dosage</th><th className="pb-1.5 font-medium">Freq</th><th className="pb-1.5 font-medium text-right">Qty</th></tr></thead>
                    <tbody>
                      {r.items.map((it, i) => {
                        const m = s.medicines.find((x) => x.id === it.medicineId);
                        return (
                          <tr key={i} className="border-t border-line-soft">
                            <td className="py-1.5 font-medium text-ink">{m?.name}</td>
                            <td className="py-1.5 text-ink-soft">{it.dosage}</td>
                            <td className="py-1.5 text-ink-soft">{it.frequency}</td>
                            <td className="py-1.5 text-right font-mono">{it.qty}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                  {r.notes && <p className="text-[11.5px] text-ink-soft bg-paper rounded-md px-2.5 py-1.5 mt-2"><span className="font-semibold">Notes:</span> {r.notes}</p>}
                  <div className="flex justify-end gap-2 mt-2.5">
                    <Btn size="sm" variant="outline" icon="share" onClick={() => setLetterId(r.id)}>Share</Btn>
                    <Btn size="sm" variant="dark" icon="download" onClick={() => setLetterId(r.id)}>Letter</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === "labs" && (
          <div className="space-y-3">
            {labs.map((o) => (
              <Card key={o.id} className="!rounded-lg" title={<span className="flex items-center gap-2">{o.code}<Pill tone={LAB_META[o.status].tone}>{LAB_META[o.status].label}</Pill>{o.urgent && <Pill tone="red">urgent</Pill>}</span>} sub={o.tests.join(" + ")}>
                <div className="grid grid-cols-2 gap-1.5">
                  {o.analytes.map((a, i) => {
                    const abn = a.result !== undefined && (a.result < a.low || a.result > a.high);
                    return (
                      <div key={i} className={`rounded-md px-2.5 py-1.5 border text-[11.5px] ${abn ? "bg-danger-50 border-danger-600/20" : "bg-white border-line-soft"}`}>
                        <p className="text-ink-faint">{a.name} {a.unit && <span className="font-mono text-[10px]">({a.unit})</span>}</p>
                        <p className={`font-mono font-semibold ${abn ? "text-danger-700" : "text-ink"}`}>
                          {a.result ?? "—"} <span className="font-normal text-ink-faint font-sans text-[10px]">ref {a.low}–{a.high}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
            {imgs.map((o) => (
              <Card key={o.id} className="!rounded-lg" title={<span className="flex items-center gap-2">{o.code} · {o.modality}<Pill tone={o.status === "reported" ? "green" : "steel"}>{o.status}</Pill></span>} sub={o.bodyPart}>
                {o.findings && <p className="text-[12px] text-ink-soft leading-relaxed">{o.findings}</p>}
              </Card>
            ))}
            {labs.length + imgs.length === 0 && <EmptyState icon="flask" title="No lab or imaging orders" />}
          </div>
        )}

        {tab === "bills" && (
          <div className="space-y-2.5">
            {bills.length === 0 && <EmptyState icon="receipt" title="No invoices" />}
            {bills.map((b) => {
              const t = billTotals(b);
              return (
                <div key={b.id} className="bg-white border border-line-soft rounded-lg px-3.5 py-2.5 flex items-center gap-3 hover:border-brand-400/50 transition-colors">
                  <I name="receipt" className="w-4 h-4 text-ink-faint" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink">{b.code} <span className="font-mono text-[10.5px] text-ink-faint ml-1">{fmtDate(b.createdAt)}</span></p>
                    <p className="text-[11px] text-ink-soft">{b.items.length} item(s) · paid {fmtMoney(t.paid)}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="font-mono font-semibold text-[13px] text-ink">{fmtMoney(t.total)}</p>
                    <Pill tone={BILL_META[b.status].tone}>{BILL_META[b.status].label}</Pill>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "info" && (
          <Card className="!rounded-lg">
            <KeyVal k="Patient ID" v={<span className="font-mono">{patient.code}</span>} />
            <KeyVal k="Date of birth" v={`${fmtDate(patient.dob)} · ${ageOf(patient.dob)} yrs`} />
            <KeyVal k="Gender" v={patient.gender} />
            <KeyVal k="Blood group" v={<Pill tone="red">{patient.blood}</Pill>} />
            <KeyVal k="Phone" v={patient.phone} />
            <KeyVal k="Email" v={patient.email || "—"} />
            <KeyVal k="Address" v={patient.address || "—"} />
            <KeyVal k="Emergency contact" v={`${patient.emergencyName} · ${patient.emergencyPhone}`} />
            <KeyVal k="Insurance" v={insurer ? `${insurer.name} · ${patient.policyNumber}` : "Self-pay"} />
            <KeyVal k="Conditions" v={patient.conditions.join(", ") || "—"} />
            <KeyVal k="Registered" v={fmtDate(patient.registeredAt)} />
            <KeyVal k="Last visit" v={patient.conditions[0] ? deptName("im") : "—"} />
          </Card>
        )}
      </div>

      {editClinical && <ClinicalEditor patient={patient} onClose={() => setEditClinical(false)} />}
      {letterId && (() => {
        const rx = s.prescriptions.find((r) => r.id === letterId);
        return rx ? <RxLetterModal rx={rx} onClose={() => setLetterId(null)} /> : null;
      })()}
    </Drawer>
  );
}

export function Patients() {
  const { s } = useApp();
  const focusPatientId = s.focusPatientId;
  const [q, setQ] = useState("");
  const [showReg, setShowReg] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const role = s.session?.role ?? "admin";

  useEffect(() => {
    if (focusPatientId) setSelectedId(focusPatientId);
  }, [focusPatientId]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? s.patients.filter((p) => `${p.firstName} ${p.lastName} ${p.code} ${p.phone} ${p.blood}`.toLowerCase().includes(needle))
      : s.patients;
    return filtered;
  }, [q, s.patients]);

  const selected = s.patients.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="micro text-brand-700">Patient management</p>
          <h1 className="font-display font-extrabold text-[22px] tracking-tight text-ink">Patient registry</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <I name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID, phone, blood…"
              className="bg-white border border-line rounded-lg pl-9 pr-3 py-2 text-[13px] w-[280px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-shadow" />
          </div>
          {(role === "reception" || role === "admin" || role === "super") && (
            <Btn icon="plus" onClick={() => setShowReg(true)}>New patient</Btn>
          )}
        </div>
      </div>

      <Card pad={false} sub={`${list.length} record(s)`} title="Registered patients">
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="micro text-ink-faint text-left border-b border-line">
                <th className="px-4 py-2.5 font-medium">Patient</th>
                <th className="px-3 py-2.5 font-medium">Age / Sex</th>
                <th className="px-3 py-2.5 font-medium">Blood</th>
                <th className="px-3 py-2.5 font-medium hidden md:table-cell">Contact</th>
                <th className="px-3 py-2.5 font-medium hidden lg:table-cell">Insurance</th>
                <th className="px-3 py-2.5 font-medium">Flags</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {list.map((p, idx) => {
                const insurer = s.insurers.find((i) => i.id === p.insuranceProviderId);
                return (
                  <tr key={p.id} onClick={() => setSelectedId(p.id)}
                    className="border-b border-line-soft last:border-0 hover:bg-brand-50/70 cursor-pointer transition-colors fade-up" style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={fullName(p)} color={p.color} size={32} />
                        <div>
                          <p className="font-semibold text-ink">{fullName(p)}</p>
                          <p className="font-mono text-[10.5px] text-ink-faint">{p.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft">{ageOf(p.dob)} · {p.gender[0]}</td>
                    <td className="px-3 py-2.5"><Pill tone="red">{p.blood}</Pill></td>
                    <td className="px-3 py-2.5 text-ink-soft hidden md:table-cell">{p.phone}</td>
                    <td className="px-3 py-2.5 text-ink-soft hidden lg:table-cell">{insurer?.name ?? <span className="text-ink-faint">Self-pay</span>}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        {p.allergies.length > 0 && <Pill tone="red" dot={false}><I name="alert" className="w-3 h-3" /> {p.allergies.length}</Pill>}
                        {p.conditions.length > 0 && <Pill tone="steel" dot={false}>{p.conditions.length} cond.</Pill>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right"><I name="chevron-r" className="w-4 h-4 text-ink-faint inline" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && <EmptyState title="No patients match" desc={`Nothing found for “${q}”. Try a code like PT-1041.`} />}
        </div>
      </Card>

      {selected && <PatientDrawer patient={selected} onClose={() => setSelectedId(null)} />}
      <RegisterModal open={showReg} onClose={() => setShowReg(false)} />
    </div>
  );
}

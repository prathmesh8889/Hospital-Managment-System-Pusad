import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { ageOf, fullName, fmtMoney, fmtMoney0 } from "../lib/data";
import type { Admission, Bed } from "../lib/data";
import { Avatar, Btn, Card, Drawer, EmptyState, Field, Modal, Pill, Select, TextArea, TextInput, BED_META } from "../components/ui";
import { I } from "../components/icons";

const BED_STYLE: Record<Bed["status"], string> = {
  available: "border-brand-500/40 bg-brand-50 hover:border-brand-500",
  occupied: "border-pine-700 bg-pine-900 text-white hover:border-pine-600",
  cleaning: "border-warn-600/40 bg-warn-50 hover:border-warn-600",
  maintenance: "border-danger-600/40 bg-danger-50 hover:border-danger-600",
};

function DischargeModal({ admission, onClose }: { admission: Admission; onClose: () => void }) {
  const { s, discharge } = useApp();
  const [summary, setSummary] = useState("Stable for discharge. Continue home medications; follow-up in OPD within 7 days.");
  const patient = s.patients.find((p) => p.id === admission.patientId);
  return (
    <Modal open onClose={onClose} title={`Discharge ${patient ? fullName(patient) : ""}`} sub="Generates the final bill and sends the bed to cleaning" wide
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn variant="danger" icon="check" onClick={() => { discharge(admission.id, summary); onClose(); }}>Confirm discharge</Btn></>}>
      <Field label="Discharge summary">
        <TextArea rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
      <p className="text-[11.5px] text-ink-faint mt-2 flex items-center gap-1.5"><I name="info" className="w-3.5 h-3.5" /> Bed nights and discharge medication pack are billed automatically.</p>
    </Modal>
  );
}

function AssignBedModal({ admission, onClose }: { admission: Admission; onClose: () => void }) {
  const { s, assignBed } = useApp();
  const available = s.beds.filter((b) => b.status === "available");
  const [bedId, setBedId] = useState(available[0]?.id ?? "");
  const patient = s.patients.find((p) => p.id === admission.patientId);
  return (
    <Modal open onClose={onClose} title={`Assign bed — ${patient ? fullName(patient) : ""}`} sub={`${available.length} bed(s) available hospital-wide`}
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn icon="bed" disabled={!bedId} onClick={() => { assignBed(admission.id, bedId); onClose(); }}>Assign & admit</Btn></>}>
      <Field label="Choose an available bed">
        <Select value={bedId} onChange={(e) => setBedId(e.target.value)}>
          {available.map((b) => (
            <option key={b.id} value={b.id}>{b.label} · {s.wards.find((w) => w.id === b.wardId)?.name} · {fmtMoney0(b.rate)}/night</option>
          ))}
        </Select>
      </Field>
    </Modal>
  );
}

function NewAdmissionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, createAdmission } = useApp();
  const [patientId, setPatientId] = useState(s.patients[0]?.id ?? "");
  const [wardId, setWardId] = useState("w1");
  const [reason, setReason] = useState("");
  const [plan, setPlan] = useState("");
  const [directBed, setDirectBed] = useState("");
  const freeInWard = s.beds.filter((b) => b.wardId === wardId && b.status === "available");

  return (
    <Modal open={open} onClose={onClose} title="New inpatient admission" sub="Creates an admission request; bed can be assigned now or later" wide
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn icon="bed" onClick={() => { if (!reason.trim()) return; createAdmission({ patientId, doctorId: "d2", wardId, reason: reason.trim(), plan: plan.trim() || "Standard ward care.", bedId: directBed || undefined }); onClose(); }}>Create admission</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3.5">
        <Field label="Patient">
          <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            {s.patients.map((p) => <option key={p.id} value={p.id}>{fullName(p)} · {p.code}</option>)}
          </Select>
        </Field>
        <Field label="Ward">
          <Select value={wardId} onChange={(e) => { setWardId(e.target.value); setDirectBed(""); }}>
            {s.wards.map((w) => <option key={w.id} value={w.id}>{w.name} · {w.type}</option>)}
          </Select>
        </Field>
        <Field label="Reason for admission *"><TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Chest pain observation" /></Field>
        <Field label="Assign bed now (optional)">
          <Select value={directBed} onChange={(e) => setDirectBed(e.target.value)}>
            <option value="">Leave pending</option>
            {freeInWard.map((b) => <option key={b.id} value={b.id}>{b.label} · {fmtMoney0(b.rate)}/night</option>)}
          </Select>
        </Field>
      </div>
      <div className="mt-3.5">
        <Field label="Initial treatment plan"><TextArea rows={3} value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Orders, monitoring, reviews…" /></Field>
      </div>
    </Modal>
  );
}

function BedDrawer({ bed, onClose }: { bed: Bed; onClose: () => void }) {
  const { s, setBedStatus, addProgressNote, go } = useApp();
  const role = s.session?.role ?? "admin";
  const [note, setNote] = useState("");
  const [showDischarge, setShowDischarge] = useState(false);
  const canManage = role !== "patient";

  const admission = bed.admissionId ? s.admissions.find((a) => a.id === bed.admissionId) : undefined;
  const patient = bed.patientId ? s.patients.find((p) => p.id === bed.patientId) : undefined;
  const ward = s.wards.find((w) => w.id === bed.wardId);
  const meta = BED_META[bed.status];

  return (
    <Drawer open onClose={onClose} width={430}>
      <div className={`px-5 py-4 border-b border-line ${bed.status === "occupied" ? "bg-pine-900 text-white" : "bg-card"}`}>
        <div className="flex items-center gap-3">
          <span className={`w-12 h-12 rounded-xl grid place-items-center font-display font-extrabold text-lg ${bed.status === "occupied" ? "bg-white/10 text-brand-200" : "bg-brand-100 text-brand-700"}`}>
            {bed.label.split("-")[1]}
          </span>
          <div>
            <p className={`micro ${bed.status === "occupied" ? "text-brand-400" : "text-brand-700"}`}>{ward?.name} · {bed.type}</p>
            <h2 className={`font-display font-extrabold text-lg leading-tight ${bed.status === "occupied" ? "text-white" : "text-ink"}`}>Bed {bed.label}</h2>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Pill tone={meta.tone}>{meta.label}</Pill>
            <button onClick={onClose} className={`p-1.5 rounded-md transition-colors ${bed.status === "occupied" ? "text-pine-100/70 hover:text-white hover:bg-white/10" : "text-ink-faint hover:text-ink hover:bg-line-soft"}`} aria-label="Close">
              <I name="x" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {patient && admission ? (
          <>
            <div className="flex items-center gap-3 bg-card border border-line rounded-xl px-3.5 py-3">
              <Avatar name={fullName(patient)} color={patient.color} size={40} />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">{fullName(patient)}</p>
                <p className="text-[11.5px] text-ink-faint">{patient.code} · {ageOf(patient.dob)} yrs · {admission.code}</p>
              </div>
              <Btn size="sm" variant="ghost" icon="eye" className="ml-auto" onClick={() => { go("patients", patient.id); onClose(); }}>Chart</Btn>
            </div>

            <Card title="Admission" sub={admission.reason} pad={false}>
              <div className="p-3.5 pt-0 space-y-2">
                <p className="text-[12.5px] text-ink-soft leading-relaxed"><span className="font-semibold text-ink">Plan:</span> {admission.plan}</p>
                <div>
                  <p className="micro text-ink-faint mb-1.5">Progress notes</p>
                  <ul className="space-y-1.5">
                    {admission.notes.map((n, i) => (
                      <li key={i} className="bg-paper rounded-lg px-3 py-2">
                        <p className="text-[12px] text-ink leading-snug">{n.text}</p>
                        <p className="micro text-ink-faint mt-1">{n.by} · {new Date(n.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                {canManage && (
                  <div className="flex gap-1.5">
                    <TextInput placeholder="Add a progress note…" value={note} onChange={(e) => setNote(e.target.value)} />
                    <Btn size="sm" variant="outline" icon="plus" disabled={!note.trim()} onClick={() => { addProgressNote(admission.id, note.trim()); setNote(""); }} className="shrink-0">Add</Btn>
                  </div>
                )}
              </div>
            </Card>

            {canManage && (role !== "nurse" ? true : false) && (
              <Btn variant="danger" icon="logout" className="w-full" onClick={() => setShowDischarge(true)}>Discharge patient</Btn>
            )}
          </>
        ) : (
          <>
            <div className="bg-card border border-line rounded-xl p-4">
              <p className="micro text-ink-faint mb-2">Bed details</p>
              <p className="text-[13px] text-ink-soft">Rate <span className="font-mono font-semibold text-ink">{fmtMoney(bed.rate)}</span> / night · {bed.type} bed in {ward?.name} (floor {ward?.floor}).</p>
            </div>
            {canManage && bed.status === "cleaning" && (
              <Btn icon="check" className="w-full" onClick={() => { setBedStatus(bed.id, "available"); onClose(); }}>Mark cleaned & available</Btn>
            )}
            {canManage && bed.status === "available" && (
              <Btn variant="outline" icon="alert" className="w-full" onClick={() => { setBedStatus(bed.id, "maintenance"); onClose(); }}>Flag for maintenance</Btn>
            )}
            {canManage && bed.status === "maintenance" && (
              <Btn icon="check" className="w-full" onClick={() => { setBedStatus(bed.id, "available"); onClose(); }}>Maintenance resolved</Btn>
            )}
          </>
        )}
      </div>

      {admission && showDischarge && <DischargeModal admission={admission} onClose={() => setShowDischarge(false)} />}
    </Drawer>
  );
}

export function Wards() {
  const { s, assignBed } = useApp();
  const [wardId, setWardId] = useState("w1");
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [assignFor, setAssignFor] = useState<Admission | null>(null);
  const [showNew, setShowNew] = useState(false);
  const role = s.session?.role ?? "admin";

  const ward = s.wards.find((w) => w.id === wardId)!;
  const beds = s.beds.filter((b) => b.wardId === wardId);
  const occupied = beds.filter((b) => b.status === "occupied").length;
  const pending = s.admissions.filter((a) => a.status === "pending");
  const active = s.admissions.filter((a) => a.status === "active");
  const quickFree = s.beds.filter((b) => b.status === "available").slice(0, 6);

  const selectedLive = selectedBed ? s.beds.find((b) => b.id === selectedBed.id) ?? null : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="micro text-brand-700">Inpatient</p>
          <h1 className="font-display font-extrabold text-[22px] tracking-tight text-ink">Wards & bed management</h1>
        </div>
        {role !== "patient" && (
          <div className="ml-auto"><Btn icon="plus" onClick={() => setShowNew(true)}>New admission</Btn></div>
        )}
      </div>

      {pending.length > 0 && (
        <div className="fade-up bg-warn-50 border border-warn-600/25 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
          <I name="alert" className="w-5 h-5 text-warn-600" />
          <p className="text-[13px] font-semibold text-warn-700">{pending.length} admission(s) awaiting bed assignment:</p>
          {pending.map((a) => {
            const p = s.patients.find((x) => x.id === a.patientId);
            return (
              <span key={a.id} className="flex items-center gap-2 bg-white border border-warn-600/20 rounded-lg pl-2 pr-1 py-1">
                <span className="text-[12px] font-medium text-ink">{p ? fullName(p) : "—"}</span>
                <Btn size="sm" variant="warn" onClick={() => setAssignFor(a)}>Assign bed</Btn>
              </span>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {s.wards.map((w) => {
          const wb = s.beds.filter((b) => b.wardId === w.id);
          const occ = wb.filter((b) => b.status === "occupied").length;
          return (
            <button key={w.id} onClick={() => setWardId(w.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${wardId === w.id ? "bg-pine-900 text-brand-200 border-pine-900" : "bg-white border-line text-ink-soft hover:border-brand-500"}`}>
              {w.name} <span className="font-mono opacity-70 ml-1">{occ}/{wb.length}</span>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <Card className="lg:col-span-2" pad={false}
          title={`${ward.name} — floor ${ward.floor}`}
          sub={`${occupied}/${beds.length} occupied · ${ward.type}`}
          action={
            <div className="flex gap-2">
              {(["available", "occupied", "cleaning", "maintenance"] as const).map((st) => (
                <span key={st} className="flex items-center gap-1 text-[10.5px] text-ink-faint">
                  <span className={`w-2 h-2 rounded-full ${{ available: "bg-brand-500", occupied: "bg-pine-700", cleaning: "bg-warn-600", maintenance: "bg-danger-600" }[st]}`} />{st}
                </span>
              ))}
            </div>
          }>
          <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {beds.map((b, i) => {
              const p = b.patientId ? s.patients.find((x) => x.id === b.patientId) : undefined;
              return (
                <button key={b.id} onClick={() => setSelectedBed(b)}
                  className={`fade-up relative rounded-xl border-2 px-2 py-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${BED_STYLE[b.status]}`}
                  style={{ animationDelay: `${i * 30}ms` }}>
                  <p className={`font-display font-extrabold text-[15px] ${b.status === "occupied" ? "text-white" : "text-ink"}`}>{b.label}</p>
                  <p className={`text-[10px] font-mono mt-0.5 ${b.status === "occupied" ? "text-pine-100/60" : "text-ink-faint"}`}>{fmtMoney0(b.rate)}/n · {b.type.split(" ")[0]}</p>
                  {p && (
                    <span className="mt-1.5 flex items-center gap-1">
                      <Avatar name={fullName(p)} color={p.color} size={18} className="!ring-0" />
                      <span className="text-[10.5px] font-semibold text-brand-200 truncate">{p.firstName} {p.lastName[0]}.</span>
                    </span>
                  )}
                  {b.status === "cleaning" && <I name="refresh" className="w-3.5 h-3.5 absolute top-2 right-2 text-warn-600" />}
                  {b.status === "maintenance" && <I name="alert" className="w-3.5 h-3.5 absolute top-2 right-2 text-danger-600" />}
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Active inpatients" sub={`${active.length} admitted`} pad={false}>
            <ul>
              {active.map((a) => {
                const p = s.patients.find((x) => x.id === a.patientId);
                const bed = s.beds.find((b) => b.id === a.bedId);
                const nights = Math.max(1, -a.admittedOffset);
                return (
                  <li key={a.id} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-line-soft last:border-0 hover:bg-brand-50/60 transition-colors">
                    {p && <Avatar name={fullName(p)} color={p.color} size={30} />}
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-ink truncate">{p ? fullName(p) : "—"}</p>
                      <p className="text-[10.5px] text-ink-faint truncate">{a.reason}</p>
                    </div>
                    <div className="ml-auto text-right shrink-0">
                      <p className="font-mono text-[11px] font-bold text-ink">{bed?.label}</p>
                      <p className="micro text-ink-faint">day {nights}</p>
                    </div>
                  </li>
                );
              })}
              {active.length === 0 && <EmptyState icon="bed" title="No active admissions" />}
            </ul>
          </Card>

          <Card title="Fast assign" sub="first available beds" pad={false}>
            <ul className="p-2 grid grid-cols-2 gap-1.5">
              {quickFree.map((b) => (
                <li key={b.id}>
                  <button onClick={() => setSelectedBed(b)} className="w-full text-left bg-brand-50 border border-brand-500/25 rounded-lg px-2.5 py-2 hover:border-brand-500 transition-colors">
                    <p className="font-display font-bold text-[13px] text-ink">{b.label}</p>
                    <p className="micro text-ink-faint">{s.wards.find((w) => w.id === b.wardId)?.name}</p>
                  </button>
                </li>
              ))}
              {quickFree.length === 0 && <p className="col-span-2 text-[11.5px] text-ink-faint text-center py-3">No free beds right now.</p>}
            </ul>
          </Card>
        </div>
      </div>

      {selectedLive && <BedDrawer bed={selectedLive} onClose={() => setSelectedBed(null)} />}
      {assignFor && <AssignBedModal admission={assignFor} onClose={() => setAssignFor(null)} />}
      <NewAdmissionModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

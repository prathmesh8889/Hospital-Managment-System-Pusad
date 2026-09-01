import { useEffect, useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { SLOT_TIMES, dayLabel, deptName, fmtMoney0, fullName } from "../lib/data";
import type { ApptStatus } from "../lib/data";
import { Avatar, Btn, Card, EmptyState, Field, Modal, Pill, Select, TextInput, APPT_META } from "../components/ui";
import { I } from "../components/icons";

function BookModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, bookAppointment, toast } = useApp();
  const role = s.session?.role ?? "admin";
  const [patientId, setPatientId] = useState(s.bookPatientId ?? s.patients[0]?.id ?? "");
  const [doctorId, setDoctorId] = useState(s.doctors[0]?.id ?? "");
  const [dayOffset, setDayOffset] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [type, setType] = useState<"OPD Consultation" | "Follow-up" | "Procedure" | "Telehealth">("OPD Consultation");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open && s.bookPatientId) setPatientId(s.bookPatientId);
    if (open) { setTime(null); setReason(""); }
  }, [open, s.bookPatientId]);

  const taken = useMemo(
    () => new Set(s.appointments.filter((a) => a.doctorId === doctorId && a.dayOffset === dayOffset && !["cancelled", "no-show"].includes(a.status)).map((a) => a.time)),
    [s.appointments, doctorId, dayOffset]
  );

  const submit = () => {
    if (!time) { toast("error", "Pick a time slot", "Choose an available slot from the calendar grid."); return; }
    if (!reason.trim()) { toast("error", "Reason required", "Add a short reason for the visit."); return; }
    bookAppointment({ patientId, doctorId, dayOffset, time, type, reason: reason.trim() });
    toast("success", "Appointment booked", `${dayLabel(dayOffset)} at ${time} — confirmation sent to patient.`);
    onClose();
  };

  const doctor = s.doctors.find((d) => d.id === doctorId);
  const patients = role === "patient" ? s.patients.filter((p) => p.id === "p1") : s.patients;

  return (
    <Modal open={open} onClose={onClose} title="Book appointment" sub="Real-time availability from the doctor's calendar" wide
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn icon="check" onClick={submit}>Confirm booking</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3.5">
        <Field label="Patient">
          <Select value={patientId} onChange={(e) => setPatientId(e.target.value)} disabled={role === "patient"}>
            {patients.map((p) => <option key={p.id} value={p.id}>{fullName(p)} · {p.code}</option>)}
          </Select>
        </Field>
        <Field label="Doctor">
          <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            {s.doctors.filter((d) => d.fee > 0).map((d) => <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>)}
          </Select>
        </Field>
        <Field label="Visit type">
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option>OPD Consultation</option><option>Follow-up</option><option>Procedure</option><option>Telehealth</option>
          </Select>
        </Field>
        <Field label="Reason for visit">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. persistent cough" />
        </Field>
      </div>

      <div className="mt-4">
        <p className="micro text-ink-soft mb-1.5">Day</p>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((o) => (
            <button key={o} onClick={() => { setDayOffset(o); setTime(null); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${dayOffset === o ? "bg-pine-900 text-brand-200 border-pine-900" : "bg-white border-line text-ink-soft hover:border-brand-500"}`}>
              {dayLabel(o)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="micro text-ink-soft">Available slots · {doctor?.name}</p>
          <p className="text-[11px] text-ink-faint">{doctor?.specialization} · fee {fmtMoney0(doctor?.fee ?? 0)}</p>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
          {SLOT_TIMES.map((t) => {
            const busy = taken.has(t);
            return (
              <button key={t} disabled={busy} onClick={() => setTime(t)}
                className={`py-1.5 rounded-md font-mono text-[11.5px] font-semibold border transition-all duration-100 ${
                  time === t ? "bg-brand-600 text-white border-brand-600 scale-[1.04]" :
                  busy ? "bg-line-soft text-ink-faint/60 border-line-soft line-through cursor-not-allowed" :
                  "bg-white border-line text-ink hover:border-brand-500 hover:text-brand-700"
                }`}>
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

export function Appointments() {
  const { s, checkIn, cancelAppointment, setBookPatient } = useApp();
  const role = s.session?.role ?? "admin";
  const [day, setDay] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ApptStatus | "all">("all");
  const [showBook, setShowBook] = useState(false);

  const isPatient = role === "patient";
  const base = useMemo(
    () => s.appointments.filter((a) => a.dayOffset === day && (!isPatient || a.patientId === "p1")),
    [s.appointments, day, isPatient]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: base.length };
    base.forEach((a) => { c[a.status] = (c[a.status] ?? 0) + 1; });
    return c;
  }, [base]);

  const list = useMemo(
    () => base.filter((a) => statusFilter === "all" || a.status === statusFilter).sort((a, b) => a.time.localeCompare(b.time)),
    [base, statusFilter]
  );

  const filters: (ApptStatus | "all")[] = ["all", "scheduled", "checked-in", "in-consultation", "completed", "cancelled"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="micro text-brand-700">Scheduling desk</p>
          <h1 className="font-display font-extrabold text-[22px] tracking-tight text-ink">Appointments</h1>
        </div>
        <div className="ml-auto">
          <Btn icon="plus" onClick={() => { setBookPatient(null); setShowBook(true); }}>
            {isPatient ? "Book a visit" : "Book appointment"}
          </Btn>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {[-1, 0, 1].map((o) => (
            <button key={o} onClick={() => { setDay(o); setStatusFilter("all"); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${day === o ? "bg-pine-900 text-brand-200 border-pine-900" : "bg-white border-line text-ink-soft hover:border-brand-500"}`}>
              {dayLabel(o)}
            </button>
          ))}
        </div>
        <div className="h-5 w-px bg-line mx-1" />
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-colors capitalize ${statusFilter === f ? "bg-brand-600 text-white" : "bg-white border border-line text-ink-soft hover:border-brand-500"}`}>
              {f === "all" ? "All" : APPT_META[f].label} <span className="font-mono opacity-70">{counts[f] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <Card pad={false} title={dayLabel(day)} sub={`${list.length} appointment(s)`}>
        {list.length === 0 ? (
          <EmptyState icon="calendar" title={`Nothing ${dayLabel(day).toLowerCase()}`} desc="Adjust the filters or book a new appointment." />
        ) : (
          <ul>
            {list.map((a, idx) => {
              const p = s.patients.find((x) => x.id === a.patientId);
              const d = s.doctors.find((x) => x.id === a.doctorId);
              const meta = APPT_META[a.status];
              const canCheckIn = a.status === "scheduled" && day === 0 && !isPatient;
              const canCancel = a.status === "scheduled" && !isPatient;
              return (
                <li key={a.id} className="fade-up flex items-center gap-3 px-4 py-3 border-b border-line-soft last:border-0 hover:bg-brand-50/60 transition-colors" style={{ animationDelay: `${Math.min(idx, 12) * 35}ms` }}>
                  <div className="w-[52px] shrink-0 text-center">
                    <p className="font-mono font-semibold text-[15px] text-ink tabular-nums">{a.time}</p>
                    {a.token && <p className="token-notch inline-block bg-pine-900 text-brand-200 font-mono text-[9.5px] px-1.5 py-px rounded mt-0.5">Q-{a.token}</p>}
                  </div>
                  <div className="w-px h-9 bg-line" />
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {p && <Avatar name={fullName(p)} color={p.color} size={34} />}
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-ink truncate">{p ? fullName(p) : "—"} <span className="font-mono text-[10.5px] text-ink-faint ml-1">{p?.code}</span></p>
                      <p className="text-[11.5px] text-ink-soft truncate">{a.reason}</p>
                    </div>
                  </div>
                  <div className="hidden md:block text-right min-w-[150px]">
                    <p className="text-[12.5px] font-medium text-ink">{d?.name}</p>
                    <p className="text-[11px] text-ink-faint">{d ? deptName(d.departmentId) : ""} · {a.type}</p>
                  </div>
                  <Pill tone={meta.tone}>{meta.label}</Pill>
                  <div className="flex gap-1.5 shrink-0">
                    {canCheckIn && <Btn size="sm" variant="dark" icon="check" onClick={() => checkIn(a.id)}>Check-in</Btn>}
                    {canCancel && (
                      <Btn size="sm" variant="ghost" onClick={() => cancelAppointment(a.id)} title="Cancel appointment">
                        <I name="x" className="w-3.5 h-3.5" />
                      </Btn>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <BookModal open={showBook} onClose={() => setShowBook(false)} />
    </div>
  );
}

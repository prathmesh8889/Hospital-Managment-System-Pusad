import { useState } from "react";
import { useApp } from "../lib/store";
import { fmtMoney, fullName, timeAgo } from "../lib/data";
import { Avatar, Btn, Card, EmptyState, Pill } from "../components/ui";
import { I } from "../components/icons";
import { RxLetterModal } from "../components/RxLetter";
import { downloadPatientReportPdf, downloadPrescriptionPdf } from "../lib/pdf";

export function Prescriptions() {
  const { s, dispense, hasPermission, toast } = useApp();
  const role = s.session?.role ?? "doctor";
  const [filter, setFilter] = useState<"all" | "sent" | "dispensed">("all");
  const [expanded, setExpanded] = useState<string | null>(s.prescriptions[0]?.id ?? null);
  const [letterId, setLetterId] = useState<string | null>(null);

  const list = s.prescriptions.filter((r) => filter === "all" || r.status === filter);
  const isPharmacist = hasPermission("prescriptions", "edit") && (role === "pharmacist" || role === "admin" || role === "super");
  const canDownload = ["super", "admin", "reception", "doctor", "pharmacist"].includes(role);

  const savePrescription = async (id: string) => {
    try { await downloadPrescriptionPdf(s, id); toast("success", "Prescription downloaded", "Medical prescription saved as PDF."); }
    catch { toast("error", "Download failed", "Could not create the prescription PDF."); }
  };

  const saveReport = async (patientId: string) => {
    try { await downloadPatientReportPdf(s, patientId); toast("success", "Patient report downloaded", "Complete medical report saved as PDF."); }
    catch { toast("error", "Download failed", "Could not create the patient report PDF."); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="micro text-brand-700">e-Prescribing</p>
          <h1 className="font-display font-extrabold text-[22px] tracking-tight text-ink">Prescriptions</h1>
        </div>
        <div className="ml-auto flex gap-1.5">
          {(["all", "sent", "dispensed"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${filter === f ? "bg-pine-900 text-brand-200 border-pine-900" : "bg-white border-line text-ink-soft hover:border-brand-500"}`}>
              {f} <span className="font-mono opacity-70">{f === "all" ? s.prescriptions.length : s.prescriptions.filter((r) => r.status === f).length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {list.length === 0 && <Card><EmptyState icon="pill" title="No prescriptions" desc="Doctors issue prescriptions from the OPD consultation screen." /></Card>}
        {list.map((rx, idx) => {
          const patient = s.patients.find((p) => p.id === rx.patientId);
          const doctor = s.doctors.find((d) => d.id === rx.doctorId);
          const open = expanded === rx.id;
          const total = rx.items.reduce((sum, it) => sum + it.qty * (s.medicines.find((m) => m.id === it.medicineId)?.price ?? 0), 0);
          return (
            <div key={rx.id} className="fade-up bg-card border border-line rounded-xl overflow-hidden hover:border-brand-400/50 transition-colors" style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}>
              <button onClick={() => setExpanded(open ? null : rx.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <span className="w-9 h-9 rounded-lg bg-pine-900 text-brand-200 grid place-items-center shrink-0"><I name="pill" className="w-4 h-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-ink">{rx.code}
                    <span className={`ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-bold ${rx.status === "dispensed" ? "bg-brand-100 text-brand-700" : "bg-warn-100 text-warn-700"}`}>
                      {rx.status === "dispensed" ? "DISPENSED" : "AT PHARMACY"}
                    </span>
                  </p>
                  <p className="text-[11.5px] text-ink-soft truncate">{patient ? fullName(patient) : "—"} · {doctor?.name} · {timeAgo(rx.createdAt)}</p>
                </div>
                {patient && <Avatar name={fullName(patient)} color={patient.color} size={30} className="hidden sm:inline-grid" />}
                <span className="font-mono text-[12.5px] font-semibold text-ink hidden sm:block">{fmtMoney(total)}</span>
                <I name={open ? "chevron-d" : "chevron-r"} className="w-4 h-4 text-ink-faint shrink-0" />
              </button>
              {open && (
                <div className="pop-in border-t border-line-soft px-4 py-3 bg-paper/50">
                  <div className="overflow-x-auto scroll-slim -mx-1 px-1">
                  <table className="w-full text-[12.5px] min-w-[430px]">
                    <thead>
                      <tr className="micro text-ink-faint text-left">
                        <th className="pb-2 font-medium">Medicine</th>
                        <th className="pb-2 font-medium">Dosage</th>
                        <th className="pb-2 font-medium">Frequency</th>
                        <th className="pb-2 font-medium">Duration</th>
                        <th className="pb-2 font-medium text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rx.items.map((it, i) => {
                        const m = s.medicines.find((x) => x.id === it.medicineId);
                        return (
                          <tr key={i} className="border-t border-line-soft">
                            <td className="py-2 font-semibold text-ink">{m?.name}<span className="block text-[10px] font-normal text-ink-faint font-mono">{m?.generic}</span></td>
                            <td className="py-2 text-ink-soft">{it.dosage}</td>
                            <td className="py-2 text-ink-soft">{it.frequency}</td>
                            <td className="py-2 text-ink-soft">{it.duration}</td>
                            <td className="py-2 text-right font-mono font-semibold">{it.qty}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                  {rx.notes && <p className="text-[11.5px] text-ink-soft mt-2 italic">“{rx.notes}”</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    {rx.status === "sent" && !isPharmacist && <Pill tone="amber">awaiting pharmacy</Pill>}
                    {rx.status === "dispensed" && <Pill tone="green">completed</Pill>}
                    <div className="ml-auto flex flex-wrap gap-2">
                      <Btn size="sm" variant="outline" icon="share" onClick={() => setLetterId(rx.id)}>Share</Btn>
                      <Btn size="sm" variant="dark" icon="eye" onClick={() => setLetterId(rx.id)}>Preview</Btn>
                      {canDownload && <Btn size="sm" variant="outline" icon="download" onClick={() => saveReport(rx.patientId)}>Patient report</Btn>}
                      {canDownload && <Btn size="sm" icon="download" onClick={() => savePrescription(rx.id)}>Prescription PDF</Btn>}
                      {rx.status === "sent" && isPharmacist && (
                        <Btn size="sm" icon="check" onClick={() => dispense(rx.id)}>Dispense now</Btn>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {letterId && (() => {
        const rx = s.prescriptions.find((r) => r.id === letterId);
        return rx ? <RxLetterModal rx={rx} onClose={() => setLetterId(null)} /> : null;
      })()}
    </div>
  );
}

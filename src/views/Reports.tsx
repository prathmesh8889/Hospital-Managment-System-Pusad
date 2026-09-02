import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { DX_STATS, OPD_7D, OPD_7D_LABELS, REVENUE_14D, REVENUE_BY_DEPT, billTotals, fmtDate, fmtMoney, fmtMoney0, fullName, timeAgo } from "../lib/data";
import { Bars, Btn, Card, Donut, Pill, Sparkline, Tabs, TextInput } from "../components/ui";
import { I } from "../components/icons";
import { downloadBillPdf, downloadPrescriptionPdf } from "../lib/pdf";
import { downloadHealthReportPdf, downloadMedicalReportPdf, downloadPrescriptionBillPdf, downloadServiceReportPdf } from "../lib/patientReports";

export function Reports() {
  const { s, toast, hasPermission } = useApp();
  const role = s.session?.role ?? "admin";
  const canPatientReports = ["super", "admin", "doctor"].includes(role);
  const [tab, setTab] = useState(canPatientReports ? "patient" : "ops");
  const [auditQ, setAuditQ] = useState("");
  const [patientQ, setPatientQ] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string>(s.patients[0]?.id ?? "");

  const occupied = s.beds.filter((b) => b.status === "occupied").length;
  const occPct = (occupied / s.beds.length) * 100;
  const outstanding = s.bills.reduce((x, b) => x + billTotals(b).balance, 0);
  const avgWait = 26;
  const noShow = 4.2;

  const exportReport = (name: string) => {
    toast("success", `${name} exported`, "CSV delivered to your secure mailbox.");
  };

  const audit = s.audit.filter((e) =>
    !auditQ.trim() || `${e.user} ${e.action} ${e.entity}`.toLowerCase().includes(auditQ.toLowerCase())
  );

  const showAudit = role === "super" || role === "admin";
  const patientResults = useMemo(() => {
    const q = patientQ.trim().toLowerCase();
    if (!q) return s.patients.slice(0, 8);
    return s.patients.filter((p) => `${p.firstName} ${p.lastName} ${p.code} ${p.phone}`.toLowerCase().includes(q)).slice(0, 8);
  }, [patientQ, s.patients]);
  const selectedPatient = s.patients.find((p) => p.id === selectedPatientId) ?? s.patients[0];
  const patientPrescriptions = selectedPatient ? s.prescriptions.filter((rx) => rx.patientId === selectedPatient.id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)) : [];
  const patientBills = selectedPatient ? s.bills.filter((bill) => bill.patientId === selectedPatient.id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)) : [];

  const download = async (label: string, action: () => Promise<void>) => {
    try {
      await action();
      toast("success", `${label} downloaded`, "A separate PDF was generated for this report type.");
    } catch {
      toast("error", `${label} download failed`, "Please try again from Patient Reports.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="micro text-brand-700">Insight</p>
          <h1 className="font-display font-extrabold text-[22px] tracking-tight text-ink">Reports & analytics</h1>
        </div>
        {hasPermission("reports", "edit") && tab !== "patient" && <div className="ml-auto">
          <Btn variant="outline" icon="download" onClick={() => exportReport(tab === "ops" ? "Operational report" : tab === "fin" ? "Financial report" : tab === "clin" ? "Clinical report" : "Audit log")}>
            Export view
          </Btn>
        </div>}
      </div>

      <Tabs
        tabs={[
          ...(canPatientReports ? [{ id: "patient", label: "Patient Reports" }] : []),
          { id: "ops", label: "Operational" },
          { id: "fin", label: "Financial" },
          { id: "clin", label: "Clinical" },
          ...(showAudit ? [{ id: "audit", label: "Audit trail", count: s.audit.length }] : []),
        ]}
        active={tab} onChange={setTab}
      />

      {tab === "patient" && canPatientReports && (
        <div className="space-y-4">
          <Card title="Select patient" sub="Doctor reports are separated by document type. Billing is never mixed into the medical or health report.">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 items-start">
              <div>
                <div className="relative">
                  <I name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                  <TextInput value={patientQ} onChange={(e) => setPatientQ(e.target.value)} placeholder="Search patient name, ID or phone…" className="!pl-9" />
                </div>
                <div className="mt-2 border border-line rounded-lg overflow-hidden max-h-[245px] overflow-y-auto scroll-slim">
                  {patientResults.map((p) => (
                    <button key={p.id} onClick={() => { setSelectedPatientId(p.id); setPatientQ(""); }}
                      className={`w-full px-3 py-2.5 text-left flex items-center gap-2.5 border-b border-line-soft last:border-0 transition-colors ${selectedPatient?.id === p.id ? "bg-brand-50" : "bg-white hover:bg-brand-50/60"}`}>
                      <span className="w-8 h-8 rounded-full grid place-items-center bg-pine-900 text-brand-200 text-[11px] font-bold shrink-0">{p.firstName[0]}{p.lastName[0]}</span>
                      <span className="min-w-0">
                        <span className="block text-[12.5px] font-semibold text-ink truncate">{fullName(p)}</span>
                        <span className="block font-mono text-[10.5px] text-ink-faint">{p.code} · {p.phone}</span>
                      </span>
                    </button>
                  ))}
                  {patientResults.length === 0 && <p className="text-xs text-ink-faint text-center py-5">No patient matches your search.</p>}
                </div>
              </div>

              {selectedPatient && (
                <div className="rounded-xl border border-line bg-paper p-4">
                  <p className="micro text-brand-700">Selected patient</p>
                  <div className="flex items-start gap-3 mt-1">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-extrabold text-[18px] text-ink">{fullName(selectedPatient)}</h3>
                      <p className="font-mono text-[11px] text-ink-faint mt-0.5">{selectedPatient.code} · Blood {selectedPatient.blood} · {selectedPatient.phone}</p>
                    </div>
                    <Pill tone={selectedPatient.allergies.length ? "red" : "green"}>{selectedPatient.allergies.length ? `${selectedPatient.allergies.length} allergy flag(s)` : "No allergy flag"}</Pill>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2 mt-4">
                    <div className="bg-white border border-line-soft rounded-lg p-2.5"><p className="micro text-ink-faint">Prescriptions</p><p className="font-display font-extrabold text-lg">{patientPrescriptions.length}</p></div>
                    <div className="bg-white border border-line-soft rounded-lg p-2.5"><p className="micro text-ink-faint">Invoices</p><p className="font-display font-extrabold text-lg">{patientBills.length}</p></div>
                    <div className="bg-white border border-line-soft rounded-lg p-2.5"><p className="micro text-ink-faint">Consultations</p><p className="font-display font-extrabold text-lg">{s.consultations.filter((c) => c.patientId === selectedPatient.id).length}</p></div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {selectedPatient && (
            <>
              <div className="grid md:grid-cols-3 gap-3">
                <Card title="Medical Report" sub="Doctor notes, diagnoses, prescriptions and diagnostics. No billing data.">
                  <p className="text-[11.5px] text-ink-soft leading-relaxed mb-3">Use this as the patient's separate clinical/medical record.</p>
                  <Btn className="w-full" icon="download" onClick={() => download("Medical report", () => downloadMedicalReportPdf(s, selectedPatient.id))}>Download Medical PDF</Btn>
                </Card>
                <Card title="Health Report" sub="Health status, conditions, allergies, vitals and latest doctor assessment.">
                  <p className="text-[11.5px] text-ink-soft leading-relaxed mb-3">This report intentionally excludes medicine charges and hospital billing.</p>
                  <Btn className="w-full" icon="download" onClick={() => download("Health report", () => downloadHealthReportPdf(s, selectedPatient.id))}>Download Health PDF</Btn>
                </Card>
                <Card title="Service Report" sub="Consultation, lab, imaging and ward/admission services only.">
                  <p className="text-[11.5px] text-ink-soft leading-relaxed mb-3">A separate service history without invoice totals or payment details.</p>
                  <Btn className="w-full" icon="download" onClick={() => download("Service report", () => downloadServiceReportPdf(s, selectedPatient.id))}>Download Service PDF</Btn>
                </Card>
              </div>

              <Card title="Prescriptions" sub="Prescription PDF and prescription medicine bill are separate documents." pad={false}>
                {patientPrescriptions.length === 0 ? <p className="text-xs text-ink-faint text-center py-6">No prescriptions for this patient.</p> : (
                  <div className="divide-y divide-line-soft">
                    {patientPrescriptions.map((rx) => {
                      const doctor = s.doctors.find((d) => d.id === rx.doctorId);
                      const medicineTotal = rx.items.reduce((sum, item) => {
                        const med = s.medicines.find((m) => m.id === item.medicineId);
                        return sum + (med?.price ?? 0) * item.qty;
                      }, 0);
                      return (
                        <div key={rx.id} className="px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-ink">{rx.code} <span className="font-mono text-[10.5px] text-ink-faint ml-1">{fmtDate(rx.createdAt)}</span></p>
                            <p className="text-[11.5px] text-ink-soft truncate">{doctor?.name ?? "Doctor"} · {rx.items.length} medicine(s) · {rx.status}</p>
                          </div>
                          <div className="text-left lg:text-right shrink-0">
                            <p className="micro text-ink-faint">Medicine value</p>
                            <p className="font-mono font-semibold text-[12.5px] text-ink">{fmtMoney0(medicineTotal)}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <Btn size="sm" variant="outline" icon="download" onClick={() => download("Prescription", () => downloadPrescriptionPdf(s, rx.id))}>Prescription PDF</Btn>
                            <Btn size="sm" variant="dark" icon="receipt" onClick={() => download("Prescription bill", () => downloadPrescriptionBillPdf(s, rx.id))}>Prescription Bill</Btn>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card title="Hospital Bills" sub="Each invoice / payment receipt downloads separately from all medical reports." pad={false}>
                {patientBills.length === 0 ? <p className="text-xs text-ink-faint text-center py-6">No hospital invoices for this patient.</p> : (
                  <div className="divide-y divide-line-soft">
                    {patientBills.map((bill) => {
                      const totals = billTotals(bill);
                      return (
                        <div key={bill.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                          <I name="receipt" className="w-5 h-5 text-brand-700 shrink-0 hidden sm:block" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-ink">{bill.code} <span className="font-mono text-[10.5px] text-ink-faint ml-1">{fmtDate(bill.createdAt)}</span></p>
                            <p className="text-[11.5px] text-ink-soft">{bill.items.length} service/item(s) · paid {fmtMoney(totals.paid)} · balance {fmtMoney(totals.balance)}</p>
                          </div>
                          <p className="font-mono font-bold text-[13px] text-ink shrink-0">{fmtMoney(totals.total)}</p>
                          <Btn size="sm" icon="download" onClick={() => download("Bill", () => downloadBillPdf(s, bill.id))}>Download Bill PDF</Btn>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {tab === "ops" && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card title="OPD visits · 7 days" sub="all departments" className="lg:col-span-2">
            <Bars data={OPD_7D} labels={OPD_7D_LABELS} h={150} />
          </Card>
          <Card title="Bed occupancy" sub="live census">
            <div className="flex flex-col items-center gap-2 py-2">
              <Donut pct={occPct} size={140} sub="occupied" />
              <p className="text-[11.5px] text-ink-soft">{occupied} of {s.beds.length} beds in use</p>
            </div>
          </Card>
          <Card title="Wait & flow metrics" sub="rolling 24h">
            <ul className="space-y-3">
              {[
                { k: "Average waiting time", v: `${avgWait} min`, pct: 52, tone: "bg-warn-600" },
                { k: "Consultation turnaround", v: "38 min", pct: 64, tone: "bg-brand-500" },
                { k: "Lab report TAT", v: "4.2 h", pct: 42, tone: "bg-steel-600" },
                { k: "No-show rate", v: `${noShow}%`, pct: 12, tone: "bg-danger-600" },
              ].map((x) => (
                <li key={x.k}>
                  <div className="flex justify-between text-[12.5px] mb-1">
                    <span className="text-ink-soft">{x.k}</span>
                    <span className="font-mono font-bold text-ink">{x.v}</span>
                  </div>
                  <div className="h-2 rounded-full bg-line-soft overflow-hidden">
                    <div className={`h-full rounded-full ${x.tone} transition-all duration-700`} style={{ width: `${x.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Staff on duty" sub="current shift" className="lg:col-span-2" pad={false}>
            <ul className="grid sm:grid-cols-2">
              {s.staff.map((st) => (
                <li key={st.id} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line-soft">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${st.status === "on-duty" ? "bg-brand-500 pulse-live" : st.status === "on-leave" ? "bg-warn-600" : "bg-ink-faint"}`} />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-ink truncate">{st.name}</p>
                    <p className="text-[10.5px] text-ink-faint">{st.role} · {st.dept} · {st.shift}</p>
                  </div>
                  <span className={`ml-auto micro ${st.status === "on-duty" ? "text-brand-700" : "text-ink-faint"}`}>{st.status}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === "fin" && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card title="Collections · 14 days" sub="daily revenue trend" className="lg:col-span-2">
            <div className="flex items-end justify-between mb-2">
              <p className="font-display font-extrabold text-2xl tabular-nums">{fmtMoney0(REVENUE_14D.reduce((a, b) => a + b, 0))}</p>
              <Pill tone="green">▲ 12.4% WoW</Pill>
            </div>
            <Sparkline data={REVENUE_14D} h={110} />
          </Card>
          <Card title="Receivables" sub="money on the table">
            <ul className="space-y-2.5">
              <li className="flex justify-between text-[13px]"><span className="text-ink-soft">Outstanding balance</span><span className="font-mono font-bold text-danger-600">{fmtMoney(outstanding)}</span></li>
              <li className="flex justify-between text-[13px]"><span className="text-ink-soft">Claims pending</span><span className="font-mono font-bold text-warn-700">{s.bills.filter((b) => b.claimStatus === "pending").length}</span></li>
              <li className="flex justify-between text-[13px]"><span className="text-ink-soft">Pharmacy share</span><span className="font-mono font-bold text-ink">{fmtMoney0(s.bills.reduce((x, b) => x + b.items.filter((i) => i.kind === "medicine").reduce((y, i) => y + i.qty * i.price, 0), 0))}</span></li>
              <li className="flex justify-between text-[13px]"><span className="text-ink-soft">Lab share</span><span className="font-mono font-bold text-ink">{fmtMoney0(s.bills.reduce((x, b) => x + b.items.filter((i) => i.kind === "lab").reduce((y, i) => y + i.qty * i.price, 0), 0))}</span></li>
            </ul>
          </Card>
          <Card title="Revenue by department" sub="current month" className="lg:col-span-3">
            <div className="space-y-2.5">
              {REVENUE_BY_DEPT.map((d) => (
                <div key={d.dept} className="flex items-center gap-3">
                  <span className="w-[150px] text-[12.5px] text-ink-soft shrink-0">{d.dept}</span>
                  <div className="flex-1 h-5 rounded-md bg-line-soft overflow-hidden">
                    <div className="h-full rounded-md bg-gradient-to-r from-pine-700 to-brand-500 transition-all duration-700 flex items-center justify-end pr-2"
                      style={{ width: `${(d.value / REVENUE_BY_DEPT[0].value) * 100}%` }}>
                      <span className="font-mono text-[10px] font-bold text-white">{fmtMoney0(d.value)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "clin" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Top diagnoses · this month" sub="ICD-10 coded encounters" pad={false}>
            <ul>
              {DX_STATS.map((d, i) => (
                <li key={d.dx} className="flex items-center gap-3 px-4 py-2.5 border-b border-line-soft last:border-0">
                  <span className="w-7 h-7 rounded-md bg-pine-900 text-brand-200 font-mono text-[11px] font-bold grid place-items-center shrink-0">{i + 1}</span>
                  <span className="text-[13px] font-medium text-ink min-w-0 truncate">{d.dx}</span>
                  <div className="ml-auto flex items-center gap-2 shrink-0">
                    <div className="w-24 h-1.5 rounded-full bg-line-soft overflow-hidden hidden sm:block">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${(d.count / DX_STATS[0].count) * 100}%` }} />
                    </div>
                    <span className="font-mono text-[12px] font-bold text-ink w-6 text-right">{d.count}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Diagnostics throughput" sub="lab & imaging pipeline">
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: "Lab orders", v: s.labOrders.length, icon: "flask" },
                { k: "Verified reports", v: s.labOrders.filter((o) => o.status === "verified").length, icon: "shield" },
                { k: "Imaging studies", v: s.imagingOrders.length, icon: "scan" },
                { k: "Reports signed", v: s.imagingOrders.filter((o) => o.status === "reported").length, icon: "check" },
              ].map((x) => (
                <div key={x.k} className="bg-paper border border-line-soft rounded-xl px-3.5 py-3">
                  <I name={x.icon} className="w-4 h-4 text-brand-700" />
                  <p className="font-display font-extrabold text-xl text-ink mt-1.5 tabular-nums">{x.v}</p>
                  <p className="micro text-ink-faint">{x.k}</p>
                </div>
              ))}
            </div>
            <p className="text-[11.5px] text-ink-faint mt-3">Abnormal-first worklists cut verification time by ~30% in pilot wards.</p>
          </Card>
        </div>
      )}

      {tab === "audit" && showAudit && (
        <Card pad={false} title="Audit trail" sub="every sensitive action, immutably logged"
          action={<div className="relative"><I name="search" className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" /><TextInput value={auditQ} onChange={(e) => setAuditQ(e.target.value)} placeholder="Filter…" className="!pl-8 !py-1.5 !text-xs w-[200px]" /></div>}>
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="micro text-ink-faint text-left border-b border-line">
                  <th className="px-4 py-2.5 font-medium">Actor</th>
                  <th className="px-3 py-2.5 font-medium">Action</th>
                  <th className="px-3 py-2.5 font-medium">Entity</th>
                  <th className="px-3 py-2.5 font-medium hidden md:table-cell">IP</th>
                  <th className="px-3 py-2.5 font-medium text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((e) => {
                  const p = s.patients.find((x) => x.id === e.entity);
                  return (
                    <tr key={e.id} className="border-b border-line-soft last:border-0 hover:bg-brand-50/60 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-ink">{e.user}</p>
                        <p className="micro text-ink-faint">{e.role}</p>
                      </td>
                      <td className="px-3 py-2.5 text-ink-soft">{e.action}</td>
                      <td className="px-3 py-2.5 text-ink-soft">{p ? fullName(p) : e.entity}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-ink-faint hidden md:table-cell">{e.ip}</td>
                      <td className="px-3 py-2.5 text-right text-ink-faint whitespace-nowrap">{timeAgo(e.at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {audit.length === 0 && <p className="text-xs text-ink-faint text-center py-6">No events match the filter.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}

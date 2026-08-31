import { useApp } from "../lib/store";
import { billTotals, dayLabel, fmtDate, fmtMoney, fullName } from "../lib/data";
import { Avatar, Btn, Card, ECG, EmptyState, Pill, APPT_META, BILL_META, LAB_META } from "../components/ui";
import { I } from "../components/icons";

export function Portal() {
  const { s, go, setBookPatient, toast } = useApp();
  const me = s.patients.find((p) => p.id === "p1")!;
  const myAppts = s.appointments.filter((a) => a.patientId === me.id && a.dayOffset >= 0 && !["cancelled", "no-show"].includes(a.status)).sort((a, b) => a.dayOffset - b.dayOffset || a.time.localeCompare(b.time));
  const next = myAppts[0];
  const myRx = s.prescriptions.filter((r) => r.patientId === me.id);
  const myLabs = s.labOrders.filter((o) => o.patientId === me.id && o.status === "verified");
  const myBills = s.bills.filter((b) => b.patientId === me.id && b.status !== "paid");
  const nextDoctor = next ? s.doctors.find((d) => d.id === next.doctorId) : undefined;

  return (
    <div className="space-y-4">
      {/* greeting */}
      <div className="fade-up relative overflow-hidden bg-pine-900 pine-tex rounded-xl px-5 py-5 text-white">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={fullName(me)} color={me.color} size={54} />
          <div>
            <p className="micro text-brand-400">Patient portal · {me.code} · blood {me.blood}</p>
            <h1 className="font-display font-extrabold text-[22px] tracking-tight mt-0.5">Hello, {me.firstName} — take care of yourself today.</h1>
            <p className="text-[12.5px] text-pine-100/70 mt-1">
              {me.conditions.join(" · ")}
              {me.allergies.length > 0 && <span className="ml-2 bg-danger-600 text-white text-[10.5px] font-bold px-2 py-0.5 rounded uppercase">⚠ {me.allergies.join(", ")} allergy</span>}
            </p>
          </div>
          <div className="ml-auto text-right">
            {next ? (
              <>
                <p className="micro text-brand-400">Next appointment</p>
                <p className="font-display font-extrabold text-xl">{dayLabel(next.dayOffset)} · {next.time}</p>
                <p className="text-[11.5px] text-pine-100/70">{nextDoctor?.name} · {nextDoctor?.specialization}</p>
              </>
            ) : (
              <Btn icon="calendar" onClick={() => { setBookPatient(me.id); go("appointments"); }}>Book a visit</Btn>
            )}
          </div>
        </div>
        <ECG className="absolute bottom-0 left-0 w-full h-8 opacity-30" />
      </div>

      {myBills.length > 0 && (
        <div className="fade-up flex flex-wrap items-center gap-3 bg-danger-50 border border-danger-600/20 rounded-xl px-4 py-3">
          <I name="receipt" className="w-5 h-5 text-danger-600" />
          <p className="text-[13px] font-semibold text-danger-700">
            You have {myBills.length} outstanding bill(s) totalling {fmtMoney(myBills.reduce((x, b) => x + billTotals(b).balance, 0))}.
          </p>
          <Btn size="sm" variant="danger" className="ml-auto" icon="wallet" onClick={() => go("billing")}>Pay online</Btn>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {/* appointments */}
        <Card title="My appointments" sub="upcoming & recent"
          action={<Btn variant="ghost" size="sm" icon="plus" onClick={() => { setBookPatient(me.id); go("appointments"); }}>Book</Btn>} pad={false}>
          <ul>
            {myAppts.map((a) => {
              const d = s.doctors.find((x) => x.id === a.doctorId);
              const meta = APPT_META[a.status];
              return (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3 border-b border-line-soft last:border-0">
                  <div className="w-11 text-center shrink-0">
                    <p className="font-mono font-bold text-[14px] text-ink">{a.time}</p>
                    <p className="micro text-ink-faint">{dayLabel(a.dayOffset).slice(0, 3)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink truncate">{d?.name}</p>
                    <p className="text-[11px] text-ink-faint truncate">{a.reason}</p>
                  </div>
                  <Pill tone={meta.tone} className="ml-auto">{meta.label}</Pill>
                </li>
              );
            })}
            {myAppts.length === 0 && <EmptyState icon="calendar" title="Nothing scheduled" desc="Book a visit in two clicks." />}
          </ul>
        </Card>

        {/* prescriptions */}
        <Card title="My prescriptions" sub="issued by your doctors" pad={false}>
          <ul>
            {myRx.map((r) => (
              <li key={r.id} className="px-4 py-3 border-b border-line-soft last:border-0">
                <div className="flex items-center gap-2">
                  <I name="pill" className="w-4 h-4 text-brand-600" />
                  <p className="text-[13px] font-semibold text-ink">{r.code}</p>
                  <Pill tone={r.status === "dispensed" ? "green" : "amber"} className="ml-auto">{r.status}</Pill>
                </div>
                <p className="text-[11.5px] text-ink-soft mt-1">{r.items.map((i) => s.medicines.find((m) => m.id === i.medicineId)?.name).join(" · ")}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="micro text-ink-faint">{fmtDate(r.createdAt)}</p>
                  <button onClick={() => toast("success", "Prescription downloaded", `${r.code}.pdf saved to your device.`)}
                    className="flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline">
                    <I name="download" className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </li>
            ))}
            {myRx.length === 0 && <EmptyState icon="pill" title="No prescriptions" />}
          </ul>
        </Card>

        {/* results */}
        <Card title="My test results" sub="verified reports only" pad={false}>
          <ul>
            {myLabs.map((o) => {
              const abnormal = o.analytes.filter((a) => a.result !== undefined && (a.result < a.low || a.result > a.high)).length;
              return (
                <li key={o.id} className="px-4 py-3 border-b border-line-soft last:border-0">
                  <div className="flex items-center gap-2">
                    <I name="flask" className="w-4 h-4 text-steel-600" />
                    <p className="text-[13px] font-semibold text-ink">{o.tests.join(" + ")}</p>
                    <Pill tone={LAB_META[o.status].tone} className="ml-auto">{LAB_META[o.status].label}</Pill>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {o.analytes.slice(0, 4).map((a, i) => {
                      const abn = a.result !== undefined && (a.result < a.low || a.result > a.high);
                      return (
                        <p key={i} className={`font-mono text-[11px] rounded-md px-2 py-1 ${abn ? "bg-danger-50 text-danger-700 font-bold" : "bg-paper text-ink-soft"}`}>
                          {a.name} {a.result ?? "—"}
                        </p>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="micro text-ink-faint">{abnormal > 0 ? `${abnormal} value(s) flagged` : "all in range"}</p>
                    <button onClick={() => toast("success", "Report downloaded", `${o.code}.pdf saved to your device.`)}
                      className="flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline">
                      <I name="download" className="w-3.5 h-3.5" /> PDF
                    </button>
                  </div>
                </li>
              );
            })}
            {myLabs.length === 0 && <EmptyState icon="flask" title="No verified results yet" desc="Reports appear here once your doctor verifies them." />}
          </ul>
        </Card>
      </div>

      {/* bills */}
      <Card title="My bills" sub="balances and receipts" pad={false}
        action={<Btn variant="ghost" size="sm" icon="arrow-r" onClick={() => go("billing")}>All bills</Btn>}>
        {myBills.length === 0 ? (
          <EmptyState icon="check" title="All settled" desc="No outstanding balances. Receipts live under Billing." />
        ) : (
          <ul>
            {myBills.map((b) => {
              const t = billTotals(b);
              return (
                <li key={b.id} className="flex items-center gap-3 px-4 py-3 border-b border-line-soft last:border-0">
                  <I name="receipt" className="w-4 h-4 text-ink-faint" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink">{b.code} <span className="font-mono text-[10.5px] text-ink-faint ml-1">{fmtDate(b.createdAt)}</span></p>
                    <p className="text-[11px] text-ink-soft">{b.items.length} item(s) · paid {fmtMoney(t.paid)}</p>
                  </div>
                  <p className="ml-auto font-mono font-bold text-[13.5px] text-danger-600">{fmtMoney(t.balance)}</p>
                  <Btn size="sm" icon="wallet" onClick={() => go("billing")}>Pay</Btn>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

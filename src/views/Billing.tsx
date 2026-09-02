import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { billTotals, fmtDate, fmtMoney, fullName } from "../lib/data";
import type { Bill, BillItem, BillStatus, Payment } from "../lib/data";
import { Avatar, Btn, Card, Drawer, EmptyState, Field, Modal, Pill, Select, TextInput, BILL_META } from "../components/ui";
import { I } from "../components/icons";
import { downloadBillPdf, printBillReceipt } from "../lib/pdf";

function EditBillModal({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const { updateBill, toast } = useApp();
  const [items, setItems] = useState<BillItem[]>(bill.items.map((item) => ({ ...item })));
  const [discount, setDiscount] = useState(String(bill.discount));
  const [taxRate, setTaxRate] = useState(String(bill.taxRate));
  const [status, setStatus] = useState<BillStatus>(bill.status);
  const [claimStatus, setClaimStatus] = useState<Bill["claimStatus"]>(bill.claimStatus);

  const patchItem = (index: number, patch: Partial<BillItem>) => {
    setItems((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const save = () => {
    const cleanItems = items
      .map((item) => ({ ...item, desc: item.desc.trim(), qty: Math.max(1, Number(item.qty) || 1), price: Math.max(0, Number(item.price) || 0) }))
      .filter((item) => item.desc);
    if (cleanItems.length === 0) {
      toast("error", "Add at least one line item", "Every invoice needs a description and amount.");
      return;
    }
    updateBill(bill.id, {
      items: cleanItems,
      discount: Math.max(0, Number(discount) || 0),
      taxRate: Math.min(100, Math.max(0, Number(taxRate) || 0)),
      status,
      claimStatus,
    });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Edit invoice · ${bill.code}`} sub="Super Admin can change services, quantities, rates, discount, tax and status"
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn icon="check" onClick={save}>Save invoice</Btn></>}>
      <div className="space-y-3 max-h-[62vh] overflow-y-auto scroll-slim pr-1">
        {items.map((item, index) => (
          <div key={index} className="border border-line rounded-lg p-3 bg-line-soft/25">
            <div className="flex items-center gap-2 mb-2.5">
              <p className="micro text-ink-faint">Line item {index + 1}</p>
              {items.length > 1 && <button onClick={() => setItems((current) => current.filter((_, i) => i !== index))} className="ml-auto text-danger-600 hover:text-danger-700" aria-label="Remove line item"><I name="trash" className="w-4 h-4" /></button>}
            </div>
            <div className="grid sm:grid-cols-[minmax(0,1fr)_130px] gap-2.5">
              <Field label="Service / description"><TextInput value={item.desc} onChange={(e) => patchItem(index, { desc: e.target.value })} /></Field>
              <Field label="Type"><Select value={item.kind} onChange={(e) => patchItem(index, { kind: e.target.value as BillItem["kind"] })}>
                <option value="consultation">Consultation</option><option value="medicine">Medicine</option><option value="lab">Lab</option><option value="imaging">Imaging</option><option value="bed">Bed</option><option value="service">Service</option>
              </Select></Field>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mt-2.5">
              <Field label="Quantity"><TextInput type="number" min="1" value={item.qty} onChange={(e) => patchItem(index, { qty: Number(e.target.value) })} /></Field>
              <Field label="Unit price"><TextInput type="number" min="0" step="0.01" value={item.price} onChange={(e) => patchItem(index, { price: Number(e.target.value) })} /></Field>
            </div>
          </div>
        ))}
        <Btn variant="outline" size="sm" icon="plus" onClick={() => setItems((current) => [...current, { desc: "", kind: "service", qty: 1, price: 0 }])}>Add line item</Btn>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <Field label="Discount / waiver"><TextInput type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
          <Field label="Tax %"><TextInput type="number" min="0" max="100" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></Field>
          <Field label="Invoice status"><Select value={status} onChange={(e) => setStatus(e.target.value as BillStatus)}><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="refunded">Refunded</option></Select></Field>
          <Field label="Claim status"><Select value={claimStatus} onChange={(e) => setClaimStatus(e.target.value as Bill["claimStatus"])}><option value="none">None</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></Select></Field>
        </div>
      </div>
    </Modal>
  );
}

function PayModal({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const { recordPayment } = useApp();
  const t = billTotals(bill);
  const [amount, setAmount] = useState(t.balance.toFixed(2));
  const [method, setMethod] = useState<Payment["method"]>("Card");
  return (
    <Modal open onClose={onClose} title={`Record payment · ${bill.code}`} sub={`Balance due ${fmtMoney(t.balance)}`}
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn icon="wallet" onClick={() => { const a = Number(amount); if (a > 0) { recordPayment(bill.id, a, method); onClose(); } }}>
          Collect {fmtMoney(Math.min(Number(amount) || 0, t.balance))}
        </Btn></>}>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Amount">
          <TextInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value as Payment["method"])}>
            <option>Cash</option><option>Card</option><option>Wallet</option><option>Bank Transfer</option><option>Insurance</option>
          </Select>
        </Field>
      </div>
      <div className="flex gap-1.5 mt-3">
        {[25, 50, 100].map((pct) => (
          <button key={pct} onClick={() => setAmount(((t.balance * pct) / 100).toFixed(2))}
            className="px-2.5 py-1 rounded-md bg-line-soft text-[11px] font-semibold text-ink-soft hover:bg-brand-100 hover:text-brand-700 transition-colors">
            {pct}%
          </button>
        ))}
        <button onClick={() => setAmount(t.balance.toFixed(2))} className="px-2.5 py-1 rounded-md bg-line-soft text-[11px] font-semibold text-ink-soft hover:bg-brand-100 hover:text-brand-700 transition-colors">Full</button>
      </div>
    </Modal>
  );
}

function PaymentEditorModal({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const { updateBillPayments, toast } = useApp();
  const [payments, setPayments] = useState<Payment[]>(bill.payments.map((payment) => ({ ...payment })));

  const patchPayment = (index: number, patch: Partial<Payment>) => {
    setPayments((current) => current.map((payment, i) => i === index ? { ...payment, ...patch } : payment));
  };

  const addPayment = () => {
    const stamp = Date.now();
    setPayments((current) => [...current, {
      id: `PY-EDIT-${stamp}`,
      amount: 0,
      method: "Cash",
      at: new Date().toISOString(),
      ref: `MANUAL-${String(stamp).slice(-6)}`,
    }]);
  };

  const save = () => {
    if (payments.some((payment) => Number(payment.amount) <= 0)) {
      toast("error", "Invalid payment amount", "Enter an amount greater than zero or remove the empty payment row.");
      return;
    }
    updateBillPayments(bill.id, payments);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Edit payments · ${bill.code}`} sub="Super Admin, Admin and Doctor can correct the patient payment ledger"
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn icon="check" onClick={save}>Save payment ledger</Btn></>}>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto scroll-slim pr-1">
        {payments.map((payment, index) => (
          <div key={payment.id} className="border border-line rounded-lg p-3 bg-line-soft/25">
            <div className="flex items-center gap-2 mb-2.5">
              <p className="micro text-ink-faint">Payment {index + 1} · {payment.ref}</p>
              <button onClick={() => setPayments((current) => current.filter((_, i) => i !== index))} className="ml-auto text-danger-600 hover:text-danger-700" aria-label="Remove payment"><I name="trash" className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Paid amount"><TextInput type="number" min="0.01" step="0.01" value={payment.amount} onChange={(e) => patchPayment(index, { amount: Number(e.target.value) })} /></Field>
              <Field label="Payment method"><Select value={payment.method} onChange={(e) => patchPayment(index, { method: e.target.value as Payment["method"] })}>
                <option>Cash</option><option>Card</option><option>Wallet</option><option>Bank Transfer</option><option>Insurance</option>
              </Select></Field>
            </div>
          </div>
        ))}
        {payments.length === 0 && <div className="rounded-lg border border-dashed border-line p-5 text-center text-[12px] text-ink-faint">No payments recorded. Add a payment to update this invoice.</div>}
        <Btn size="sm" variant="outline" icon="plus" onClick={addPayment}>Add payment</Btn>
      </div>
    </Modal>
  );
}

function BillDrawer({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const { s, submitClaim, toast, hasPermission } = useApp();
  const role = s.session?.role ?? "billing";
  const [showPay, setShowPay] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPaymentEditor, setShowPaymentEditor] = useState(false);
  const t = billTotals(bill);
  const patient = s.patients.find((p) => p.id === bill.patientId);
  const insurer = s.insurers.find((i) => i.id === patient?.insuranceProviderId);
  const meta = BILL_META[bill.status];
  const canCollect = hasPermission("billing", "edit") && (role === "billing" || role === "admin" || role === "super" || role === "doctor" || role === "reception" || role === "patient");
  const canManagePayments = hasPermission("billing", "edit") && ["super", "admin", "doctor"].includes(role);

  const saveReceiptPdf = async () => {
    try {
      await downloadBillPdf(s, bill.id);
      toast("success", "Receipt PDF downloaded", `${bill.code} saved as a separate PDF.`);
    } catch {
      toast("error", "PDF download failed", "Please try again from this invoice.");
    }
  };

  const printReceipt = () => {
    try {
      printBillReceipt(s, bill.id);
      toast("success", "Print receipt opened", `${bill.code} is ready to print.`);
    } catch {
      toast("error", "Print window blocked", "Allow pop-ups in the browser and try again.");
    }
  };

  const kindIcon: Record<string, string> = { consultation: "stetho", medicine: "pill", lab: "flask", imaging: "scan", bed: "bed", service: "cross" };

  return (
    <Drawer open onClose={onClose} width={470}>
      <div className="sticky top-0 z-10 bg-card border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="micro text-brand-700">Invoice</p>
            <h2 className="font-display font-extrabold text-lg text-ink leading-tight">{bill.code}</h2>
          </div>
          <Pill tone={meta.tone} className="ml-1">{meta.label}</Pill>
          {bill.claimStatus !== "none" && <Pill tone={bill.claimStatus === "pending" ? "amber" : bill.claimStatus === "approved" ? "green" : "red"}>claim {bill.claimStatus}</Pill>}
          <button onClick={onClose} className="ml-auto p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-line-soft transition-colors" aria-label="Close">
            <I name="x" className="w-4 h-4" />
          </button>
        </div>
        {patient && (
          <div className="mt-2.5 flex items-center gap-2.5">
            <Avatar name={fullName(patient)} color={patient.color} size={30} />
            <p className="text-[13px] font-semibold text-ink">{fullName(patient)} <span className="font-mono text-[10.5px] text-ink-faint ml-1">{patient.code}</span></p>
            <span className="ml-auto text-[11px] text-ink-faint">{fmtDate(bill.createdAt)}</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        <Card title="Line items" pad={false}>
          <ul>
            {bill.items.map((it, i) => (
              <li key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-line-soft last:border-0">
                <span className="w-7 h-7 rounded-md bg-brand-50 text-brand-700 grid place-items-center shrink-0">
                  <I name={kindIcon[it.kind] ?? "cross"} className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-ink truncate">{it.desc}</p>
                  <p className="text-[10.5px] text-ink-faint font-mono">{it.qty} × {fmtMoney(it.price)}</p>
                </div>
                <span className="ml-auto font-mono text-[12.5px] font-semibold text-ink">{fmtMoney(it.qty * it.price)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="bg-card border border-line rounded-xl p-4 space-y-1.5 text-[13px]">
          <p className="flex justify-between text-ink-soft"><span>Subtotal</span><span className="font-mono">{fmtMoney(t.subtotal)}</span></p>
          {bill.discount > 0 && <p className="flex justify-between text-brand-700"><span>Discount / waiver</span><span className="font-mono">−{fmtMoney(bill.discount)}</span></p>}
          <p className="flex justify-between text-ink-soft"><span>Tax ({bill.taxRate}%)</span><span className="font-mono">{fmtMoney(t.tax)}</span></p>
          <p className="flex justify-between font-display font-extrabold text-[16px] text-ink border-t border-line pt-2 mt-2"><span>Total</span><span className="font-mono">{fmtMoney(t.total)}</span></p>
          <p className="flex justify-between text-brand-700 font-semibold"><span>Paid</span><span className="font-mono">{fmtMoney(t.paid)}</span></p>
          <p className={`flex justify-between font-semibold ${t.balance > 0 ? "text-danger-600" : "text-brand-700"}`}><span>Balance due</span><span className="font-mono">{fmtMoney(t.balance)}</span></p>
        </div>

        {bill.payments.length > 0 && (
          <Card title="Payments" pad={false}>
            <ul>
              {bill.payments.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-line-soft last:border-0">
                  <I name="wallet" className="w-4 h-4 text-brand-600" />
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink">{fmtMoney(p.amount)} · {p.method}</p>
                    <p className="text-[10.5px] text-ink-faint font-mono">{p.ref} · {new Date(p.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="space-y-2">
          {role === "super" && (
            <Btn className="w-full" variant="dark" icon="edit" onClick={() => setShowEdit(true)}>Edit invoice details</Btn>
          )}
          {canManagePayments && (
            <Btn className="w-full" variant="outline" icon="edit" onClick={() => setShowPaymentEditor(true)}>Edit patient payments</Btn>
          )}
          {t.balance > 0 && canCollect && (
            <Btn className="w-full" icon="wallet" onClick={() => setShowPay(true)}>
              {role === "patient" ? "Pay now online" : "Record payment"}
            </Btn>
          )}
          {insurer && bill.claimStatus === "none" && (role === "billing" || role === "admin" || role === "super") && t.balance > 0 && (
            <Btn variant="outline" className="w-full" icon="shield" onClick={() => submitClaim(bill.id)}>
              Submit claim to {insurer.name}
            </Btn>
          )}
          {bill.claimStatus === "pending" && (
            <p className="text-[11.5px] text-warn-700 bg-warn-50 border border-warn-600/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <I name="clock" className="w-3.5 h-3.5" /> Claim under adjudication with {insurer?.name ?? "payer"}.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="outline" className="w-full" icon="download" onClick={saveReceiptPdf}>Download PDF</Btn>
            <Btn variant="ghost" className="w-full" icon="printer" onClick={printReceipt}>Print receipt</Btn>
          </div>
        </div>
      </div>

      {showPay && <PayModal bill={bill} onClose={() => setShowPay(false)} />}
      {showEdit && <EditBillModal bill={bill} onClose={() => setShowEdit(false)} />}
      {showPaymentEditor && <PaymentEditorModal bill={bill} onClose={() => setShowPaymentEditor(false)} />}
    </Drawer>
  );
}

export function Billing() {
  const { s } = useApp();
  const role = s.session?.role ?? "billing";
  const isPatient = role === "patient";
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const bills = useMemo(
    () => (isPatient ? s.bills.filter((b) => b.patientId === "p1") : s.bills)
      .filter((b) => statusFilter === "all" || b.status === statusFilter)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [s.bills, statusFilter, isPatient]
  );

  const totals = useMemo(() => {
    const all = isPatient ? s.bills.filter((b) => b.patientId === "p1") : s.bills;
    const today = new Date().toISOString().slice(0, 10);
    return {
      collectedToday: all.reduce((x, b) => x + b.payments.filter((p) => p.at.slice(0, 10) === today).reduce((y, p) => y + p.amount, 0), 0),
      outstanding: all.reduce((x, b) => x + billTotals(b).balance, 0),
      claims: all.filter((b) => b.claimStatus === "pending").length,
      open: all.filter((b) => b.status !== "paid").length,
    };
  }, [s.bills, isPatient]);

  const selected = s.bills.find((b) => b.id === selectedId) ?? null;
  const filters = ["all", "unpaid", "partial", "paid"];

  return (
    <div className="space-y-4">
      <div>
        <p className="micro text-brand-700">Revenue cycle</p>
        <h1 className="font-display font-extrabold text-[22px] tracking-tight text-ink">{isPatient ? "My bills & payments" : "Billing & insurance"}</h1>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: "Collected today", v: fmtMoney(totals.collectedToday), icon: "wallet", tone: "text-brand-700 bg-brand-100" },
          { label: "Outstanding", v: fmtMoney(totals.outstanding), icon: "receipt", tone: "text-danger-700 bg-danger-100" },
          { label: "Claims pending", v: String(totals.claims), icon: "shield", tone: "text-warn-700 bg-warn-100" },
          { label: "Open invoices", v: String(totals.open), icon: "chart", tone: "text-steel-700 bg-steel-100" },
        ].map((x, i) => (
          <div key={x.label} className="fade-up bg-card border border-line rounded-xl px-4 py-3.5 flex items-center gap-3" style={{ animationDelay: `${i * 50}ms` }}>
            <span className={`w-9 h-9 rounded-lg grid place-items-center ${x.tone}`}><I name={x.icon} className="w-[18px] h-[18px]" /></span>
            <div>
              <p className="micro text-ink-faint">{x.label}</p>
              <p className="font-display font-extrabold text-[19px] text-ink tabular-nums">{x.v}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${statusFilter === f ? "bg-pine-900 text-brand-200 border-pine-900" : "bg-white border-line text-ink-soft hover:border-brand-500"}`}>
            {f}
          </button>
        ))}
      </div>

      <Card pad={false} title="Invoices" sub={`${bills.length} shown`}>
        {bills.length === 0 ? (
          <EmptyState icon="receipt" title="No invoices" desc="Invoices appear when consultations, dispensing and lab work are billed." />
        ) : (
          <ul>
            {bills.map((b, idx) => {
              const t = billTotals(b);
              const p = s.patients.find((x) => x.id === b.patientId);
              const meta = BILL_META[b.status];
              return (
                <li key={b.id}>
                  <button onClick={() => setSelectedId(b.id)}
                    className="fade-up w-full flex items-center gap-3 px-4 py-3 border-b border-line-soft last:border-0 hover:bg-brand-50/60 transition-colors text-left"
                    style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}>
                    <span className="w-9 h-9 rounded-lg bg-steel-100 text-steel-700 grid place-items-center shrink-0"><I name="receipt" className="w-4 h-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink">{b.code} <span className="font-mono text-[10.5px] text-ink-faint ml-1">{fmtDate(b.createdAt)}</span></p>
                      <p className="text-[11.5px] text-ink-soft truncate">{p ? fullName(p) : "—"} · {b.items.length} item(s){b.claimStatus !== "none" ? ` · claim ${b.claimStatus}` : ""}</p>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="font-mono font-semibold text-[13.5px] text-ink">{fmtMoney(t.total)}</p>
                      {t.balance > 0 && <p className="font-mono text-[10.5px] text-danger-600">due {fmtMoney(t.balance)}</p>}
                    </div>
                    <Pill tone={meta.tone}>{meta.label}</Pill>
                    <I name="chevron-r" className="w-4 h-4 text-ink-faint shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {selected && <BillDrawer bill={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

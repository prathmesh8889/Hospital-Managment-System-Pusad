import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useApp } from "../lib/store";
import { Btn, Field, Select, TextInput } from "./ui";
import { I } from "./icons";

type LedgerCategory = "Internal expense" | "Petty cash" | "Reconciliation" | "Write-off" | "Adjustment" | "Confidential note";
type LedgerMethod = "Cash" | "Bank" | "Card" | "Other";
type LedgerStatus = "Open" | "Reviewed" | "Closed";

interface LedgerEntry {
  id: string;
  date: string;
  category: LedgerCategory;
  amount: number;
  method: LedgerMethod;
  reference: string;
  note: string;
  status: LedgerStatus;
  createdAt: string;
  updatedAt: string;
}

interface LedgerActivity {
  id: string;
  action: string;
  detail: string;
  at: string;
}

interface LedgerState {
  entries: LedgerEntry[];
  activity: LedgerActivity[];
}

const STORAGE_KEY = "itcyber-hms-confidential-ledger-v1";
const emptyState: LedgerState = { entries: [], activity: [] };

const loadLedger = (): LedgerState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as LedgerState;
    if (!Array.isArray(parsed.entries) || !Array.isArray(parsed.activity)) return emptyState;
    return parsed;
  } catch {
    return emptyState;
  }
};

const rupees = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const today = () => new Date().toISOString().slice(0, 10);

export function ConfidentialLedger({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, effectiveCredentials, toast } = useApp();
  const isSuper = s.session?.role === "super";
  const [unlocked, setUnlocked] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [ledger, setLedger] = useState<LedgerState>(loadLedger);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState<LedgerCategory>("Internal expense");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<LedgerMethod>("Cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<LedgerStatus>("Open");

  useEffect(() => {
    if (!open) {
      setUnlocked(false);
      setLoginId("");
      setPassword("");
      setAuthError("");
      setEditingId(null);
    }
  }, [open]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger)); } catch { /* local demo storage unavailable */ }
  }, [ledger]);

  const addActivity = (action: string, detail: string) => {
    const item: LedgerActivity = { id: `${Date.now()}-${Math.random()}`, action, detail, at: new Date().toISOString() };
    setLedger((current) => ({ ...current, activity: [item, ...current.activity].slice(0, 100) }));
  };

  const authenticate = (event: FormEvent) => {
    event.preventDefault();
    const expected = effectiveCredentials.super;
    if (loginId.trim().toLowerCase() !== expected.username.toLowerCase() || password !== expected.password) {
      setAuthError("Invalid Super Admin ID or password.");
      return;
    }
    setUnlocked(true);
    setAuthError("");
    setPassword("");
    addActivity("Portal unlocked", "Super Administrator completed secondary authentication");
  };

  const resetForm = () => {
    setEditingId(null);
    setDate(today());
    setCategory("Internal expense");
    setAmount("");
    setMethod("Cash");
    setReference("");
    setNote("");
    setStatus("Open");
  };

  const saveEntry = () => {
    const value = Math.max(0, Math.round(Number(amount) || 0));
    if (!date || value <= 0 || !note.trim()) {
      toast("error", "Entry incomplete", "Enter a date, whole-rupee amount and a clear note.");
      return;
    }
    const stamp = new Date().toISOString();
    if (editingId) {
      setLedger((current) => ({
        ...current,
        entries: current.entries.map((entry) => entry.id === editingId ? {
          ...entry, date, category, amount: value, method, reference: reference.trim(), note: note.trim(), status, updatedAt: stamp,
        } : entry),
        activity: [{ id: `${Date.now()}-edit`, action: "Entry updated", detail: `${editingId} · ${rupees(value)}`, at: stamp }, ...current.activity].slice(0, 100),
      }));
      toast("success", "Confidential entry updated", `${rupees(value)} saved in the private ledger.`);
    } else {
      const entry: LedgerEntry = {
        id: `CL-${String(Date.now()).slice(-8)}`,
        date,
        category,
        amount: value,
        method,
        reference: reference.trim(),
        note: note.trim(),
        status,
        createdAt: stamp,
        updatedAt: stamp,
      };
      setLedger((current) => ({
        entries: [entry, ...current.entries],
        activity: [{ id: `${Date.now()}-add`, action: "Entry created", detail: `${entry.id} · ${rupees(value)}`, at: stamp }, ...current.activity].slice(0, 100),
      }));
      toast("success", "Confidential entry saved", `${entry.id} stored separately from patient billing.`);
    }
    resetForm();
  };

  const editEntry = (entry: LedgerEntry) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setCategory(entry.category);
    setAmount(String(entry.amount));
    setMethod(entry.method);
    setReference(entry.reference);
    setNote(entry.note);
    setStatus(entry.status);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteEntry = (entry: LedgerEntry) => {
    if (!window.confirm(`Delete ${entry.id}? This action will be recorded in the confidential activity log.`)) return;
    const stamp = new Date().toISOString();
    setLedger((current) => ({
      entries: current.entries.filter((item) => item.id !== entry.id),
      activity: [{ id: `${Date.now()}-delete`, action: "Entry deleted", detail: `${entry.id} · ${rupees(entry.amount)}`, at: stamp }, ...current.activity].slice(0, 100),
    }));
    if (editingId === entry.id) resetForm();
    toast("info", "Confidential entry deleted", `${entry.id} removed; deletion recorded in activity history.`);
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return ledger.entries;
    return ledger.entries.filter((entry) => `${entry.id} ${entry.category} ${entry.method} ${entry.reference} ${entry.note} ${entry.status}`.toLowerCase().includes(needle));
  }, [ledger.entries, query]);

  const stats = useMemo(() => ({
    total: ledger.entries.reduce((sum, entry) => sum + entry.amount, 0),
    cash: ledger.entries.filter((entry) => entry.method === "Cash").reduce((sum, entry) => sum + entry.amount, 0),
    open: ledger.entries.filter((entry) => entry.status === "Open").length,
  }), [ledger.entries]);

  if (!open || !isSuper) return null;

  if (!unlocked) {
    return (
      <div className="fixed inset-0 z-[90] bg-pine-950/90 backdrop-blur-sm grid place-items-center p-4">
        <div className="w-full max-w-md bg-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="bg-pine-900 pine-tex text-white px-5 py-5">
            <div className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-xl bg-white/10 text-brand-300 grid place-items-center shrink-0"><I name="lock" className="w-5 h-5" /></span>
              <div className="min-w-0">
                <p className="micro text-brand-400">Secondary authentication</p>
                <h2 className="font-display font-extrabold text-xl">Super Admin Confidential Ledger</h2>
                <p className="text-[11.5px] text-pine-100/65 mt-1">Not shown in the normal hospital navigation.</p>
              </div>
              <button onClick={onClose} className="ml-auto p-1.5 rounded-md text-pine-100/70 hover:text-white hover:bg-white/10" aria-label="Close"><I name="x" className="w-4 h-4" /></button>
            </div>
          </div>
          <form onSubmit={authenticate} className="p-5 space-y-4">
            <div className="rounded-lg border border-warn-600/25 bg-warn-50 px-3 py-2.5 text-[11.5px] text-warn-700 leading-relaxed">
              This area is for legitimate internal confidential records only. It must not be used to conceal patient revenue, taxes, or statutory accounting records.
            </div>
            <Field label="Super Admin ID"><TextInput value={loginId} onChange={(e) => { setLoginId(e.target.value); setAuthError(""); }} autoComplete="username" autoFocus /></Field>
            <Field label="Password"><TextInput type="password" value={password} onChange={(e) => { setPassword(e.target.value); setAuthError(""); }} autoComplete="current-password" /></Field>
            {authError && <p className="text-[12px] font-semibold text-danger-700 bg-danger-50 border border-danger-600/20 rounded-lg px-3 py-2">{authError}</p>}
            <div className="flex gap-2">
              <Btn type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Btn>
              <Btn type="submit" icon="shield" className="flex-1">Unlock portal</Btn>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] bg-[#f4f7f5] flex flex-col overflow-hidden">
      <header className="bg-pine-950 pine-tex text-white px-4 sm:px-6 py-4 flex items-center gap-3 shrink-0">
        <span className="w-10 h-10 rounded-xl bg-white/10 text-brand-300 grid place-items-center"><I name="shield" className="w-5 h-5" /></span>
        <div className="min-w-0">
          <p className="micro text-brand-400">Super Admin only · private workspace</p>
          <h1 className="font-display font-extrabold text-lg sm:text-xl truncate">Confidential Ledger</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:inline text-[10.5px] text-pine-100/55">Secondary login verified</span>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-lg border border-white/10 text-pine-100/80 hover:text-white hover:bg-white/10" aria-label="Close private ledger"><I name="x" className="w-4 h-4" /></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scroll-slim">
        <div className="max-w-[1220px] mx-auto p-3 sm:p-5 lg:p-6 space-y-4">
          <div className="rounded-xl border border-warn-600/25 bg-warn-50 px-4 py-3 flex gap-2.5 text-[12px] text-warn-700 leading-relaxed">
            <I name="alert" className="w-4 h-4 shrink-0 mt-0.5" />
            <p><b>Confidential does not mean off-book.</b> Use this workspace for internal expenses, petty cash, reconciliations, write-offs, adjustments and sensitive notes. Official patient charges and receipts must remain in Billing.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ["Entries", String(ledger.entries.length), "receipt"],
              ["Recorded amount", rupees(stats.total), "wallet"],
              ["Cash records", rupees(stats.cash), "wallet"],
              ["Open review", String(stats.open), "clock"],
            ].map(([label, value, icon]) => (
              <div key={label} className="bg-card border border-line rounded-xl p-3.5 flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 grid place-items-center"><I name={icon} className="w-4 h-4" /></span>
                <div className="min-w-0"><p className="micro text-ink-faint">{label}</p><p className="font-display font-extrabold text-[17px] text-ink truncate">{value}</p></div>
              </div>
            ))}
          </div>

          <div className="grid xl:grid-cols-[390px_minmax(0,1fr)] gap-4 items-start">
            <section className="bg-card border border-line rounded-xl p-4 space-y-3 xl:sticky xl:top-4">
              <div className="flex items-center justify-between gap-2">
                <div><p className="micro text-brand-700">{editingId ? "Edit record" : "New record"}</p><h2 className="font-display font-extrabold text-[17px] text-ink">{editingId ?? "Add confidential entry"}</h2></div>
                {editingId && <button onClick={resetForm} className="text-[11px] font-semibold text-ink-faint hover:text-brand-700">Cancel edit</button>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
                <Field label="Amount (₹)"><TextInput type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 2500" /></Field>
              </div>
              <Field label="Category"><Select value={category} onChange={(e) => setCategory(e.target.value as LedgerCategory)}>
                <option>Internal expense</option><option>Petty cash</option><option>Reconciliation</option><option>Write-off</option><option>Adjustment</option><option>Confidential note</option>
              </Select></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value as LedgerMethod)}><option>Cash</option><option>Bank</option><option>Card</option><option>Other</option></Select></Field>
                <Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value as LedgerStatus)}><option>Open</option><option>Reviewed</option><option>Closed</option></Select></Field>
              </div>
              <Field label="Reference (optional)"><TextInput value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Voucher / internal ref" /></Field>
              <Field label="Reason / note">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Document the legitimate business reason clearly…" className="w-full bg-white border border-line rounded-lg px-3 py-2 text-[13px] text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 resize-y" />
              </Field>
              <Btn icon="check" className="w-full" onClick={saveEntry}>{editingId ? "Update entry" : "Save confidential entry"}</Btn>
            </section>

            <div className="space-y-4 min-w-0">
              <section className="bg-card border border-line rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-line flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <div><p className="font-display font-bold text-[15px] text-ink">Private records</p><p className="text-[11px] text-ink-faint">Stored separately from patient invoices and the normal billing page.</p></div>
                  <div className="sm:ml-auto relative w-full sm:w-[280px]">
                    <I name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search records…" className="w-full bg-white border border-line rounded-lg pl-9 pr-3 py-2 text-[13px] outline-none focus:border-brand-500" />
                  </div>
                </div>
                {filtered.length === 0 ? (
                  <div className="p-8 text-center"><I name="lock" className="w-7 h-7 mx-auto text-ink-faint" /><p className="text-sm font-semibold text-ink mt-2">No confidential records</p><p className="text-[11.5px] text-ink-faint mt-1">Add the first legitimate internal record from the form.</p></div>
                ) : (
                  <div className="overflow-x-auto scroll-slim">
                    <table className="w-full min-w-[760px] text-[12.5px]">
                      <thead><tr className="micro text-ink-faint text-left bg-line-soft/40 border-b border-line"><th className="px-4 py-2.5">Date / ID</th><th className="px-3 py-2.5">Category</th><th className="px-3 py-2.5">Details</th><th className="px-3 py-2.5">Method</th><th className="px-3 py-2.5 text-right">Amount</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Actions</th></tr></thead>
                      <tbody>{filtered.map((entry) => (
                        <tr key={entry.id} className="border-b border-line-soft last:border-0 align-top hover:bg-brand-50/40">
                          <td className="px-4 py-3"><p className="font-semibold text-ink">{new Date(entry.date + "T12:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p><p className="font-mono text-[10.5px] text-ink-faint mt-0.5">{entry.id}</p></td>
                          <td className="px-3 py-3 font-semibold text-ink">{entry.category}</td>
                          <td className="px-3 py-3 max-w-[270px]"><p className="text-ink leading-snug">{entry.note}</p>{entry.reference && <p className="font-mono text-[10.5px] text-ink-faint mt-1">Ref: {entry.reference}</p>}</td>
                          <td className="px-3 py-3 text-ink-soft">{entry.method}</td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-ink whitespace-nowrap">{rupees(entry.amount)}</td>
                          <td className="px-3 py-3"><span className={`text-[10px] font-bold px-2 py-1 rounded-full ${entry.status === "Closed" ? "bg-brand-100 text-brand-700" : entry.status === "Reviewed" ? "bg-steel-100 text-steel-700" : "bg-warn-100 text-warn-700"}`}>{entry.status}</span></td>
                          <td className="px-3 py-3"><div className="flex justify-end gap-1"><button onClick={() => editEntry(entry)} className="w-8 h-8 grid place-items-center rounded-md text-steel-700 hover:bg-steel-100" title="Edit"><I name="edit" className="w-3.5 h-3.5" /></button><button onClick={() => deleteEntry(entry)} className="w-8 h-8 grid place-items-center rounded-md text-danger-600 hover:bg-danger-50" title="Delete"><I name="trash" className="w-3.5 h-3.5" /></button></div></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="bg-card border border-line rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-line"><p className="font-display font-bold text-[15px] text-ink">Confidential activity history</p><p className="text-[11px] text-ink-faint">Recent unlock, create, edit and delete actions for this private workspace.</p></div>
                <div className="max-h-[240px] overflow-y-auto scroll-slim">
                  {ledger.activity.length === 0 ? <p className="px-4 py-6 text-xs text-ink-faint text-center">No activity yet.</p> : ledger.activity.slice(0, 30).map((item) => (
                    <div key={item.id} className="px-4 py-2.5 border-b border-line-soft last:border-0 flex gap-3"><span className="w-7 h-7 rounded-md bg-line-soft text-ink-soft grid place-items-center shrink-0"><I name="shield" className="w-3.5 h-3.5" /></span><div className="min-w-0"><p className="text-[12px] font-semibold text-ink">{item.action}</p><p className="text-[11px] text-ink-soft truncate">{item.detail}</p><p className="micro text-ink-faint mt-0.5">{new Date(item.at).toLocaleString("en-IN")}</p></div></div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

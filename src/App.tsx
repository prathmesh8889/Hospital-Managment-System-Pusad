import { useState } from "react";
import { AppProvider, useApp } from "./lib/store";
import { ROLES, ROLE_MAP } from "./lib/data";
import { Shell } from "./components/Shell";
import { I, PulseMark } from "./components/icons";
import { Avatar, ECG } from "./components/ui";
import { Dashboard } from "./views/Dashboard";
import { Patients } from "./views/Patients";
import { Appointments } from "./views/Appointments";
import { OPD } from "./views/OPD";
import { Prescriptions } from "./views/Prescriptions";
import { Pharmacy } from "./views/Pharmacy";
import { Lab } from "./views/Lab";
import { Wards } from "./views/Wards";
import { Billing } from "./views/Billing";
import { Reports } from "./views/Reports";
import { Portal } from "./views/Portal";

function SignIn() {
  const { s, signIn } = useApp();
  const [hovered, setHovered] = useState<string | null>(null);
  const occupied = s.beds.filter((b) => b.status === "occupied").length;
  const inQueue = s.appointments.filter((a) => a.dayOffset === 0 && ["checked-in", "in-consultation"].includes(a.status)).length;

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* left brand panel */}
      <div className="lg:w-[440px] shrink-0 bg-pine-950 pine-tex text-white flex flex-col px-8 py-8 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <PulseMark className="w-10 h-10" />
          <div>
            <p className="font-display font-extrabold text-xl tracking-tight leading-none">AURELIA<span className="text-brand-400"> HMS</span></p>
            <p className="micro text-brand-400/80 mt-1">St. Aurelia Medical Center</p>
          </div>
        </div>

        <div className="mt-10 max-w-sm">
          <p className="micro text-brand-400">Shift handover · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="font-display font-extrabold text-[34px] leading-[1.08] tracking-tight mt-3">
            One console for the whole hospital floor.
          </h1>
          <p className="text-[13.5px] text-pine-100/70 leading-relaxed mt-3">
            Registration to discharge — patients, queues, prescriptions, labs, beds, billing and the audit trail behind every one of them.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3 max-w-sm">
          {[
            { k: "In queue", v: inQueue, icon: "queue" },
            { k: "Beds occupied", v: `${occupied}/${s.beds.length}`, icon: "bed" },
            { k: "On duty", v: s.staff.filter((x) => x.status === "on-duty").length, icon: "users" },
          ].map((x) => (
            <div key={x.k} className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-3">
              <I name={x.icon} className="w-4 h-4 text-brand-400" />
              <p className="font-display font-extrabold text-xl mt-1.5 tabular-nums">{x.v}</p>
              <p className="micro text-pine-100/60">{x.k}</p>
            </div>
          ))}
        </div>

        <div className="mt-auto">
          <ECG className="w-full h-10 opacity-70" />
          <p className="micro text-pine-100/40 mt-3">Role-based access · full audit trail · demo environment with seeded data</p>
        </div>
      </div>

      {/* right role roster */}
      <div className="flex-1 overflow-y-auto scroll-slim paper-tex plus-grid">
        <div className="max-w-xl mx-auto px-6 py-10 lg:py-14">
          <p className="micro text-brand-700">Secure sign-in</p>
          <h2 className="font-display font-extrabold text-[24px] tracking-tight text-ink mt-1">Choose your duty role</h2>
          <p className="text-[13px] text-ink-soft mt-1.5">Each role opens the modules its permissions allow — from front desk to theatre.</p>

          <ul className="mt-6 space-y-2">
            {ROLES.map((r, i) => (
              <li key={r.id} className="fade-up" style={{ animationDelay: `${i * 45}ms` }}>
                <button
                  onClick={() => signIn(r.id)}
                  onMouseEnter={() => setHovered(r.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`w-full flex items-center gap-3.5 bg-card border rounded-xl px-4 py-3 text-left transition-all duration-150 group ${
                    hovered === r.id ? "border-brand-500 shadow-[0_6px_20px_rgba(14,130,98,0.13)] -translate-y-px" : "border-line"
                  }`}
                >
                  <Avatar name={r.name} color={r.color} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-ink leading-tight">{r.name}</p>
                    <p className="text-[11.5px] text-ink-soft">{r.label} · {r.title}</p>
                    <p className="micro text-ink-faint mt-0.5">{r.scope}</p>
                  </div>
                  <span className={`w-8 h-8 rounded-lg grid place-items-center transition-all duration-150 shrink-0 ${hovered === r.id ? "bg-brand-600 text-white" : "bg-line-soft text-ink-faint"}`}>
                    <I name="arrow-r" className="w-4 h-4" />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p className="text-[11px] text-ink-faint mt-6 flex items-center gap-1.5">
            <I name="shield" className="w-3.5 h-3.5" /> Session data persists locally. Reset any time from the sidebar.
          </p>
        </div>
      </div>
    </div>
  );
}

function Router() {
  const { s } = useApp();
  switch (s.view) {
    case "portal": return <Portal />;
    case "patients": return <Patients />;
    case "appointments": return <Appointments />;
    case "opd": return <OPD />;
    case "prescriptions": return <Prescriptions />;
    case "pharmacy": return <Pharmacy />;
    case "lab": return <Lab />;
    case "wards": return <Wards />;
    case "billing": return <Billing />;
    case "inventory": return <InventoryPage />;
    case "reports": return <Reports />;
    default: return <Dashboard />;
  }
}

function InventoryPage() {
  const { s, adjustInventory, createPO, receivePO } = useApp();
  const role = s.session?.role ?? "admin";
  return (
    <div className="space-y-4">
      <div>
        <p className="micro text-brand-700">Stores</p>
        <h1 className="font-display font-extrabold text-[22px] tracking-tight text-ink">Inventory & supplies</h1>
      </div>
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 bg-card border border-line rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="micro text-ink-faint text-left border-b border-line">
                <th className="px-4 py-2.5 font-medium">Item</th>
                <th className="px-3 py-2.5 font-medium">Category</th>
                <th className="px-3 py-2.5 font-medium w-[180px]">Stock vs reorder</th>
                <th className="px-3 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {s.inventory.map((it) => {
                const low = it.stock <= it.reorder;
                return (
                  <tr key={it.id} className="border-b border-line-soft last:border-0 hover:bg-brand-50/60 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-ink">{it.name}</p>
                      <p className="text-[10.5px] text-ink-faint font-mono">${it.cost}/{it.unit}</p>
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft">{it.category}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-line-soft overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${low ? "bg-danger-600" : "bg-brand-500"}`} style={{ width: `${Math.min(100, (it.stock / (it.reorder * 2.5)) * 100)}%` }} />
                        </div>
                        <span className={`font-mono text-[11.5px] font-semibold w-12 text-right ${low ? "text-danger-600" : "text-ink"}`}>{it.stock}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => adjustInventory(it.id, 10)} className="px-2 py-1 rounded-md bg-line-soft text-[11px] font-bold text-ink-soft hover:bg-brand-100 hover:text-brand-700 transition-colors">+10</button>
                        <button onClick={() => adjustInventory(it.id, -5)} className="px-2 py-1 rounded-md bg-line-soft text-[11px] font-bold text-ink-soft hover:bg-danger-100 hover:text-danger-700 transition-colors">−5</button>
                        {low && (
                          <button onClick={() => createPO(it.id, it.reorder * 2, s.suppliers[0].id)}
                            className="px-2 py-1 rounded-md bg-danger-600 text-[11px] font-bold text-white hover:bg-danger-700 transition-colors">Reorder</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-line rounded-xl p-4">
            <h3 className="font-display font-bold text-[15px] text-ink">Purchase orders</h3>
            <p className="text-xs text-ink-faint mt-0.5 mb-3">raised against suppliers</p>
            <ul className="space-y-2">
              {s.purchaseOrders.map((po) => {
                const item = s.inventory.find((i) => i.id === po.itemId);
                const sup = s.suppliers.find((x) => x.id === po.supplierId);
                return (
                  <li key={po.id} className="border border-line-soft rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[12px] font-bold text-ink">{po.code}</p>
                      <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${po.status === "received" ? "bg-brand-100 text-brand-700" : "bg-warn-100 text-warn-700"}`}>{po.status.toUpperCase()}</span>
                    </div>
                    <p className="text-[11.5px] text-ink-soft mt-1">{item?.name} ×{po.qty}</p>
                    <p className="micro text-ink-faint mt-0.5">{sup?.name}</p>
                    {po.status === "ordered" && (role === "admin" || role === "super" || role === "pharmacist") && (
                      <button onClick={() => receivePO(po.id)} className="mt-2 w-full py-1.5 rounded-md bg-pine-900 text-brand-200 text-[11px] font-bold hover:bg-pine-800 transition-colors">
                        Mark goods received
                      </button>
                    )}
                  </li>
                );
              })}
              {s.purchaseOrders.length === 0 && <p className="text-xs text-ink-faint text-center py-3">No open purchase orders.</p>}
            </ul>
          </div>

          <div className="bg-card border border-line rounded-xl p-4">
            <h3 className="font-display font-bold text-[15px] text-ink">Suppliers</h3>
            <ul className="mt-2 space-y-1.5">
              {s.suppliers.map((sp) => (
                <li key={sp.id} className="flex items-center gap-2.5 text-[12.5px]">
                  <I name="building" className="w-4 h-4 text-ink-faint" />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{sp.name}</p>
                    <p className="text-[10.5px] text-ink-faint">{sp.contact} · {sp.phone}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Gate() {
  const { s } = useApp();
  if (!s.session) return <SignIn />;
  return (
    <Shell>
      <Router />
    </Shell>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Gate />
    </AppProvider>
  );
}

/* keep ROLE_MAP referenced for potential extensions */
void ROLE_MAP;

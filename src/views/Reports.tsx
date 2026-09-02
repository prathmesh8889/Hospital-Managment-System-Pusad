import { useState } from "react";
import { useApp } from "../lib/store";
import { DX_STATS, OPD_7D, OPD_7D_LABELS, REVENUE_14D, REVENUE_BY_DEPT, billTotals, fmtMoney, fmtMoney0, fullName, timeAgo } from "../lib/data";
import { Bars, Btn, Card, Donut, Pill, Sparkline, Tabs, TextInput } from "../components/ui";
import { I } from "../components/icons";

export function Reports() {
  const { s, toast, hasPermission } = useApp();
  const role = s.session?.role ?? "admin";
  const [tab, setTab] = useState("ops");
  const [auditQ, setAuditQ] = useState("");

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="micro text-brand-700">Insight</p>
          <h1 className="font-display font-extrabold text-[22px] tracking-tight text-ink">Reports & analytics</h1>
        </div>
        {hasPermission("reports", "edit") && <div className="ml-auto">
          <Btn variant="outline" icon="download" onClick={() => exportReport(tab === "ops" ? "Operational report" : tab === "fin" ? "Financial report" : tab === "clin" ? "Clinical report" : "Audit log")}>
            Export view
          </Btn>
        </div>}
      </div>

      <Tabs
        tabs={[
          { id: "ops", label: "Operational" },
          { id: "fin", label: "Financial" },
          { id: "clin", label: "Clinical" },
          ...(showAudit ? [{ id: "audit", label: "Audit trail", count: s.audit.length }] : []),
        ]}
        active={tab} onChange={setTab}
      />

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

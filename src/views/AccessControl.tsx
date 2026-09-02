import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { MODULES, ROLES, ROLE_MAP } from "../lib/data";
import type { Role } from "../lib/data";
import { Avatar, Btn, Card, Pill } from "../components/ui";
import { I } from "../components/icons";

const MANAGED_ROLES = ROLES.filter((role) => role.id !== "super");

export function AccessControl() {
  const { s, setRolePermission, applyPermissionPreset, resetRolePermissions } = useApp();
  const [selectedRole, setSelectedRole] = useState<Role>("admin");
  const role = ROLE_MAP[selectedRole];
  const permissions = s.rolePermissions[selectedRole];

  const summary = useMemo(() => {
    const pages = MODULES.filter((module) => module.id !== "access");
    return {
      visible: pages.filter((module) => permissions[module.id].view).length,
      editable: pages.filter((module) => permissions[module.id].edit).length,
      total: pages.length,
    };
  }, [permissions]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div>
          <p className="micro text-brand-700">Super Administrator</p>
          <h1 className="font-display font-extrabold text-[22px] tracking-tight text-ink">Roles, pages & permissions</h1>
          <p className="text-[12.5px] text-ink-soft mt-1 max-w-2xl">
            Choose exactly which pages each role can see and whether its users can change the page content. Changes apply immediately and stay saved on this device.
          </p>
        </div>
        <Btn variant="outline" icon="refresh" className="sm:ml-auto" onClick={resetRolePermissions}>Restore defaults</Btn>
      </div>

      <div className="grid xl:grid-cols-[270px_minmax(0,1fr)] gap-4 items-start">
        <Card title="Hospital roles" sub="Select a role to configure" pad={false}>
          <div className="p-2 space-y-1 max-h-[610px] overflow-y-auto scroll-slim">
            {MANAGED_ROLES.map((item) => {
              const selected = item.id === selectedRole;
              const visibleCount = MODULES.filter((module) => module.id !== "access" && s.rolePermissions[item.id][module.id].view).length;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedRole(item.id)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left border transition-all ${selected ? "bg-brand-50 border-brand-500 shadow-sm" : "bg-white border-transparent hover:border-line hover:bg-line-soft/60"}`}
                >
                  <Avatar name={item.name} color={item.color} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-ink truncate">{item.label}</span>
                    <span className="block text-[10.5px] text-ink-faint">{visibleCount} pages visible</span>
                  </span>
                  <I name="chevron-r" className={`w-4 h-4 ${selected ? "text-brand-700" : "text-ink-faint"}`} />
                </button>
              );
            })}
          </div>
          <div className="border-t border-line-soft p-3 bg-line-soft/30">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-pine-900 text-brand-300 grid place-items-center"><I name="lock" className="w-3.5 h-3.5" /></span>
              <div>
                <p className="text-[11.5px] font-bold text-ink">Super Administrator</p>
                <p className="text-[10.5px] text-ink-faint">Always has full access</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4 min-w-0">
          <div className="bg-pine-900 pine-tex text-white rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={role.name} color={role.color} size={44} />
              <div className="min-w-0">
                <p className="micro text-brand-300">Editing access for</p>
                <h2 className="font-display font-extrabold text-lg truncate">{role.label}</h2>
                <p className="text-[11.5px] text-pine-100/65 truncate">{role.scope}</p>
              </div>
            </div>
            <div className="lg:ml-auto flex flex-wrap gap-2">
              <Pill tone="green">{summary.visible}/{summary.total} visible</Pill>
              <Pill tone="steel">{summary.editable}/{summary.total} editable</Pill>
            </div>
          </div>

          <Card title="Quick access presets" sub="Apply a starting point, then fine-tune individual pages">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <button onClick={() => applyPermissionPreset(selectedRole, "default")} className="rounded-lg border border-line px-3 py-2.5 text-left hover:border-brand-500 hover:bg-brand-50 transition-colors">
                <I name="refresh" className="w-4 h-4 text-brand-700" />
                <p className="text-[12px] font-bold text-ink mt-1">Role default</p>
                <p className="text-[10.5px] text-ink-faint">Recommended access</p>
              </button>
              <button onClick={() => applyPermissionPreset(selectedRole, "read")} className="rounded-lg border border-line px-3 py-2.5 text-left hover:border-brand-500 hover:bg-brand-50 transition-colors">
                <I name="eye" className="w-4 h-4 text-steel-700" />
                <p className="text-[12px] font-bold text-ink mt-1">Read only</p>
                <p className="text-[10.5px] text-ink-faint">View every page</p>
              </button>
              <button onClick={() => applyPermissionPreset(selectedRole, "full")} className="rounded-lg border border-line px-3 py-2.5 text-left hover:border-brand-500 hover:bg-brand-50 transition-colors">
                <I name="edit" className="w-4 h-4 text-warn-700" />
                <p className="text-[12px] font-bold text-ink mt-1">Full access</p>
                <p className="text-[10.5px] text-ink-faint">View and edit all</p>
              </button>
              <button onClick={() => applyPermissionPreset(selectedRole, "none")} className="rounded-lg border border-line px-3 py-2.5 text-left hover:border-danger-600 hover:bg-danger-50 transition-colors">
                <I name="x" className="w-4 h-4 text-danger-600" />
                <p className="text-[12px] font-bold text-ink mt-1">No access</p>
                <p className="text-[10.5px] text-ink-faint">Hide every page</p>
              </button>
            </div>
          </Card>

          <Card title="Page permissions" sub="View controls sidebar visibility; Edit controls actions and record changes" pad={false}>
            <div className="overflow-x-auto scroll-slim">
              <table className="w-full min-w-[560px] text-[12.5px]">
                <thead>
                  <tr className="micro text-ink-faint text-left border-b border-line bg-line-soft/35">
                    <th className="px-4 py-2.5 font-medium">Page / function</th>
                    <th className="px-3 py-2.5 font-medium text-center w-28">View</th>
                    <th className="px-3 py-2.5 font-medium text-center w-28">Edit</th>
                    <th className="px-4 py-2.5 font-medium w-28">Access</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.filter((module) => module.id !== "access").map((module) => {
                    const permission = permissions[module.id];
                    return (
                      <tr key={module.id} className="border-b border-line-soft last:border-0 hover:bg-brand-50/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-lg bg-line-soft text-ink-soft grid place-items-center"><I name={module.icon} className="w-4 h-4" /></span>
                            <div>
                              <p className="font-bold text-ink">{module.label}</p>
                              <p className="text-[10.5px] text-ink-faint">{module.group}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => setRolePermission(selectedRole, module.id, "view", !permission.view)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${permission.view ? "bg-brand-600" : "bg-line"}`}
                            aria-label={`${permission.view ? "Hide" : "Show"} ${module.label}`}
                          >
                            <span className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${permission.view ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => setRolePermission(selectedRole, module.id, "edit", !permission.edit)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${permission.edit ? "bg-warn-600" : "bg-line"}`}
                            aria-label={`${permission.edit ? "Disable" : "Enable"} editing on ${module.label}`}
                          >
                            <span className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${permission.edit ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <Pill tone={permission.edit ? "amber" : permission.view ? "steel" : "gray"}>
                            {permission.edit ? "Can edit" : permission.view ? "View only" : "Hidden"}
                          </Pill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

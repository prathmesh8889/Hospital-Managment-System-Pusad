import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  makeSeed, uid, nowISO, ROLE_MAP, billTotals, fullName, fmtMoney, LAB_CATALOG, CREDENTIALS,
  MODULES, makeDefaultRolePermissions,
} from "./data";
import type {
  SeedData, Role, ModuleId, Appointment, Consultation, Prescription, PrescriptionItem,
  LabAnalyte, LabOrder, Bill, BillItem, Payment, Bed, Admission, AppNotification, AuditEvent, Vitals,
  PermissionAction, RolePermissions,
} from "./data";

export interface ProfileOverride { name?: string; phone?: string; email?: string }

export interface AppState extends SeedData {
  session: { role: Role; userId: string } | null;
  view: ModuleId;
  focusPatientId: string | null;
  bookPatientId: string | null;
  branchId: string;
  hospitalName: string;
  profiles: Partial<Record<Role, ProfileOverride>>;
  passwordOverrides: Partial<Record<Role, string>>;
  rolePermissions: RolePermissions;
  permissionSchemaVersion: number;
}

export interface Toast { id: number; kind: "success" | "error" | "info" | "warning"; title: string; desc?: string; }

interface AppCtx {
  s: AppState;
  toasts: Toast[];
  dismiss: (id: number) => void;
  toast: (kind: Toast["kind"], title: string, desc?: string) => void;
  signIn: (role: Role) => void;
  signOut: () => void;
  attemptLogin: (role: Role, username: string, password: string) => boolean;
  updateProfile: (role: Role, patch: ProfileOverride) => void;
  changePassword: (role: Role, current: string, next: string) => boolean;
  updatePatientContact: (patientId: string, patch: { phone?: string; email?: string; address?: string; emergencyName?: string; emergencyPhone?: string }) => void;
  effectiveCredentials: Record<Role, { username: string; password: string }>;
  reset: () => void;
  go: (view: ModuleId, focusPatientId?: string | null) => void;
  setBookPatient: (id: string | null) => void;
  setBranch: (id: string) => void;
  setHospitalName: (name: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  registerPatient: (p: Omit<AppState["patients"][number], "id" | "code" | "registeredAt" | "color">) => string;
  updatePatientClinical: (patientId: string, patch: { conditions: string[]; allergies: string[] }) => void;
  bookAppointment: (a: Pick<Appointment, "patientId" | "doctorId" | "dayOffset" | "time" | "type" | "reason">) => void;
  cancelAppointment: (id: string) => void;
  checkIn: (id: string) => void;
  startConsult: (appointmentId: string) => void;
  saveVitals: (consultationId: string, vitals: Vitals) => void;
  updateConsult: (id: string, patch: Partial<Consultation>) => void;
  completeConsult: (id: string) => void;
  sendPrescription: (patientId: string, items: PrescriptionItem[], notes: string) => void;
  dispense: (rxId: string) => void;
  orderLab: (patientId: string, doctorId: string, testIds: string[], urgent: boolean) => void;
  advanceLab: (id: string, status: LabOrder["status"]) => void;
  saveLabResults: (id: string, analytes: LabAnalyte[]) => void;
  verifyLab: (id: string) => void;
  setImaging: (id: string, patch: Partial<AppState["imagingOrders"][number]>) => void;
  createAdmission: (a: Pick<Admission, "patientId" | "doctorId" | "wardId" | "reason" | "plan" | "bedId">) => void;
  assignBed: (admissionId: string, bedId: string) => void;
  discharge: (admissionId: string, summary: string) => void;
  setBedStatus: (bedId: string, status: Bed["status"]) => void;
  addProgressNote: (admissionId: string, text: string) => void;
  recordPayment: (billId: string, amount: number, method: Payment["method"]) => void;
  updateBillPayments: (billId: string, payments: Payment[]) => void;
  submitClaim: (billId: string) => void;
  createBill: (patientId: string, items: BillItem[]) => void;
  updateBill: (billId: string, patch: Pick<Bill, "items" | "discount" | "taxRate" | "status" | "claimStatus">) => void;
  hasPermission: (module: ModuleId, action?: PermissionAction, role?: Role) => boolean;
  setRolePermission: (role: Role, module: ModuleId, action: PermissionAction, enabled: boolean) => void;
  applyPermissionPreset: (role: Role, preset: "none" | "read" | "full" | "default") => void;
  resetRolePermissions: () => void;
  restock: (medicineId: string, qty: number) => void;
  adjustInventory: (itemId: string, qty: number) => void;
  createPO: (itemId: string, qty: number, supplierId: string) => void;
  receivePO: (poId: string) => void;
}

const Ctx = createContext<AppCtx | null>(null);

const STORAGE_KEY = "aurelia-hms-v3";

const DEFAULT_HOSPITAL = "IT CYBER HOSPITAL";
const LEGACY_HOSPITAL = "St. Aurelia Medical Center";

const freshState = (): AppState => ({
  ...makeSeed(),
  session: null,
  view: "dashboard",
  focusPatientId: null,
  bookPatientId: null,
  branchId: "main",
  hospitalName: DEFAULT_HOSPITAL,
  profiles: {},
  passwordOverrides: {},
  rolePermissions: makeDefaultRolePermissions(),
  permissionSchemaVersion: 2,
});

const loadState = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && parsed.patients && parsed.medicines && parsed.session !== undefined) {
        const state = { ...freshState(), ...parsed };
        const defaults = makeDefaultRolePermissions();
        state.rolePermissions = defaults;
        (Object.keys(defaults) as Role[]).forEach((role) => {
          MODULES.forEach((module) => {
            state.rolePermissions[role][module.id] = {
              ...defaults[role][module.id],
              ...(parsed.rolePermissions?.[role]?.[module.id] ?? {}),
            };
          });
        });
        if ((parsed.permissionSchemaVersion ?? 0) < 2) {
          state.rolePermissions.doctor.billing = { view: true, edit: true };
        }
        state.permissionSchemaVersion = 2;
        // rebrand: upgrade saved facility name unless the user set a custom one
        if (state.hospitalName === LEGACY_HOSPITAL) state.hospitalName = DEFAULT_HOSPITAL;
        return state;
      }
    }
  } catch { /* corrupted state — fall through to seed */ }
  return freshState();
};

let toastSeq = 1;

export function AppProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<AppState>(loadState);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* quota */ }
  }, [s]);

  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); }, []);

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);

  const toast = useCallback((kind: Toast["kind"], title: string, desc?: string) => {
    const id = toastSeq++;
    setToasts((ts) => [...ts.slice(-3), { id, kind, title, desc }]);
    timers.current.push(window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 4600));
  }, []);

  /* helpers to compute derived side-effects inside a setState */
  const withMeta = useCallback(
    (prev: AppState, action: string, entity: string, note?: Omit<AppNotification, "id" | "at" | "read">): AppState => {
      const role = prev.session?.role ?? "admin";
      const user = ROLE_MAP[role].name;
      const audit: AuditEvent = { id: uid("AU"), user, role, action, entity, at: nowISO(), ip: "10.4.2.21" };
      const notifications = note
        ? [{ id: uid("N"), at: nowISO(), read: false, ...note }, ...prev.notifications].slice(0, 40)
        : prev.notifications;
      return { ...prev, audit: [audit, ...prev.audit].slice(0, 120), notifications };
    }, []);

  const signIn = useCallback((role: Role) => {
    setS((prev) => ({
      ...prev,
      session: { role, userId: ROLE_MAP[role].name },
      view: prev.rolePermissions[role]?.[role === "patient" ? "portal" : "dashboard"]?.view
        ? (role === "patient" ? "portal" : "dashboard")
        : (MODULES.find((module) => prev.rolePermissions[role]?.[module.id]?.view)?.id ?? "dashboard"),
      audit: [{ id: uid("AU"), user: ROLE_MAP[role].name, role, action: "Signed in", entity: "Session · " + ROLE_MAP[role].label, at: nowISO(), ip: "10.4.2.21" }, ...prev.audit].slice(0, 120),
    }));
    toast("success", `Signed in as ${ROLE_MAP[role].name}`, ROLE_MAP[role].scope);
  }, [toast]);

  const signOut = useCallback(() => {
    setS((prev) => ({ ...prev, session: null }));
  }, []);

  /* ---------------- profile & security ---------------- */

  const attemptLogin = useCallback(
    (role: Role, username: string, password: string): boolean => {
      const c = CREDENTIALS[role];
      const effPass = s.passwordOverrides[role] ?? c.password;
      if (username.trim().toLowerCase() !== c.username || password !== effPass) {
        setS((prev) => ({
          ...prev,
          audit: [{ id: uid("AU"), user: username.trim() || "unknown", role, action: "Failed sign-in attempt", entity: "Session · auth", at: nowISO(), ip: "10.4.2.31" }, ...prev.audit].slice(0, 120),
        }));
        return false;
      }
      signIn(role);
      return true;
    },
    [s.passwordOverrides, signIn]
  );

  const updateProfile = useCallback(
    (role: Role, patch: ProfileOverride) => {
      setS((prev) =>
        withMeta(
          { ...prev, profiles: { ...prev.profiles, [role]: { ...(prev.profiles[role] ?? {}), ...patch } } },
          "Updated profile",
          `${ROLE_MAP[role].name} · contact details`
        )
      );
      toast("success", "Profile saved", "Your details are updated across the console.");
    },
    [withMeta, toast]
  );

  const changePassword = useCallback(
    (role: Role, current: string, next: string): boolean => {
      const effPass = s.passwordOverrides[role] ?? CREDENTIALS[role].password;
      if (current !== effPass) {
        toast("error", "Current password is incorrect", "Check the password you use to sign in.");
        return false;
      }
      if (next.length < 6) {
        toast("error", "New password too short", "Use at least 6 characters.");
        return false;
      }
      setS((prev) =>
        withMeta(
          { ...prev, passwordOverrides: { ...prev.passwordOverrides, [role]: next } },
          "Changed password",
          `${ROLE_MAP[role].name} · security`
        )
      );
      toast("success", "Password updated", "Use the new password from the next sign-in.");
      return true;
    },
    [s.passwordOverrides, withMeta, toast]
  );

  const updatePatientContact = useCallback(
    (patientId: string, patch: { phone?: string; email?: string; address?: string; emergencyName?: string; emergencyPhone?: string }) => {
      setS((prev) => {
        const p = prev.patients.find((x) => x.id === patientId);
        if (!p) return prev;
        return withMeta(
          { ...prev, patients: prev.patients.map((x) => (x.id === patientId ? { ...x, ...patch } : x)) },
          "Updated contact details",
          `${p.code} · ${fullName(p)}`
        );
      });
      toast("success", "Contact details saved", "The front desk will see the updated information.");
    },
    [withMeta, toast]
  );

  const effectiveCredentials = useMemo(() => {
    const out = {} as Record<Role, { username: string; password: string }>;
    (Object.keys(CREDENTIALS) as Role[]).forEach((r) => {
      out[r] = { username: CREDENTIALS[r].username, password: s.passwordOverrides[r] ?? CREDENTIALS[r].password };
    });
    return out;
  }, [s.passwordOverrides]);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setS(freshState());
    toast("info", "Demo data reset", "All records restored to the seeded snapshot.");
  }, [toast]);

  const go = useCallback((view: ModuleId, focusPatientId: string | null = null) => {
    setS((prev) => {
      const role = prev.session?.role;
      if (role && !prev.rolePermissions[role]?.[view]?.view) return prev;
      return { ...prev, view, focusPatientId };
    });
  }, []);

  const hasPermission = useCallback(
    (module: ModuleId, action: PermissionAction = "view", roleOverride?: Role) => {
      const role = roleOverride ?? s.session?.role;
      if (!role) return false;
      if (role === "super") return true;
      return Boolean(s.rolePermissions[role]?.[module]?.[action]);
    },
    [s.rolePermissions, s.session?.role]
  );

  const setRolePermission = useCallback(
    (role: Role, module: ModuleId, action: PermissionAction, enabled: boolean) => {
      if (role === "super" || module === "access") {
        toast("warning", "Protected permission", "Super Admin access control cannot be disabled.");
        return;
      }
      setS((prev) => {
        const current = prev.rolePermissions[role][module];
        const next = action === "view" && !enabled
          ? { view: false, edit: false }
          : action === "edit" && enabled
            ? { view: true, edit: true }
            : { ...current, [action]: enabled };
        const nextState = {
          ...prev,
          rolePermissions: {
            ...prev.rolePermissions,
            [role]: { ...prev.rolePermissions[role], [module]: next },
          },
        };
        return withMeta(nextState, "Changed role permission", `${ROLE_MAP[role].label} · ${module} · ${action} ${enabled ? "enabled" : "disabled"}`);
      });
    },
    [toast, withMeta]
  );

  const applyPermissionPreset = useCallback(
    (role: Role, preset: "none" | "read" | "full" | "default") => {
      if (role === "super") return;
      setS((prev) => {
        const defaults = makeDefaultRolePermissions();
        const next = { ...prev.rolePermissions[role] };
        MODULES.forEach((module) => {
          if (module.id === "access") {
            next[module.id] = { view: false, edit: false };
          } else if (preset === "default") {
            next[module.id] = defaults[role][module.id];
          } else {
            next[module.id] = {
              view: preset !== "none",
              edit: preset === "full",
            };
          }
        });
        return withMeta(
          { ...prev, rolePermissions: { ...prev.rolePermissions, [role]: next } },
          "Applied permission preset",
          `${ROLE_MAP[role].label} · ${preset}`
        );
      });
      toast("success", "Role access updated", `${ROLE_MAP[role].label} now uses the ${preset} preset.`);
    },
    [toast, withMeta]
  );

  const resetRolePermissions = useCallback(() => {
    setS((prev) => withMeta({ ...prev, rolePermissions: makeDefaultRolePermissions() }, "Reset role permissions", "All roles · system defaults"));
    toast("success", "Default permissions restored", "All page and edit permissions were reset.");
  }, [toast, withMeta]);

  const setBookPatient = useCallback((id: string | null) => setS((prev) => ({ ...prev, bookPatientId: id })), []);
  const setBranch = useCallback((id: string) => setS((prev) => ({ ...prev, branchId: id })), []);

  const setHospitalName = useCallback(
    (name: string) => {
      const clean = name.trim();
      if (!clean) { toast("error", "Name required", "The facility name cannot be empty."); return; }
      setS((prev) =>
        withMeta({ ...prev, hospitalName: clean }, "Renamed facility", `“${prev.hospitalName}” → “${clean}”`)
      );
      toast("success", "Facility name updated", `Now displaying “${clean}” across the console.`);
    },
    [withMeta, toast]
  );
  const markRead = useCallback((id: string) => setS((prev) => ({ ...prev, notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })), []);
  const markAllRead = useCallback(() => setS((prev) => ({ ...prev, notifications: prev.notifications.map((n) => ({ ...n, read: true })) })), []);

  /* ---------------- patients ---------------- */

  const registerPatient = useCallback(
    (p: Omit<AppState["patients"][number], "id" | "code" | "registeredAt" | "color">) => {
      const maxNum = s.patients.reduce((m, x) => Math.max(m, parseInt(x.code.slice(3), 10) || 0), 1000);
      const code = `PT-${maxNum + 1}`;
      setS((prev) => {
        const colors = ["#0e8262", "#38688f", "#b4690e", "#be4b32", "#2f8f83", "#7a5cc0"];
        const np = { ...p, id: uid("P"), code, registeredAt: new Date().toISOString().slice(0, 10), color: colors[maxNum % colors.length] };
        return withMeta(
          { ...prev, patients: [np, ...prev.patients] },
          "Registered patient",
          `${code} · ${p.firstName} ${p.lastName}`,
          { title: "New patient registered", desc: `${p.firstName} ${p.lastName} · ${code}`, kind: "info", audience: ["admin", "super", "reception"] }
        );
      });
      return code;
    },
    [s.patients, withMeta]
  );

  const updatePatientClinical = useCallback(
    (patientId: string, patch: { conditions: string[]; allergies: string[] }) => {
      setS((prev) => {
        const p = prev.patients.find((x) => x.id === patientId);
        if (!p) return prev;
        const allergyChanged = JSON.stringify([...p.allergies].sort()) !== JSON.stringify([...patch.allergies].sort());
        return withMeta(
          { ...prev, patients: prev.patients.map((x) => (x.id === patientId ? { ...x, conditions: patch.conditions, allergies: patch.allergies } : x)) },
          "Updated clinical profile",
          `${p.code} · ${fullName(p)}`,
          allergyChanged
            ? { title: "Allergy record changed", desc: `${fullName(p)} — dispensing safety checks now use: ${patch.allergies.join(", ") || "no known allergies"}`, kind: "warning", audience: ["pharmacist", "doctor", "admin", "super"] }
            : undefined
        );
      });
      toast("success", "Clinical profile saved", "Conditions and allergy record updated for the whole care team.");
    },
    [withMeta, toast]
  );

  /* ---------------- appointments ---------------- */

  const bookAppointment = useCallback(
    (a: Pick<Appointment, "patientId" | "doctorId" | "dayOffset" | "time" | "type" | "reason">) => {
      setS((prev) => {
        const appt: Appointment = { ...a, id: uid("APT"), status: "scheduled", createdAt: nowISO() };
        const patient = prev.patients.find((p) => p.id === a.patientId);
        return withMeta(
          { ...prev, appointments: [...prev.appointments, appt] },
          "Booked appointment",
          `${patient?.code ?? ""} · ${a.time} ${a.dayOffset === 0 ? "today" : `offset ${a.dayOffset}`}`,
          { title: "Appointment confirmed", desc: `${patient ? fullName(patient) : "Patient"} · ${a.time}`, kind: "success", audience: ["patient", "reception", "admin", "super"] }
        );
      });
    },
    [withMeta]
  );

  const cancelAppointment = useCallback(
    (id: string) => {
      setS((prev) => withMeta(
        { ...prev, appointments: prev.appointments.map((a) => (a.id === id ? { ...a, status: "cancelled" as const } : a)) },
        "Cancelled appointment", id
      ));
    },
    [withMeta]
  );

  const checkIn = useCallback(
    (id: string) => {
      setS((prev) => {
        const todayTokens = prev.appointments.filter((a) => a.dayOffset === 0 && a.token).map((a) => a.token ?? 0);
        const token = Math.max(0, ...todayTokens) + 1;
        const appt = prev.appointments.find((a) => a.id === id);
        const patient = prev.patients.find((p) => p.id === appt?.patientId);
        return withMeta(
          { ...prev, appointments: prev.appointments.map((a) => (a.id === id ? { ...a, status: "checked-in" as const, token, checkInAt: nowISO() } : a)) },
          "Checked-in patient",
          `Token Q-${token} · ${patient?.code ?? id}`
        );
      });
    },
    [withMeta]
  );

  /* ---------------- OPD / consultations ---------------- */

  const startConsult = useCallback(
    (appointmentId: string) => {
      setS((prev) => {
        const appt = prev.appointments.find((a) => a.id === appointmentId);
        if (!appt) return prev;
        const existing = prev.consultations.find((c) => c.appointmentId === appointmentId);
        const consultations = existing
          ? prev.consultations
          : [{ id: uid("C"), appointmentId, patientId: appt.patientId, doctorId: appt.doctorId, vitals: {}, complaint: appt.reason, examination: "", diagnosis: "", advice: "", status: "draft" as const, at: nowISO() }, ...prev.consultations];
        return withMeta(
          {
            ...prev,
            consultations,
            appointments: prev.appointments.map((a) => (a.id === appointmentId ? { ...a, status: "in-consultation" as const } : a)),
            doctors: prev.doctors.map((d) => (d.id === appt.doctorId ? { ...d, status: "in-consultation" as const } : d)),
          },
          "Started consultation",
          appt.patientId
        );
      });
    },
    [withMeta]
  );

  const saveVitals = useCallback(
    (consultationId: string, vitals: Vitals) => {
      setS((prev) => {
        const c = prev.consultations.find((x) => x.id === consultationId);
        const patient = prev.patients.find((p) => p.id === c?.patientId);
        return withMeta(
          { ...prev, consultations: prev.consultations.map((x) => (x.id === consultationId ? { ...x, vitals } : x)) },
          "Recorded vitals",
          `${patient?.code ?? ""} · BP ${vitals.bpSys ?? "—"}/${vitals.bpDia ?? "—"}`
        );
      });
      toast("success", "Vitals saved", "Observations attached to the encounter.");
    },
    [withMeta, toast]
  );

  const updateConsult = useCallback((id: string, patch: Partial<Consultation>) => {
    setS((prev) => ({ ...prev, consultations: prev.consultations.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);

  const completeConsult = useCallback(
    (id: string) => {
      setS((prev) => {
        const c = prev.consultations.find((x) => x.id === id);
        if (!c) return prev;
        const appt = c.appointmentId ? prev.appointments.find((a) => a.id === c.appointmentId) : undefined;
        const doctor = prev.doctors.find((d) => d.id === c.doctorId);
        const patient = prev.patients.find((p) => p.id === c.patientId);
        const item: BillItem = { desc: `OPD Consultation — ${doctor?.specialization ?? "General"}`, kind: "consultation", qty: 1, price: doctor?.fee ?? 90 };
        let bills = prev.bills;
        if (appt) {
          const existing = bills.find((b) => b.items.some((i) => i.desc.startsWith("OPD Consultation")) && b.patientId === c.patientId && b.createdAt.slice(0, 10) === nowISO().slice(0, 10) && b.status === "unpaid" && b.items.length === 1);
          bills = existing
            ? bills.map((b) => (b.id === existing.id ? { ...b, items: [...b.items, item] } : b))
            : [{ id: uid("B"), code: `INV-${3204 + bills.length}`, patientId: c.patientId, items: [item], discount: 0, taxRate: 8, payments: [], status: "unpaid" as const, createdAt: nowISO(), claimStatus: "none" as const }, ...bills];
        }
        return withMeta(
          {
            ...prev,
            bills,
            consultations: prev.consultations.map((x) => (x.id === id ? { ...x, status: "completed" as const, completedAt: nowISO() } : x)),
            appointments: prev.appointments.map((a) => (a.id === c.appointmentId ? { ...a, status: "completed" as const } : a)),
            doctors: prev.doctors.map((d) => (d.id === c.doctorId ? { ...d, status: "available" as const } : d)),
          },
          "Completed consultation",
          `${patient?.code ?? ""} · ${c.diagnosis.slice(0, 40)}`
        );
      });
      toast("success", "Consultation completed", "Visit closed and consultation fee billed.");
    },
    [withMeta, toast]
  );

  /* ---------------- prescriptions & pharmacy ---------------- */

  const sendPrescription = useCallback(
    (patientId: string, items: PrescriptionItem[], notes: string) => {
      const code = `RX-${8844 + s.prescriptions.length}`;
      setS((prev) => {
        const doctor = prev.session?.role === "doctor" ? "d1" : prev.doctors[1].id;
        const rx: Prescription = { id: uid("RX"), code, patientId, doctorId: doctor, items, notes, status: "sent", createdAt: nowISO() };
        const patient = prev.patients.find((p) => p.id === patientId);
        return withMeta(
          { ...prev, prescriptions: [rx, ...prev.prescriptions] },
          "Issued prescription",
          `${code} · ${patient?.code ?? patientId}`,
          { title: `Prescription ${code} to dispense`, desc: `${patient ? fullName(patient) : ""} · ${items.length} item(s)`, kind: "info", audience: ["pharmacist", "super"] }
        );
      });
      toast("success", `Prescription ${code} sent`, "The pharmacy queue has been updated.");
    },
    [s.prescriptions.length, withMeta, toast]
  );

  const dispense = useCallback(
    (rxId: string) => {
      let ok = true;
      let shortName = "";
      setS((prev) => {
        const rx = prev.prescriptions.find((r) => r.id === rxId);
        if (!rx) return prev;
        for (const it of rx.items) {
          const med = prev.medicines.find((m) => m.id === it.medicineId);
          if (!med || med.stock < it.qty) { ok = false; shortName = med?.name ?? it.medicineId; return prev; }
        }
        const medicines = prev.medicines.map((m) => {
          const it = rx.items.find((i) => i.medicineId === m.id);
          return it ? { ...m, stock: m.stock - it.qty } : m;
        });
        const billItems: BillItem[] = rx.items.map((it) => {
          const med = prev.medicines.find((m) => m.id === it.medicineId)!;
          return { desc: `${med.name} ×${it.qty}`, kind: "medicine" as const, qty: it.qty, price: med.price };
        });
        const bill: Bill = { id: uid("B"), code: `INV-${3204 + prev.bills.length}`, patientId: rx.patientId, items: billItems, discount: 0, taxRate: 8, payments: [], status: "unpaid", createdAt: nowISO(), claimStatus: "none" };
        const lowStock = medicines.filter((m) => m.stock <= m.reorder);
        const patient = prev.patients.find((p) => p.id === rx.patientId);
        return withMeta(
          {
            ...prev,
            medicines,
            bills: [bill, ...prev.bills],
            prescriptions: prev.prescriptions.map((r) => (r.id === rxId ? { ...r, status: "dispensed" as const } : r)),
          },
          `Dispensed ${rx.code}`,
          `${patient?.code ?? ""} · invoice ${bill.code}`,
          lowStock.length
            ? { title: "Low stock after dispensing", desc: lowStock.map((m) => m.name).join(", "), kind: "warning", audience: ["pharmacist", "admin", "super"] }
            : undefined
        );
      });
      if (ok) toast("success", "Medicines dispensed", "Stock adjusted and pharmacy invoice created.");
      else toast("error", "Cannot dispense", `Insufficient stock: ${shortName}.`);
    },
    [withMeta, toast]
  );

  const restock = useCallback(
    (medicineId: string, qty: number) => {
      setS((prev) => {
        const med = prev.medicines.find((m) => m.id === medicineId);
        return withMeta(
          { ...prev, medicines: prev.medicines.map((m) => (m.id === medicineId ? { ...m, stock: m.stock + qty } : m)) },
          `Restocked +${qty}`,
          med?.name ?? medicineId
        );
      });
      toast("success", "Stock received", `Added ${qty} units to inventory.`);
    },
    [withMeta, toast]
  );

  /* ---------------- lab & imaging ---------------- */

  const orderLab = useCallback(
    (patientId: string, doctorId: string, testIds: string[], urgent: boolean) => {
      setS((prev) => {
        const tests = LAB_CATALOG.filter((t) => testIds.includes(t.id));
        const analytes = tests.flatMap((t) => t.analytes.map((a) => ({ ...a })));
        const code = `LAB-${3314 + prev.labOrders.length}`;
        const order: LabOrder = { id: uid("LO"), code, patientId, doctorId, dayOffset: 0, tests: testIds, status: "ordered", urgent, analytes };
        const labItems: BillItem[] = tests.map((t) => ({ desc: t.name, kind: "lab" as const, qty: 1, price: t.price }));
        const bill: Bill = { id: uid("B"), code: `INV-${3204 + prev.bills.length}`, patientId, items: labItems, discount: 0, taxRate: 8, payments: [], status: "unpaid", createdAt: nowISO(), claimStatus: "none" };
        const patient = prev.patients.find((p) => p.id === patientId);
        return withMeta(
          { ...prev, labOrders: [order, ...prev.labOrders], bills: [bill, ...prev.bills] },
          `Ordered lab panel ${code}`,
          `${patient?.code ?? ""} · ${tests.map((t) => t.name).join(", ")}`,
          { title: `${code} received in lab`, desc: `${patient ? fullName(patient) : ""} · ${tests.length} test(s)${urgent ? " · URGENT" : ""}`, kind: urgent ? "warning" : "info", audience: ["lab", "super"] }
        );
      });
      toast("success", "Lab order placed", "Samples will appear in the laboratory queue.");
    },
    [withMeta, toast]
  );

  const advanceLab = useCallback(
    (id: string, status: LabOrder["status"]) => {
      setS((prev) => withMeta(
        { ...prev, labOrders: prev.labOrders.map((o) => (o.id === id ? { ...o, status, technician: status === "collected" || status === "processing" ? "Ingrid Sørensen" : o.technician } : o)) },
        `Sample ${status}`,
        prev.labOrders.find((o) => o.id === id)?.code ?? id
      ));
    },
    [withMeta]
  );

  const saveLabResults = useCallback(
    (id: string, analytes: LabAnalyte[]) => {
      setS((prev) => withMeta(
        { ...prev, labOrders: prev.labOrders.map((o) => (o.id === id ? { ...o, analytes, status: "completed" as const } : o)) },
        "Entered results",
        prev.labOrders.find((o) => o.id === id)?.code ?? id
      ));
      toast("success", "Results saved", "Report is awaiting doctor verification.");
    },
    [withMeta, toast]
  );

  const verifyLab = useCallback(
    (id: string) => {
      setS((prev) => {
        const order = prev.labOrders.find((o) => o.id === id);
        const patient = prev.patients.find((p) => p.id === order?.patientId);
        const abnormal = order?.analytes.filter((a) => a.result !== undefined && (a.result < a.low || a.result > a.high)).length ?? 0;
        return withMeta(
          { ...prev, labOrders: prev.labOrders.map((o) => (o.id === id ? { ...o, status: "verified" as const, verifiedAt: nowISO() } : o)) },
          "Verified lab report",
          order?.code ?? id,
          { title: "Lab results ready", desc: `${order?.code} · ${patient ? fullName(patient) : ""}${abnormal ? ` — ${abnormal} abnormal value(s)` : ""}`, kind: abnormal ? "warning" : "success", audience: ["doctor", "patient", "admin", "super"] }
        );
      });
      toast("success", "Report verified", "Doctor and patient have been notified.");
    },
    [withMeta, toast]
  );

  const setImaging = useCallback(
    (id: string, patch: Partial<AppState["imagingOrders"][number]>) => {
      setS((prev) => {
        const order = prev.imagingOrders.find((o) => o.id === id);
        const patient = prev.patients.find((p) => p.id === order?.patientId);
        return withMeta(
          { ...prev, imagingOrders: prev.imagingOrders.map((o) => (o.id === id ? { ...o, ...patch } : o)) },
          `Imaging → ${patch.status ?? "updated"}`,
          order?.code ?? id,
          patch.status === "reported"
            ? { title: "Radiology report ready", desc: `${order?.code} · ${patient ? fullName(patient) : ""}`, kind: "info", audience: ["doctor", "patient", "admin", "super"] }
            : undefined
        );
      });
    },
    [withMeta]
  );

  /* ---------------- inpatient ---------------- */

  const createAdmission = useCallback(
    (a: Pick<Admission, "patientId" | "doctorId" | "wardId" | "reason" | "plan" | "bedId">) => {
      setS((prev) => {
        const code = `ADM-${2205 + prev.admissions.length}`;
        const adm: Admission = { id: uid("ADM"), code, ...a, admittedOffset: 0, status: a.bedId ? "active" : "pending", notes: [] };
        let beds = prev.beds;
        if (a.bedId) beds = prev.beds.map((b) => (b.id === a.bedId ? { ...b, status: "occupied" as const, patientId: a.patientId, admissionId: adm.id } : b));
        const patient = prev.patients.find((p) => p.id === a.patientId);
        return withMeta(
          { ...prev, admissions: [adm, ...prev.admissions], beds },
          `Admitted patient ${code}`,
          `${patient?.code ?? ""} · ${a.reason}`,
          { title: `Admission ${code}`, desc: `${patient ? fullName(patient) : ""} — ${a.reason}`, kind: "info", audience: ["nurse", "admin", "super", "doctor"] }
        );
      });
      toast("success", "Admission created", "The inpatient team has been notified.");
    },
    [withMeta, toast]
  );

  const assignBed = useCallback(
    (admissionId: string, bedId: string) => {
      setS((prev) => {
        const adm = prev.admissions.find((a) => a.id === admissionId);
        const patient = prev.patients.find((p) => p.id === adm?.patientId);
        const bed = prev.beds.find((b) => b.id === bedId);
        return withMeta(
          {
            ...prev,
            beds: prev.beds.map((b) => (b.id === bedId ? { ...b, status: "occupied" as const, patientId: adm?.patientId, admissionId } : b)),
            admissions: prev.admissions.map((a) => (a.id === admissionId ? { ...a, bedId, wardId: bed?.wardId ?? a.wardId, status: "active" as const } : a)),
          },
          `Assigned bed ${bed?.label}`,
          `${adm?.code} · ${patient?.code ?? ""}`
        );
      });
      toast("success", "Bed assigned", "Patient moved to active inpatient list.");
    },
    [withMeta, toast]
  );

  const setBedStatus = useCallback(
    (bedId: string, status: Bed["status"]) => {
      setS((prev) => {
        const bed = prev.beds.find((b) => b.id === bedId);
        return withMeta(
          { ...prev, beds: prev.beds.map((b) => (b.id === bedId ? { ...b, status, patientId: status === "available" ? undefined : b.patientId, admissionId: status === "available" ? undefined : b.admissionId } : b)) },
          `Bed ${bed?.label} → ${status}`,
          bed?.label ?? bedId
        );
      });
    },
    [withMeta]
  );

  const addProgressNote = useCallback(
    (admissionId: string, text: string) => {
      setS((prev) => {
        const role = prev.session?.role ?? "nurse";
        return withMeta(
          { ...prev, admissions: prev.admissions.map((a) => (a.id === admissionId ? { ...a, notes: [...a.notes, { at: nowISO(), by: ROLE_MAP[role].name, text }] } : a)) },
          "Added progress note",
          prev.admissions.find((a) => a.id === admissionId)?.code ?? admissionId
        );
      });
      toast("success", "Progress note saved", "");
    },
    [withMeta, toast]
  );

  const discharge = useCallback(
    (admissionId: string, summary: string) => {
      setS((prev) => {
        const adm = prev.admissions.find((a) => a.id === admissionId);
        if (!adm) return prev;
        const bed = prev.beds.find((b) => b.id === adm.bedId);
        const nights = Math.max(1, -adm.admittedOffset);
        const items: BillItem[] = [
          { desc: `Ward bed (${bed?.label ?? "General"}) ×${nights} night(s)`, kind: "bed", qty: nights, price: bed?.rate ?? 90 },
          { desc: "Discharge medication pack", kind: "medicine", qty: 1, price: 24 },
        ];
        const bill: Bill = { id: uid("B"), code: `INV-${3204 + prev.bills.length}`, patientId: adm.patientId, items, discount: 0, taxRate: 8, payments: [], status: "unpaid", createdAt: nowISO(), claimStatus: "none" };
        const patient = prev.patients.find((p) => p.id === adm.patientId);
        return withMeta(
          {
            ...prev,
            beds: prev.beds.map((b) => (b.id === adm.bedId ? { ...b, status: "cleaning" as const, patientId: undefined, admissionId: undefined } : b)),
            admissions: prev.admissions.map((a) => (a.id === admissionId ? { ...a, status: "discharged" as const, dischargeSummary: summary } : a)),
            bills: [bill, ...prev.bills],
          },
          `Discharged ${adm.code}`,
          `${patient?.code ?? ""} · final bill ${bill.code}`,
          { title: "Bed ready for turnover", desc: `${bed?.label ?? "Bed"} flagged for cleaning after discharge.`, kind: "info", audience: ["nurse", "admin", "super"] }
        );
      });
      toast("success", "Patient discharged", "Final bill generated; bed sent to cleaning.");
    },
    [withMeta, toast]
  );

  /* ---------------- billing ---------------- */

  const createBill = useCallback(
    (patientId: string, items: BillItem[]) => {
      setS((prev) => {
        const bill: Bill = { id: uid("B"), code: `INV-${3204 + prev.bills.length}`, patientId, items, discount: 0, taxRate: 8, payments: [], status: "unpaid", createdAt: nowISO(), claimStatus: "none" };
        return withMeta({ ...prev, bills: [bill, ...prev.bills] }, "Created bill", bill.code);
      });
    },
    [withMeta]
  );

  const updateBill = useCallback(
    (billId: string, patch: Pick<Bill, "items" | "discount" | "taxRate" | "status" | "claimStatus">) => {
      setS((prev) => {
        const bill = prev.bills.find((item) => item.id === billId);
        if (!bill) return prev;
        return withMeta(
          { ...prev, bills: prev.bills.map((item) => item.id === billId ? { ...item, ...patch } : item) },
          "Edited invoice",
          `${bill.code} · ${patch.items.length} line item(s)`
        );
      });
      toast("success", "Invoice updated", "Line items, totals and status were saved.");
    },
    [toast, withMeta]
  );

  const recordPayment = useCallback(
    (billId: string, amount: number, method: Payment["method"]) => {
      setS((prev) => {
        const bill = prev.bills.find((b) => b.id === billId);
        if (!bill) return prev;
        const t = billTotals(bill);
        const payment: Payment = { id: uid("PY"), amount: Math.min(amount, t.balance), method, at: nowISO(), ref: `${method.slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 89999)}` };
        const paid = t.paid + payment.amount;
        const status = paid >= t.total - 0.01 ? "paid" as const : "partial" as const;
        const patient = prev.patients.find((p) => p.id === bill.patientId);
        return withMeta(
          { ...prev, bills: prev.bills.map((b) => (b.id === billId ? { ...b, payments: [...b.payments, payment], status } : b)) },
          `Recorded payment ${fmtMoney(payment.amount)}`,
          `${bill.code} · ${method}`,
          { title: "Payment received", desc: `${bill.code} · ${patient ? fullName(patient) : ""} · ${fmtMoney(payment.amount)} via ${method}`, kind: "success", audience: ["billing", "admin", "super"] }
        );
      });
      toast("success", "Payment recorded", "Receipt has been generated.");
    },
    [withMeta, toast]
  );

  const updateBillPayments = useCallback(
    (billId: string, payments: Payment[]) => {
      setS((prev) => {
        const bill = prev.bills.find((item) => item.id === billId);
        if (!bill) return prev;
        const cleanPayments = payments
          .filter((payment) => Number(payment.amount) > 0)
          .map((payment) => ({ ...payment, amount: Number(payment.amount) }));
        const total = billTotals({ ...bill, payments: [] }).total;
        const paid = cleanPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const status: Bill["status"] = paid >= total - 0.01 ? "paid" : paid > 0 ? "partial" : "unpaid";
        return withMeta(
          { ...prev, bills: prev.bills.map((item) => item.id === billId ? { ...item, payments: cleanPayments, status } : item) },
          "Edited invoice payments",
          `${bill.code} · ${cleanPayments.length} payment(s) · ${fmtMoney(paid)}`
        );
      });
      toast("success", "Payment ledger updated", "Invoice paid amount, balance and status were recalculated.");
    },
    [toast, withMeta]
  );

  const submitClaim = useCallback(
    (billId: string) => {
      setS((prev) => {
        const bill = prev.bills.find((b) => b.id === billId);
        return withMeta(
          { ...prev, bills: prev.bills.map((b) => (b.id === billId ? { ...b, claimStatus: "pending" as const } : b)) },
          "Submitted insurance claim",
          bill?.code ?? billId,
          { title: "Claim submitted", desc: `${bill?.code ?? ""} sent to payer for adjudication.`, kind: "info", audience: ["billing", "admin", "super"] }
        );
      });
      toast("success", "Claim submitted", "The payer will respond within 3–5 business days.");
    },
    [withMeta, toast]
  );

  /* ---------------- inventory ---------------- */

  const adjustInventory = useCallback(
    (itemId: string, qty: number) => {
      setS((prev) => {
        const item = prev.inventory.find((i) => i.id === itemId);
        return withMeta(
          { ...prev, inventory: prev.inventory.map((i) => (i.id === itemId ? { ...i, stock: Math.max(0, i.stock + qty) } : i)) },
          `Stock ${qty > 0 ? "+" : ""}${qty}`,
          item?.name ?? itemId
        );
      });
    },
    [withMeta]
  );

  const createPO = useCallback(
    (itemId: string, qty: number, supplierId: string) => {
      setS((prev) => {
        const item = prev.inventory.find((i) => i.id === itemId);
        const po = { id: uid("PO"), code: `PO-${553 + prev.purchaseOrders.length}`, supplierId, itemId, qty, status: "ordered" as const, createdAt: nowISO() };
        return withMeta(
          { ...prev, purchaseOrders: [po, ...prev.purchaseOrders] },
          `Raised ${po.code}`,
          `${item?.name ?? ""} ×${qty}`,
          { title: `Purchase order ${po.code}`, desc: `${item?.name ?? ""} ×${qty} from supplier`, kind: "info", audience: ["admin", "super", "pharmacist"] }
        );
      });
      toast("success", "Purchase order raised", "Supplier has been notified.");
    },
    [withMeta, toast]
  );

  const receivePO = useCallback(
    (poId: string) => {
      setS((prev) => {
        const po = prev.purchaseOrders.find((p) => p.id === poId);
        if (!po) return prev;
        return withMeta(
          {
            ...prev,
            purchaseOrders: prev.purchaseOrders.map((p) => (p.id === poId ? { ...p, status: "received" as const } : p)),
            inventory: prev.inventory.map((i) => (i.id === po.itemId ? { ...i, stock: i.stock + po.qty } : i)),
          },
          `Received ${po.code}`,
          `+${po.qty} units`
        );
      });
      toast("success", "Goods received", "Stock levels updated.");
    },
    [withMeta, toast]
  );

  const value = useMemo<AppCtx>(() => ({
    s, toasts, dismiss, toast, signIn, signOut, attemptLogin, updateProfile, changePassword, updatePatientContact, effectiveCredentials,
    reset, go, setBookPatient, setBranch, setHospitalName,
    markRead, markAllRead, registerPatient, updatePatientClinical, bookAppointment, cancelAppointment, checkIn,
    startConsult, saveVitals, updateConsult, completeConsult, sendPrescription, dispense,
    orderLab, advanceLab, saveLabResults, verifyLab, setImaging, createAdmission, assignBed,
    discharge, setBedStatus, addProgressNote, recordPayment, updateBillPayments, submitClaim, createBill, updateBill,
    hasPermission, setRolePermission, applyPermissionPreset, resetRolePermissions,
    restock, adjustInventory, createPO, receivePO,
  }), [s, toasts, dismiss, toast, signIn, signOut, attemptLogin, updateProfile, changePassword, updatePatientContact, effectiveCredentials,
    reset, go, setBookPatient, setBranch, setHospitalName, markRead, markAllRead,
    registerPatient, updatePatientClinical, bookAppointment, cancelAppointment, checkIn, startConsult, saveVitals, updateConsult,
    completeConsult, sendPrescription, dispense, orderLab, advanceLab, saveLabResults, verifyLab, setImaging,
    createAdmission, assignBed, discharge, setBedStatus, addProgressNote, recordPayment, updateBillPayments, submitClaim,
    createBill, updateBill, hasPermission, setRolePermission, applyPermissionPreset, resetRolePermissions,
    restock, adjustInventory, createPO, receivePO]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

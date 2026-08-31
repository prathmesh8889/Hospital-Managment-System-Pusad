/* ============================================================
   Aurelia HMS — domain types, seed data, helpers
   ============================================================ */

export type Role =
  | "super" | "admin" | "reception" | "doctor" | "nurse"
  | "pharmacist" | "lab" | "radiology" | "billing" | "patient";

export type ModuleId =
  | "dashboard" | "portal" | "patients" | "appointments" | "opd"
  | "prescriptions" | "lab" | "wards" | "pharmacy" | "billing"
  | "inventory" | "reports";

export interface RoleMeta {
  id: Role; label: string; name: string; title: string; color: string; scope: string;
}

export const ROLES: RoleMeta[] = [
  { id: "super", label: "Super Administrator", name: "Adaeze Okafor", title: "System & branch control", color: "#179973", scope: "Full access · all branches" },
  { id: "admin", label: "Hospital Administrator", name: "Victor Hale", title: "Operations oversight", color: "#38688f", scope: "Main campus · all modules" },
  { id: "reception", label: "Reception · Front Desk", name: "Marta Silva", title: "Registration & queue", color: "#b4690e", scope: "Patients · Appointments · Billing" },
  { id: "doctor", label: "Doctor", name: "Dr. Nia Adeyemi", title: "Cardiology · OPD & IPD", color: "#0e8262", scope: "Charts · Prescriptions · Orders" },
  { id: "nurse", label: "Nurse", name: "Jonah Kim, RN", title: "Triage & inpatient care", color: "#7a5cc0", scope: "Vitals · Wards · Care notes" },
  { id: "pharmacist", label: "Pharmacist", name: "Yusuf Bello", title: "Dispensary lead", color: "#c0563b", scope: "Rx queue · Drug stock" },
  { id: "lab", label: "Lab Technician", name: "Ingrid Sørensen", title: "Clinical laboratory", color: "#2f8f83", scope: "Samples · Result entry" },
  { id: "radiology", label: "Radiology Technician", name: "Kofi Asante", title: "Imaging unit", color: "#5b7bb4", scope: "Scans · Reporting" },
  { id: "billing", label: "Accountant · Billing", name: "Renata Costa", title: "Revenue & claims", color: "#8a6d1f", scope: "Invoices · Insurance claims" },
  { id: "patient", label: "Patient Portal", name: "Amara Singh", title: "Patient · PT-1041", color: "#be4b32", scope: "Own records & bills" },
];

export const ROLE_MAP: Record<Role, RoleMeta> = Object.fromEntries(ROLES.map((r) => [r.id, r])) as Record<Role, RoleMeta>;

export const MODULE_ROLES: Record<ModuleId, Role[]> = {
  dashboard: ["super", "admin", "reception", "doctor", "nurse", "pharmacist", "lab", "radiology", "billing"],
  portal: ["patient"],
  patients: ["super", "admin", "reception", "doctor", "nurse"],
  appointments: ["super", "admin", "reception", "doctor", "nurse", "patient"],
  opd: ["super", "admin", "reception", "doctor", "nurse"],
  prescriptions: ["super", "admin", "doctor", "nurse", "pharmacist"],
  lab: ["super", "admin", "doctor", "lab", "radiology"],
  wards: ["super", "admin", "doctor", "nurse"],
  pharmacy: ["super", "admin", "pharmacist"],
  billing: ["super", "admin", "reception", "billing", "patient"],
  inventory: ["super", "admin", "pharmacist"],
  reports: ["super", "admin", "billing", "doctor"],
};

export const MODULES: { id: ModuleId; label: string; icon: string; group: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid", group: "Overview" },
  { id: "portal", label: "My Portal", icon: "heart", group: "Overview" },
  { id: "patients", label: "Patients", icon: "users", group: "Front desk" },
  { id: "appointments", label: "Appointments", icon: "calendar", group: "Front desk" },
  { id: "opd", label: "OPD Queue", icon: "queue", group: "Clinical" },
  { id: "prescriptions", label: "Prescriptions", icon: "pill", group: "Clinical" },
  { id: "lab", label: "Lab & Imaging", icon: "flask", group: "Clinical" },
  { id: "wards", label: "Wards & Beds", icon: "bed", group: "Clinical" },
  { id: "pharmacy", label: "Pharmacy", icon: "cross", group: "Operations" },
  { id: "billing", label: "Billing", icon: "receipt", group: "Operations" },
  { id: "inventory", label: "Inventory", icon: "box", group: "Operations" },
  { id: "reports", label: "Reports & Audit", icon: "chart", group: "Insight" },
];

export const BRANCHES = [
  { id: "main", name: "Main Campus", city: "Harbor District" },
  { id: "north", name: "Northside Clinic", city: "Elm Park" },
];

export const DEPARTMENTS = [
  { id: "cardio", name: "Cardiology" },
  { id: "im", name: "Internal Medicine" },
  { id: "peds", name: "Pediatrics" },
  { id: "ortho", name: "Orthopedics" },
  { id: "obgyn", name: "Obstetrics & Gynecology" },
  { id: "neuro", name: "Neurology" },
  { id: "surg", name: "General Surgery" },
  { id: "rad", name: "Radiology" },
];

export const deptName = (id: string) => DEPARTMENTS.find((d) => d.id === id)?.name ?? id;

/* ---------------- entities ---------------- */

export interface Patient {
  id: string; code: string; firstName: string; lastName: string; dob: string;
  gender: "Male" | "Female" | "Other"; phone: string; email: string; address: string;
  blood: string; emergencyName: string; emergencyPhone: string;
  insuranceProviderId?: string; policyNumber?: string;
  allergies: string[]; conditions: string[]; registeredAt: string; color: string;
}

export interface Doctor {
  id: string; name: string; specialization: string; departmentId: string;
  fee: number; status: "available" | "in-consultation" | "surgery" | "off";
  license: string; color: string;
}

export type ApptStatus = "scheduled" | "checked-in" | "in-consultation" | "completed" | "cancelled" | "no-show";

export interface Appointment {
  id: string; patientId: string; doctorId: string; dayOffset: number; time: string;
  type: "OPD Consultation" | "Follow-up" | "Procedure" | "Telehealth";
  reason: string; status: ApptStatus; token?: number; checkInAt?: string; createdAt: string;
}

export interface Vitals { bpSys?: number; bpDia?: number; hr?: number; temp?: number; spo2?: number; weight?: number; }

export interface Consultation {
  id: string; appointmentId?: string; patientId: string; doctorId: string;
  vitals: Vitals; complaint: string; examination: string; diagnosis: string;
  advice: string; followUpOffset?: number; status: "draft" | "completed";
  at: string; completedAt?: string;
}

export interface PrescriptionItem { medicineId: string; dosage: string; frequency: string; duration: string; qty: number; }

export interface Prescription {
  id: string; code: string; patientId: string; doctorId: string;
  items: PrescriptionItem[]; notes: string;
  status: "draft" | "sent" | "dispensed"; createdAt: string;
}

export interface Medicine {
  id: string; name: string; generic: string; category: string; form: string;
  price: number; stock: number; reorder: number; expiry: string;
  allergyClass?: "penicillin" | "nsaid" | "sulfa" | "cephalosporin";
}

export interface LabAnalyte { name: string; unit: string; low: number; high: number; result?: number; }

export type LabStatus = "ordered" | "collected" | "processing" | "completed" | "verified";

export interface LabOrder {
  id: string; code: string; patientId: string; doctorId: string; dayOffset: number;
  tests: string[]; status: LabStatus; urgent?: boolean; analytes: LabAnalyte[];
  technician?: string; verifiedAt?: string;
}

export type ImgStatus = "ordered" | "scheduled" | "completed" | "reported";

export interface ImagingOrder {
  id: string; code: string; patientId: string; doctorId: string; dayOffset: number;
  modality: "X-Ray" | "CT" | "MRI" | "Ultrasound"; bodyPart: string; status: ImgStatus;
  findings?: string;
}

export type BedStatus = "available" | "occupied" | "cleaning" | "maintenance";

export interface Bed { id: string; wardId: string; label: string; type: string; rate: number; status: BedStatus; patientId?: string; admissionId?: string; }
export interface Ward { id: string; name: string; type: string; floor: number; }

export interface ProgressNote { at: string; by: string; text: string; }

export interface Admission {
  id: string; code: string; patientId: string; doctorId: string; bedId?: string; wardId: string;
  admittedOffset: number; reason: string; plan: string; status: "pending" | "active" | "discharged";
  notes: ProgressNote[]; dischargeSummary?: string;
}

export interface BillItem { desc: string; kind: "consultation" | "medicine" | "lab" | "imaging" | "bed" | "service"; qty: number; price: number; }
export interface Payment { id: string; amount: number; method: "Cash" | "Card" | "Wallet" | "Bank Transfer" | "Insurance"; at: string; ref: string; }
export type BillStatus = "unpaid" | "partial" | "paid" | "refunded";

export interface Bill {
  id: string; code: string; patientId: string; items: BillItem[]; discount: number; taxRate: number;
  payments: Payment[]; status: BillStatus; createdAt: string;
  claimStatus: "none" | "pending" | "approved" | "rejected";
}

export interface InventoryItem { id: string; name: string; category: string; unit: string; stock: number; reorder: number; cost: number; }
export interface PurchaseOrder { id: string; code: string; supplierId: string; itemId: string; qty: number; status: "ordered" | "received"; createdAt: string; }
export interface Supplier { id: string; name: string; contact: string; phone: string; }
export interface InsuranceProvider { id: string; name: string; phone: string; }

export interface AppNotification {
  id: string; title: string; desc: string; at: string; read: boolean;
  kind: "info" | "success" | "warning" | "danger"; audience: Role[] | "all";
}

export interface AuditEvent { id: string; user: string; role: Role; action: string; entity: string; at: string; ip: string; }

export interface StaffMember { id: string; name: string; role: string; dept: string; shift: string; status: "on-duty" | "off-duty" | "on-leave"; }

export interface LabTestTemplate { id: string; name: string; price: number; analytes: Omit<LabAnalyte, "result">[]; }

export const LAB_CATALOG: LabTestTemplate[] = [
  { id: "t1", name: "Complete Blood Count", price: 18, analytes: [
    { name: "WBC", unit: "×10⁹/L", low: 3.5, high: 10.5 },
    { name: "RBC", unit: "×10¹²/L", low: 4.2, high: 5.9 },
    { name: "Hemoglobin", unit: "g/dL", low: 12, high: 16.5 },
    { name: "Platelets", unit: "×10⁹/L", low: 150, high: 410 },
  ]},
  { id: "t2", name: "Lipid Panel", price: 24, analytes: [
    { name: "Total Cholesterol", unit: "mg/dL", low: 0, high: 200 },
    { name: "LDL", unit: "mg/dL", low: 0, high: 130 },
    { name: "HDL", unit: "mg/dL", low: 40, high: 90 },
    { name: "Triglycerides", unit: "mg/dL", low: 0, high: 150 },
  ]},
  { id: "t3", name: "HbA1c", price: 20, analytes: [{ name: "HbA1c", unit: "%", low: 4, high: 5.6 }] },
  { id: "t4", name: "Liver Function", price: 22, analytes: [
    { name: "ALT", unit: "U/L", low: 7, high: 56 },
    { name: "AST", unit: "U/L", low: 10, high: 40 },
    { name: "Bilirubin", unit: "mg/dL", low: 0.1, high: 1.2 },
  ]},
  { id: "t5", name: "Kidney Function", price: 22, analytes: [
    { name: "Creatinine", unit: "mg/dL", low: 0.6, high: 1.3 },
    { name: "Urea", unit: "mg/dL", low: 7, high: 20 },
    { name: "Sodium", unit: "mmol/L", low: 135, high: 145 },
    { name: "Potassium", unit: "mmol/L", low: 3.5, high: 5.1 },
  ]},
  { id: "t6", name: "TSH", price: 16, analytes: [{ name: "TSH", unit: "mIU/L", low: 0.4, high: 4 }] },
  { id: "t7", name: "Urinalysis", price: 12, analytes: [{ name: "Specific Gravity", unit: "", low: 1.005, high: 1.03 }] },
  { id: "t8", name: "CRP", price: 15, analytes: [{ name: "CRP", unit: "mg/L", low: 0, high: 10 }] },
];

export const INTERACTION_PAIRS: [string, string, string][] = [
  ["m6", "m5", "Major — Warfarin + Aspirin significantly increases bleeding risk."],
  ["m6", "m4", "Major — NSAIDs potentiate warfarin anticoagulation; GI bleed risk."],
  ["m8", "m11", "Minor — PPIs may slightly alter metformin absorption."],
];

export const AVATAR_COLORS = ["#0e8262", "#38688f", "#b4690e", "#be4b32", "#2f8f83", "#7a5cc0", "#8a6d1f", "#c0563b", "#5b7bb4", "#175040"];

/* ---------------- helpers ---------------- */

let uidCounter = 1000;
export const uid = (prefix: string) => `${prefix}-${(++uidCounter).toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

export const fmtMoney = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtMoney0 = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export const dayISO = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const fmtDate = (iso: string) =>
  new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export const dayLabel = (offset: number) => (offset === 0 ? "Today" : offset === -1 ? "Yesterday" : offset === 1 ? "Tomorrow" : fmtDate(dayISO(offset)));

export const ageOf = (dob: string) => {
  const b = new Date(dob + "T00:00:00");
  const diff = Date.now() - b.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
};

export const initialsOf = (name: string) =>
  name.replace(/^Dr\.\s+/, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const nowISO = () => new Date().toISOString();

export const fullName = (p: Patient) => `${p.firstName} ${p.lastName}`;

export const billTotals = (b: Bill) => {
  const subtotal = b.items.reduce((s, i) => s + i.qty * i.price, 0);
  const taxable = Math.max(0, subtotal - b.discount);
  const tax = taxable * (b.taxRate / 100);
  const total = taxable + tax;
  const paid = b.payments.reduce((s, p) => s + p.amount, 0);
  return { subtotal, tax, total, paid, balance: Math.max(0, total - paid) };
};

export const minutesWaiting = (checkInAt?: string) =>
  checkInAt ? Math.max(0, Math.floor((Date.now() - new Date(checkInAt).getTime()) / 60000)) : 0;

const iso = (offset: number, h: number, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

/* ---------------- seed data ---------------- */

export interface SeedData {
  patients: Patient[]; doctors: Doctor[]; appointments: Appointment[]; consultations: Consultation[];
  prescriptions: Prescription[]; medicines: Medicine[]; labOrders: LabOrder[]; imagingOrders: ImagingOrder[];
  wards: Ward[]; beds: Bed[]; admissions: Admission[]; bills: Bill[]; inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[]; suppliers: Supplier[]; insurers: InsuranceProvider[];
  notifications: AppNotification[]; audit: AuditEvent[]; staff: StaffMember[];
}

export const makeSeed = (): SeedData => {
  const patients: Patient[] = [
    { id: "p1", code: "PT-1041", firstName: "Amara", lastName: "Singh", dob: "1988-04-12", gender: "Female", phone: "+1 555-0141", email: "amara.singh@mail.com", address: "18 Cedar Row, Harbor District", blood: "O+", emergencyName: "Dev Singh", emergencyPhone: "+1 555-0199", insuranceProviderId: "i1", policyNumber: "NV-88231-04", allergies: ["Penicillin"], conditions: ["Asthma (mild intermittent)"], registeredAt: dayISO(-420), color: AVATAR_COLORS[0] },
    { id: "p2", code: "PT-1042", firstName: "Daniel", lastName: "Reyes", dob: "1979-09-30", gender: "Male", phone: "+1 555-0142", email: "d.reyes@mail.com", address: "77 Millbrook Ave", blood: "A+", emergencyName: "Sofia Reyes", emergencyPhone: "+1 555-0186", insuranceProviderId: "i2", policyNumber: "MP-40412-11", allergies: [], conditions: ["Hypertension", "Type 2 Diabetes"], registeredAt: dayISO(-310), color: AVATAR_COLORS[1] },
    { id: "p3", code: "PT-1043", firstName: "Fatima", lastName: "El-Sayed", dob: "2016-01-22", gender: "Female", phone: "+1 555-0143", email: "elsayed.fam@mail.com", address: "5 Larkspur Ct", blood: "B+", emergencyName: "Omar El-Sayed", emergencyPhone: "+1 555-0177", allergies: [], conditions: ["Recurrent wheeze"], registeredAt: dayISO(-200), color: AVATAR_COLORS[2] },
    { id: "p4", code: "PT-1044", firstName: "George", lastName: "Boateng", dob: "1954-06-03", gender: "Male", phone: "+1 555-0144", email: "g.boateng@mail.com", address: "230 Wharf St", blood: "AB+", emergencyName: "Abena Boateng", emergencyPhone: "+1 555-0165", insuranceProviderId: "i3", policyNumber: "BS-11820-02", allergies: ["Sulfa drugs"], conditions: ["Atrial fibrillation", "On warfarin"], registeredAt: dayISO(-540), color: AVATAR_COLORS[3] },
    { id: "p5", code: "PT-1045", firstName: "Hana", lastName: "Kim", dob: "1993-11-08", gender: "Female", phone: "+1 555-0145", email: "hana.kim@mail.com", address: "9 Alder Gate", blood: "O−", emergencyName: "Min-Jun Kim", emergencyPhone: "+1 555-0158", insuranceProviderId: "i4", policyNumber: "PC-73310-09", allergies: ["Latex"], conditions: ["Pregnancy — 28 weeks"], registeredAt: dayISO(-160), color: AVATAR_COLORS[4] },
    { id: "p6", code: "PT-1046", firstName: "Ivan", lastName: "Petrov", dob: "1968-02-17", gender: "Male", phone: "+1 555-0146", email: "i.petrov@mail.com", address: "41 Foundry Lane", blood: "B−", emergencyName: "Elena Petrova", emergencyPhone: "+1 555-0129", allergies: [], conditions: ["COPD (GOLD II)"], registeredAt: dayISO(-380), color: AVATAR_COLORS[5] },
    { id: "p7", code: "PT-1047", firstName: "Josephine", lastName: "Mbeki", dob: "1947-08-25", gender: "Female", phone: "+1 555-0147", email: "j.mbeki@mail.com", address: "12 Rosebank Walk", blood: "A−", emergencyName: "Thabo Mbeki", emergencyPhone: "+1 555-0113", insuranceProviderId: "i1", policyNumber: "NV-50117-01", allergies: [], conditions: ["CKD stage 3", "Hypertension"], registeredAt: dayISO(-600), color: AVATAR_COLORS[6] },
    { id: "p8", code: "PT-1048", firstName: "Kwame", lastName: "Mensah", dob: "2001-05-14", gender: "Male", phone: "+1 555-0148", email: "kwame.m@mail.com", address: "3 Pitch Side", blood: "O+", emergencyName: "Ama Mensah", emergencyPhone: "+1 555-0102", allergies: [], conditions: ["Ankle sprain (right)"], registeredAt: dayISO(-6), color: AVATAR_COLORS[7] },
    { id: "p9", code: "PT-1049", firstName: "Leila", lastName: "Haddad", dob: "1985-12-01", gender: "Female", phone: "+1 555-0149", email: "leila.h@mail.com", address: "64 Verandah St", blood: "A+", emergencyName: "Samir Haddad", emergencyPhone: "+1 555-0171", allergies: [], conditions: ["Migraine without aura"], registeredAt: dayISO(-90), color: AVATAR_COLORS[8] },
    { id: "p10", code: "PT-1050", firstName: "Marco", lastName: "Bianchi", dob: "1990-07-19", gender: "Male", phone: "+1 555-0150", email: "m.bianchi@mail.com", address: "88 Kiln Yard", blood: "B+", emergencyName: "Giulia Bianchi", emergencyPhone: "+1 555-0136", insuranceProviderId: "i2", policyNumber: "MP-29917-07", allergies: [], conditions: ["Acute appendicitis — post-op"], registeredAt: dayISO(-2), color: AVATAR_COLORS[9] },
    { id: "p11", code: "PT-1051", firstName: "Nadia", lastName: "Rahman", dob: "1972-03-27", gender: "Female", phone: "+1 555-0151", email: "n.rahman@mail.com", address: "29 Saffron Hill", blood: "O+", emergencyName: "Imran Rahman", emergencyPhone: "+1 555-0194", insuranceProviderId: "i3", policyNumber: "BS-66023-05", allergies: ["Aspirin"], conditions: ["Hypothyroidism"], registeredAt: dayISO(-240), color: AVATAR_COLORS[0] },
    { id: "p12", code: "PT-1052", firstName: "Owen", lastName: "Gallagher", dob: "1958-10-05", gender: "Male", phone: "+1 555-0152", email: "o.gallagher@mail.com", address: "140 Beacon Rise", blood: "A+", emergencyName: "Clare Gallagher", emergencyPhone: "+1 555-0148", insuranceProviderId: "i1", policyNumber: "NV-91740-03", allergies: [], conditions: ["Post-CABG (day 2)"], registeredAt: dayISO(-4), color: AVATAR_COLORS[1] },
  ];

  const doctors: Doctor[] = [
    { id: "d1", name: "Dr. Nia Adeyemi", specialization: "Cardiology", departmentId: "cardio", fee: 120, status: "available", license: "MED-114207", color: "#0e8262" },
    { id: "d2", name: "Dr. Samuel Ortiz", specialization: "Internal Medicine", departmentId: "im", fee: 90, status: "in-consultation", license: "MED-098811", color: "#38688f" },
    { id: "d3", name: "Dr. Priya Raman", specialization: "Pediatrics", departmentId: "peds", fee: 85, status: "available", license: "MED-120455", color: "#b4690e" },
    { id: "d4", name: "Dr. Tomas Lindqvist", specialization: "Orthopedics", departmentId: "ortho", fee: 110, status: "available", license: "MED-104263", color: "#2f8f83" },
    { id: "d5", name: "Dr. Grace Okonkwo", specialization: "Obstetrics & Gynecology", departmentId: "obgyn", fee: 100, status: "off", license: "MED-091530", color: "#7a5cc0" },
    { id: "d6", name: "Dr. Elias Farah", specialization: "Neurology", departmentId: "neuro", fee: 130, status: "available", license: "MED-112908", color: "#5b7bb4" },
    { id: "d7", name: "Dr. Mei-Lin Chen", specialization: "General Surgery", departmentId: "surg", fee: 140, status: "surgery", license: "MED-087724", color: "#c0563b" },
    { id: "d8", name: "Dr. Robert Osei", specialization: "Radiology", departmentId: "rad", fee: 0, status: "available", license: "MED-118812", color: "#8a6d1f" },
  ];

  const appointments: Appointment[] = [
    { id: "a1", patientId: "p2", doctorId: "d2", dayOffset: 0, time: "09:00", type: "Follow-up", reason: "BP & glucose review", status: "completed", token: 1, checkInAt: iso(0, 8, 42), createdAt: iso(-3, 10) },
    { id: "a2", patientId: "p9", doctorId: "d6", dayOffset: 0, time: "09:30", type: "OPD Consultation", reason: "Recurrent migraine", status: "completed", token: 2, checkInAt: iso(0, 9, 10), createdAt: iso(-2, 15) },
    { id: "a3", patientId: "p1", doctorId: "d2", dayOffset: 0, time: "10:00", type: "OPD Consultation", reason: "Persistent cough, mild wheeze", status: "in-consultation", token: 3, checkInAt: iso(0, 9, 36), createdAt: iso(-1, 11) },
    { id: "a4", patientId: "p3", doctorId: "d3", dayOffset: 0, time: "10:15", type: "OPD Consultation", reason: "Wheeze episode at school", status: "checked-in", token: 4, checkInAt: iso(0, 9, 52), createdAt: iso(-1, 9) },
    { id: "a5", patientId: "p8", doctorId: "d4", dayOffset: 0, time: "10:30", type: "Follow-up", reason: "Ankle sprain recheck", status: "checked-in", token: 5, checkInAt: iso(0, 10, 4), createdAt: iso(-4, 12) },
    { id: "a6", patientId: "p11", doctorId: "d2", dayOffset: 0, time: "11:00", type: "OPD Consultation", reason: "Fatigue, thyroid review", status: "checked-in", token: 6, checkInAt: iso(0, 10, 21), createdAt: iso(-2, 8) },
    { id: "a7", patientId: "p4", doctorId: "d1", dayOffset: 0, time: "11:30", type: "Follow-up", reason: "INR monitoring on warfarin", status: "scheduled", createdAt: iso(-5, 14) },
    { id: "a8", patientId: "p2", doctorId: "d1", dayOffset: 0, time: "12:30", type: "OPD Consultation", reason: "Cardiac risk assessment", status: "scheduled", createdAt: iso(-1, 16) },
    { id: "a9", patientId: "p5", doctorId: "d5", dayOffset: 0, time: "14:00", type: "OPD Consultation", reason: "28-week antenatal check", status: "scheduled", createdAt: iso(-7, 10) },
    { id: "a10", patientId: "p7", doctorId: "d2", dayOffset: 0, time: "15:00", type: "Follow-up", reason: "Renal panel review", status: "scheduled", createdAt: iso(-2, 13) },
    { id: "a11", patientId: "p10", doctorId: "d7", dayOffset: 0, time: "16:30", type: "Follow-up", reason: "Post-op day 1 wound check", status: "scheduled", createdAt: iso(-1, 18) },
    { id: "a12", patientId: "p4", doctorId: "d1", dayOffset: -1, time: "10:00", type: "OPD Consultation", reason: "Palpitations", status: "completed", token: 2, checkInAt: iso(-1, 9, 40), createdAt: iso(-6, 9) },
    { id: "a13", patientId: "p8", doctorId: "d4", dayOffset: -1, time: "15:30", type: "OPD Consultation", reason: "Ankle injury — initial", status: "completed", token: 7, checkInAt: iso(-1, 15, 5), createdAt: iso(-1, 8) },
    { id: "a14", patientId: "p1", doctorId: "d2", dayOffset: 1, time: "09:30", type: "Follow-up", reason: "Review chest response", status: "scheduled", createdAt: iso(0, 9) },
    { id: "a15", patientId: "p12", doctorId: "d1", dayOffset: 1, time: "11:00", type: "Follow-up", reason: "Post-CABG telemetry review", status: "scheduled", createdAt: iso(-1, 12) },
  ];

  const consultations: Consultation[] = [
    { id: "c1", appointmentId: "a1", patientId: "p2", doctorId: "d2", vitals: { bpSys: 138, bpDia: 88, hr: 76, temp: 36.7, spo2: 98, weight: 84 }, complaint: "Home BP readings 135–145 systolic this week.", examination: "S1S2 normal, no murmurs. Lungs clear. No pedal edema.", diagnosis: "Essential hypertension — suboptimal control (I10)", advice: "Continue Losartan; add evening walk 30 min; low-salt diet. Home BP diary.", status: "completed", at: iso(0, 9, 5), completedAt: iso(0, 9, 24) },
    { id: "c2", appointmentId: "a2", patientId: "p9", doctorId: "d6", vitals: { bpSys: 118, bpDia: 74, hr: 68, temp: 36.5, spo2: 99, weight: 61 }, complaint: "3 migraine attacks this month, photophobia, no aura.", examination: "Cranial nerves intact, no papilledema, normal gait.", diagnosis: "Migraine without aura (G43.909)", advice: "Sumatriptan at attack onset (max 2/24h). Sleep hygiene; trigger diary.", status: "completed", at: iso(0, 9, 34), completedAt: iso(0, 9, 51) },
    { id: "c3", appointmentId: "a3", patientId: "p1", doctorId: "d2", vitals: { bpSys: 116, bpDia: 74, hr: 84, temp: 37.8, spo2: 96, weight: 58 }, complaint: "Cough ×5 days, worse at night, mild wheeze. Asthma history.", examination: "", diagnosis: "", advice: "", status: "draft", at: iso(0, 10, 2) },
    { id: "c4", patientId: "p10", doctorId: "d7", vitals: { bpSys: 122, bpDia: 78, hr: 88, temp: 37.1, spo2: 98, weight: 76 }, complaint: "Post-laparoscopic appendectomy, POD 1.", examination: "Incision clean, mild RLQ tenderness, bowel sounds present.", diagnosis: "Acute appendicitis — post-appendectomy (K35.80)", advice: "Advance diet as tolerated. Wound check tomorrow 16:30.", status: "completed", at: iso(-1, 8, 30), completedAt: iso(-1, 8, 50) },
    { id: "c5", patientId: "p12", doctorId: "d1", vitals: { bpSys: 128, bpDia: 80, hr: 72, spo2: 97 }, complaint: "Post-CABG day 2, stable on telemetry.", examination: "Sternum stable, lungs clear, no arrhythmia on strip.", diagnosis: "Coronary atherosclerosis — post CABG (I25.10)", advice: "Continue anticoagulation protocol; mobilize with physiotherapy.", status: "completed", at: iso(-2, 7, 45), completedAt: iso(-2, 8, 5) },
    { id: "c6", patientId: "p1", doctorId: "d2", vitals: { bpSys: 112, bpDia: 72, hr: 78, temp: 36.9, spo2: 97 }, complaint: "Sore throat and congestion ×3 days.", examination: "Mild pharyngeal erythema, no exudate.", diagnosis: "Acute upper respiratory infection (J06.9)", advice: "Rest, fluids, saline gargle. Return if fever > 3 days.", status: "completed", at: iso(-34, 11, 10), completedAt: iso(-34, 11, 28) },
  ];

  const prescriptions: Prescription[] = [
    { id: "rx1", code: "RX-8841", patientId: "p2", doctorId: "d2", items: [
      { medicineId: "m7", dosage: "50 mg", frequency: "1-0-0", duration: "30 days", qty: 30 },
      { medicineId: "m8", dosage: "500 mg", frequency: "1-0-1", duration: "30 days", qty: 60 },
    ], notes: "Take metformin with meals.", status: "dispensed", createdAt: iso(0, 9, 26) },
    { id: "rx2", code: "RX-8842", patientId: "p9", doctorId: "d6", items: [
      { medicineId: "m12", dosage: "50 mg", frequency: "PRN at onset", duration: "10 doses", qty: 10 },
      { medicineId: "m4", dosage: "400 mg", frequency: "TDS after food", duration: "5 days", qty: 15 },
    ], notes: "Max 2 sumatriptan doses per 24 h.", status: "sent", createdAt: iso(0, 9, 53) },
    { id: "rx3", code: "RX-8839", patientId: "p10", doctorId: "d7", items: [
      { medicineId: "m3", dosage: "1 g", frequency: "QID PRN pain", duration: "7 days", qty: 28 },
      { medicineId: "m2", dosage: "625 mg", frequency: "BD after food", duration: "7 days", qty: 14 },
    ], notes: "Complete antibiotic course.", status: "dispensed", createdAt: iso(-1, 9, 2) },
    { id: "rx4", code: "RX-8843", patientId: "p12", doctorId: "d1", items: [
      { medicineId: "m6", dosage: "2.5 mg", frequency: "0-0-1", duration: "Ongoing", qty: 30 },
      { medicineId: "m5", dosage: "75 mg", frequency: "1-0-0", duration: "30 days", qty: 30 },
      { medicineId: "m9", dosage: "20 mg", frequency: "0-0-1", duration: "30 days", qty: 30 },
    ], notes: "INR target 2.0–3.0; review Friday.", status: "sent", createdAt: iso(0, 8, 15) },
  ];

  const medicines: Medicine[] = [
    { id: "m1", name: "Amoxicillin 500mg", generic: "amoxicillin", category: "Antibiotic", form: "Capsule", price: 0.45, stock: 240, reorder: 100, expiry: dayISO(300), allergyClass: "penicillin" },
    { id: "m2", name: "Co-Amoxiclav 625mg", generic: "amoxicillin/clavulanate", category: "Antibiotic", form: "Tablet", price: 1.1, stock: 18, reorder: 25, expiry: dayISO(210), allergyClass: "penicillin" },
    { id: "m3", name: "Paracetamol 500mg", generic: "acetaminophen", category: "Analgesic", form: "Tablet", price: 0.08, stock: 520, reorder: 200, expiry: dayISO(420) },
    { id: "m4", name: "Ibuprofen 400mg", generic: "ibuprofen", category: "NSAID", form: "Tablet", price: 0.12, stock: 340, reorder: 150, expiry: dayISO(380), allergyClass: "nsaid" },
    { id: "m5", name: "Aspirin 75mg", generic: "aspirin", category: "Antiplatelet", form: "Tablet", price: 0.05, stock: 400, reorder: 150, expiry: dayISO(350), allergyClass: "nsaid" },
    { id: "m6", name: "Warfarin 2.5mg", generic: "warfarin", category: "Anticoagulant", form: "Tablet", price: 0.32, stock: 96, reorder: 50, expiry: dayISO(260) },
    { id: "m7", name: "Losartan 50mg", generic: "losartan", category: "Antihypertensive", form: "Tablet", price: 0.28, stock: 210, reorder: 100, expiry: dayISO(330) },
    { id: "m8", name: "Metformin 500mg", generic: "metformin", category: "Antidiabetic", form: "Tablet", price: 0.1, stock: 60, reorder: 150, expiry: dayISO(400) },
    { id: "m9", name: "Atorvastatin 20mg", generic: "atorvastatin", category: "Statin", form: "Tablet", price: 0.35, stock: 180, reorder: 80, expiry: dayISO(290) },
    { id: "m10", name: "Salbutamol Inhaler 100mcg", generic: "salbutamol", category: "Bronchodilator", form: "Inhaler", price: 6.5, stock: 42, reorder: 20, expiry: dayISO(180) },
    { id: "m11", name: "Omeprazole 20mg", generic: "omeprazole", category: "PPI", form: "Capsule", price: 0.22, stock: 8, reorder: 60, expiry: dayISO(42) },
    { id: "m12", name: "Sumatriptan 50mg", generic: "sumatriptan", category: "Antimigraine", form: "Tablet", price: 2.4, stock: 34, reorder: 25, expiry: dayISO(240) },
    { id: "m13", name: "Ceftriaxone 1g Inj", generic: "ceftriaxone", category: "Antibiotic", form: "Injection", price: 3.2, stock: 55, reorder: 30, expiry: dayISO(150), allergyClass: "cephalosporin" },
    { id: "m14", name: "Levothyroxine 50mcg", generic: "levothyroxine", category: "Thyroid", form: "Tablet", price: 0.18, stock: 120, reorder: 60, expiry: dayISO(365) },
    { id: "m15", name: "Amlodipine 5mg", generic: "amlodipine", category: "Antihypertensive", form: "Tablet", price: 0.15, stock: 150, reorder: 80, expiry: dayISO(320) },
  ];

  const labOrders: LabOrder[] = [
    { id: "lo1", code: "LAB-3311", patientId: "p1", doctorId: "d2", dayOffset: 0, tests: ["t1", "t8"], status: "processing", urgent: true, technician: "Ingrid Sørensen", analytes: [
      { name: "WBC", unit: "×10⁹/L", low: 3.5, high: 10.5, result: 12.4 },
      { name: "RBC", unit: "×10¹²/L", low: 4.2, high: 5.9, result: 4.6 },
      { name: "Hemoglobin", unit: "g/dL", low: 12, high: 16.5, result: 13.1 },
      { name: "Platelets", unit: "×10⁹/L", low: 150, high: 410, result: 310 },
      { name: "CRP", unit: "mg/L", low: 0, high: 10, result: 28 },
    ]},
    { id: "lo2", code: "LAB-3309", patientId: "p2", doctorId: "d1", dayOffset: -2, tests: ["t2", "t3"], status: "verified", verifiedAt: iso(-2, 16, 40), technician: "Ingrid Sørensen", analytes: [
      { name: "Total Cholesterol", unit: "mg/dL", low: 0, high: 200, result: 226 },
      { name: "LDL", unit: "mg/dL", low: 0, high: 130, result: 162 },
      { name: "HDL", unit: "mg/dL", low: 40, high: 90, result: 44 },
      { name: "Triglycerides", unit: "mg/dL", low: 0, high: 150, result: 172 },
      { name: "HbA1c", unit: "%", low: 4, high: 5.6, result: 7.1 },
    ]},
    { id: "lo3", code: "LAB-3312", patientId: "p7", doctorId: "d2", dayOffset: 0, tests: ["t5"], status: "collected", technician: "Ingrid Sørensen", analytes: [
      { name: "Creatinine", unit: "mg/dL", low: 0.6, high: 1.3 },
      { name: "Urea", unit: "mg/dL", low: 7, high: 20 },
      { name: "Sodium", unit: "mmol/L", low: 135, high: 145 },
      { name: "Potassium", unit: "mmol/L", low: 3.5, high: 5.1 },
    ]},
    { id: "lo4", code: "LAB-3310", patientId: "p12", doctorId: "d1", dayOffset: -1, tests: ["t1", "t4"], status: "verified", verifiedAt: iso(-1, 14, 10), technician: "Ingrid Sørensen", analytes: [
      { name: "WBC", unit: "×10⁹/L", low: 3.5, high: 10.5, result: 9.1 },
      { name: "Hemoglobin", unit: "g/dL", low: 12, high: 16.5, result: 11.4 },
      { name: "Platelets", unit: "×10⁹/L", low: 150, high: 410, result: 240 },
      { name: "ALT", unit: "U/L", low: 7, high: 56, result: 31 },
      { name: "AST", unit: "U/L", low: 10, high: 40, result: 27 },
    ]},
    { id: "lo5", code: "LAB-3313", patientId: "p3", doctorId: "d3", dayOffset: 0, tests: ["t1"], status: "ordered", analytes: [
      { name: "WBC", unit: "×10⁹/L", low: 3.5, high: 10.5 },
      { name: "RBC", unit: "×10¹²/L", low: 4.2, high: 5.9 },
      { name: "Hemoglobin", unit: "g/dL", low: 12, high: 16.5 },
      { name: "Platelets", unit: "×10⁹/L", low: 150, high: 410 },
    ]},
    { id: "lo6", code: "LAB-3308", patientId: "p10", doctorId: "d7", dayOffset: -1, tests: ["t1"], status: "completed", technician: "Ingrid Sørensen", analytes: [
      { name: "WBC", unit: "×10⁹/L", low: 3.5, high: 10.5, result: 13.8 },
      { name: "Hemoglobin", unit: "g/dL", low: 12, high: 16.5, result: 13.6 },
      { name: "Platelets", unit: "×10⁹/L", low: 150, high: 410, result: 295 },
    ]},
  ];

  const imagingOrders: ImagingOrder[] = [
    { id: "io1", code: "IMG-1204", patientId: "p8", doctorId: "d4", dayOffset: -1, modality: "X-Ray", bodyPart: "Right ankle (2 views)", status: "reported", findings: "No fracture or dislocation. Mild lateral soft-tissue swelling consistent with sprain." },
    { id: "io2", code: "IMG-1205", patientId: "p12", doctorId: "d1", dayOffset: -2, modality: "CT", bodyPart: "Chest — post-op", status: "reported", findings: "Sternotomy wires well aligned. Small bilateral pleural effusions, expected post-CABG. No mediastinal collection." },
    { id: "io3", code: "IMG-1206", patientId: "p9", doctorId: "d6", dayOffset: 0, modality: "MRI", bodyPart: "Brain — migraine protocol", status: "scheduled" },
    { id: "io4", code: "IMG-1207", patientId: "p3", doctorId: "d3", dayOffset: 1, modality: "Ultrasound", bodyPart: "Abdomen", status: "ordered" },
  ];

  const wards: Ward[] = [
    { id: "w1", name: "General A", type: "General", floor: 2 },
    { id: "w2", name: "ICU", type: "ICU", floor: 1 },
    { id: "w3", name: "Maternity", type: "Maternity", floor: 3 },
    { id: "w4", name: "Private Wing", type: "Private", floor: 4 },
    { id: "w5", name: "Pediatrics", type: "Pediatrics", floor: 3 },
  ];

  const mkBeds = (wardId: string, prefix: string, n: number, type: string, rate: number): Bed[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `${wardId}-b${i + 1}`, wardId, label: `${prefix}-${String(i + 1).padStart(2, "0")}`, type, rate, status: "available" as BedStatus,
    }));

  const beds: Bed[] = [
    ...mkBeds("w1", "GA", 8, "Standard", 90),
    ...mkBeds("w2", "ICU", 6, "Critical care", 350),
    ...mkBeds("w3", "MAT", 6, "Maternity", 120),
    ...mkBeds("w4", "PV", 4, "Private suite", 200),
    ...mkBeds("w5", "PD", 6, "Pediatric", 100),
  ];
  const setBed = (id: string, patch: Partial<Bed>) => {
    const b = beds.find((x) => x.id === id);
    if (b) Object.assign(b, patch);
  };
  setBed("w1-b2", { status: "occupied", patientId: "p7", admissionId: "ad2" });
  setBed("w1-b5", { status: "cleaning" });
  setBed("w1-b6", { status: "occupied", patientId: "p10", admissionId: "ad3" });
  setBed("w2-b1", { status: "occupied", patientId: "p12", admissionId: "ad1" });
  setBed("w2-b3", { status: "maintenance" });

  const admissions: Admission[] = [
    { id: "ad1", code: "ADM-2201", patientId: "p12", doctorId: "d1", bedId: "w2-b1", wardId: "w2", admittedOffset: -2, reason: "Post-CABG monitoring", plan: "Telemetry 48h, anticoagulation protocol, early mobilization.", status: "active", notes: [
      { at: iso(-1, 8, 0), by: "Jonah Kim, RN", text: "Overnight stable. HR 68–74, no ectopy. Pain 2/10." },
      { at: iso(0, 7, 30), by: "Jonah Kim, RN", text: "Sat 97% RA. Mobilized to chair with physio. Wound dry." },
    ]},
    { id: "ad2", code: "ADM-2202", patientId: "p7", doctorId: "d2", bedId: "w1-b2", wardId: "w1", admittedOffset: -1, reason: "CKD stage 3 — workup & hydration", plan: "Renal panel q24h, strict input/output, nephrology review.", status: "active", notes: [
      { at: iso(0, 6, 45), by: "Jonah Kim, RN", text: "Urine output adequate. BP 142/84 pre-medication." },
    ]},
    { id: "ad3", code: "ADM-2203", patientId: "p10", doctorId: "d7", bedId: "w1-b6", wardId: "w1", admittedOffset: -1, reason: "Acute appendicitis — post-appendectomy", plan: "IV antibiotics 24h, advance diet, wound check POD 1.", status: "active", notes: [
      { at: iso(0, 8, 15), by: "Jonah Kim, RN", text: "Tolerating clear fluids. Afebrile. Ambulating." },
    ]},
    { id: "ad4", code: "ADM-2204", patientId: "p6", doctorId: "d2", wardId: "w1", admittedOffset: 0, reason: "COPD exacerbation", plan: "Nebulizers, IV steroids, SpO₂ monitoring; awaiting bed.", status: "pending", notes: [] },
  ];

  const bills: Bill[] = [
    { id: "b1", code: "INV-3201", patientId: "p2", discount: 0, taxRate: 8, status: "paid", createdAt: iso(0, 9, 28), claimStatus: "none", items: [
      { desc: "OPD Consultation — Internal Medicine", kind: "consultation", qty: 1, price: 90 },
      { desc: "Metformin 500mg ×60", kind: "medicine", qty: 60, price: 0.1 },
      { desc: "Losartan 50mg ×30", kind: "medicine", qty: 30, price: 0.28 },
    ], payments: [{ id: "py1", amount: 105.62, method: "Card", at: iso(0, 9, 40), ref: "CRD-77120" }] },
    { id: "b2", code: "INV-3202", patientId: "p9", discount: 0, taxRate: 8, status: "unpaid", createdAt: iso(0, 9, 55), claimStatus: "none", items: [
      { desc: "OPD Consultation — Neurology", kind: "consultation", qty: 1, price: 130 },
    ], payments: [] },
    { id: "b3", code: "INV-3198", patientId: "p10", discount: 150, taxRate: 8, status: "partial", createdAt: iso(-1, 9, 10), claimStatus: "pending", items: [
      { desc: "Laparoscopic appendectomy — package", kind: "service", qty: 1, price: 1800 },
      { desc: "Ward bed (General A) ×1 night", kind: "bed", qty: 1, price: 90 },
      { desc: "Co-Amoxiclav 625mg ×14", kind: "medicine", qty: 14, price: 1.1 },
      { desc: "Paracetamol 500mg ×28", kind: "medicine", qty: 28, price: 0.08 },
    ], payments: [{ id: "py2", amount: 500, method: "Cash", at: iso(-1, 10, 0), ref: "CSH-10441" }] },
    { id: "b4", code: "INV-3196", patientId: "p12", discount: 0, taxRate: 8, status: "unpaid", createdAt: iso(-2, 9, 0), claimStatus: "none", items: [
      { desc: "CABG surgery — theatre package", kind: "service", qty: 1, price: 8400 },
      { desc: "ICU bed ×2 nights", kind: "bed", qty: 2, price: 350 },
    ], payments: [] },
    { id: "b5", code: "INV-3192", patientId: "p1", discount: 0, taxRate: 8, status: "paid", createdAt: iso(-34, 11, 35), claimStatus: "none", items: [
      { desc: "OPD Consultation — Internal Medicine", kind: "consultation", qty: 1, price: 90 },
      { desc: "Salbutamol Inhaler ×1", kind: "medicine", qty: 1, price: 6.5 },
    ], payments: [{ id: "py3", amount: 104.22, method: "Cash", at: iso(-34, 11, 42), ref: "CSH-10287" }] },
    { id: "b6", code: "INV-3200", patientId: "p3", discount: 0, taxRate: 8, status: "paid", createdAt: iso(-1, 15, 40), claimStatus: "none", items: [
      { desc: "OPD Consultation — Pediatrics", kind: "consultation", qty: 1, price: 85 },
    ], payments: [{ id: "py4", amount: 91.8, method: "Wallet", at: iso(-1, 15, 45), ref: "WLT-55231" }] },
    { id: "b7", code: "INV-3203", patientId: "p7", discount: 0, taxRate: 8, status: "unpaid", createdAt: iso(0, 7, 50), claimStatus: "none", items: [
      { desc: "Kidney Function Test", kind: "lab", qty: 1, price: 22 },
      { desc: "Ward bed (General A) ×1 night", kind: "bed", qty: 1, price: 90 },
    ], payments: [] },
    { id: "b8", code: "INV-3197", patientId: "p5", discount: 10, taxRate: 8, status: "paid", createdAt: iso(-6, 12, 0), claimStatus: "none", items: [
      { desc: "Antenatal package — 2nd trimester", kind: "service", qty: 1, price: 150 },
      { desc: "Ultrasound — obstetric", kind: "imaging", qty: 1, price: 60 },
    ], payments: [{ id: "py5", amount: 216, method: "Card", at: iso(-6, 12, 10), ref: "CRD-76998" }] },
  ];

  const inventory: InventoryItem[] = [
    { id: "inv1", name: "Nitrile Gloves (M)", category: "PPE", unit: "box/100", stock: 24, reorder: 30, cost: 8.5 },
    { id: "inv2", name: "Syringes 5ml", category: "Consumable", unit: "pcs", stock: 480, reorder: 200, cost: 0.12 },
    { id: "inv3", name: "IV Normal Saline 500ml", category: "Fluids", unit: "bags", stock: 58, reorder: 80, cost: 2.1 },
    { id: "inv4", name: "Sterile Gauze 10×10", category: "Wound care", unit: "packs", stock: 210, reorder: 100, cost: 0.9 },
    { id: "inv5", name: "PPE Kit — isolation", category: "PPE", unit: "kits", stock: 45, reorder: 40, cost: 12 },
    { id: "inv6", name: "Suture Kit 3-0", category: "Theatre", unit: "kits", stock: 92, reorder: 50, cost: 6.4 },
    { id: "inv7", name: "Oxygen Masks w/ Tubing", category: "Respiratory", unit: "pcs", stock: 26, reorder: 20, cost: 3.8 },
    { id: "inv8", name: "Urinary Catheter 16Fr", category: "Consumable", unit: "pcs", stock: 40, reorder: 30, cost: 2.9 },
  ];

  const purchaseOrders: PurchaseOrder[] = [
    { id: "po1", code: "PO-551", supplierId: "s1", itemId: "inv1", qty: 60, status: "ordered", createdAt: iso(-2, 10) },
    { id: "po2", code: "PO-552", supplierId: "s2", itemId: "inv3", qty: 100, status: "ordered", createdAt: iso(-1, 15) },
  ];

  const suppliers: Supplier[] = [
    { id: "s1", name: "MedSupply Co.", contact: "Hana Weiss", phone: "+1 555-0301" },
    { id: "s2", name: "PharmaLink Distribution", contact: "Omar Fadel", phone: "+1 555-0302" },
    { id: "s3", name: "SurgiTech Instruments", contact: "Petra Novak", phone: "+1 555-0303" },
  ];

  const insurers: InsuranceProvider[] = [
    { id: "i1", name: "NovaHealth", phone: "+1 555-0401" },
    { id: "i2", name: "MedPlus", phone: "+1 555-0402" },
    { id: "i3", name: "BlueShield Global", phone: "+1 555-0403" },
    { id: "i4", name: "Pacifica Care", phone: "+1 555-0404" },
  ];

  const notifications: AppNotification[] = [
    { id: "n1", title: "Lab results ready", desc: "Lipid panel + HbA1c verified for Daniel Reyes — 2 abnormal values.", at: iso(-2, 16, 41), read: false, kind: "info", audience: ["doctor", "admin", "super"] },
    { id: "n2", title: "Low stock alert", desc: "Omeprazole 20mg at 8 units (reorder level 60).", at: iso(0, 7, 5), read: false, kind: "warning", audience: ["pharmacist", "admin", "super"] },
    { id: "n3", title: "Bed maintenance", desc: "ICU-03 flagged for ventilator servicing.", at: iso(-1, 13, 20), read: false, kind: "danger", audience: ["nurse", "admin", "super"] },
    { id: "n4", title: "Insurance claim pending", desc: "MedPlus claim for INV-3198 (Marco Bianchi) awaiting adjudication.", at: iso(-1, 11, 0), read: false, kind: "info", audience: ["billing", "admin", "super"] },
    { id: "n5", title: "Admission awaiting bed", desc: "Ivan Petrov (COPD exacerbation) needs a General ward bed.", at: iso(0, 8, 32), read: false, kind: "warning", audience: ["nurse", "admin", "super", "doctor"] },
    { id: "n6", title: "Prescription to dispense", desc: "RX-8843 (Owen Gallagher) waiting in pharmacy queue.", at: iso(0, 8, 16), read: false, kind: "info", audience: ["pharmacist", "super"] },
  ];

  const audit: AuditEvent[] = [
    { id: "au1", user: "Ingrid Sørensen", role: "lab", action: "Entered results", entity: "LAB-3311 · Amara Singh", at: iso(0, 9, 48), ip: "10.4.2.31" },
    { id: "au2", user: "Jonah Kim, RN", role: "nurse", action: "Recorded vitals", entity: "PT-1041 · Amara Singh", at: iso(0, 9, 40), ip: "10.4.2.18" },
    { id: "au3", user: "Marta Silva", role: "reception", action: "Checked-in patient", entity: "APT a6 · Nadia Rahman", at: iso(0, 10, 21), ip: "10.4.1.05" },
    { id: "au4", user: "Renata Costa", role: "billing", action: "Recorded payment $500", entity: "INV-3198 · Marco Bianchi", at: iso(-1, 10, 0), ip: "10.4.1.11" },
    { id: "au5", user: "Yusuf Bello", role: "pharmacist", action: "Dispensed RX-8839", entity: "PT-1050 · Marco Bianchi", at: iso(-1, 9, 30), ip: "10.4.3.02" },
    { id: "au6", user: "Dr. Samuel Ortiz", role: "doctor", action: "Completed consultation", entity: "PT-1042 · Daniel Reyes", at: iso(0, 9, 24), ip: "10.4.2.44" },
    { id: "au7", user: "Adaeze Okafor", role: "super", action: "Exported revenue report", entity: "Financial · daily collection", at: iso(-1, 17, 5), ip: "10.4.0.02" },
  ];

  const staff: StaffMember[] = [
    { id: "st1", name: "Jonah Kim, RN", role: "Nurse", dept: "Inpatient", shift: "Day · 07–15", status: "on-duty" },
    { id: "st2", name: "Aisha Toure, RN", role: "Nurse", dept: "OPD", shift: "Day · 07–15", status: "on-duty" },
    { id: "st3", name: "Yusuf Bello", role: "Pharmacist", dept: "Pharmacy", shift: "Day · 08–16", status: "on-duty" },
    { id: "st4", name: "Ingrid Sørensen", role: "Lab Technician", dept: "Laboratory", shift: "Day · 08–16", status: "on-duty" },
    { id: "st5", name: "Kofi Asante", role: "Radiology Tech", dept: "Imaging", shift: "Day · 08–16", status: "on-duty" },
    { id: "st6", name: "Marta Silva", role: "Receptionist", dept: "Front Desk", shift: "Day · 08–16", status: "on-duty" },
    { id: "st7", name: "Peter Novak", role: "Nurse", dept: "ICU", shift: "Night · 23–07", status: "off-duty" },
    { id: "st8", name: "Lena Fischer", role: "Physiotherapist", dept: "Rehab", shift: "—", status: "on-leave" },
  ];

  return {
    patients, doctors, appointments, consultations, prescriptions, medicines, labOrders,
    imagingOrders, wards, beds, admissions, bills, inventory, purchaseOrders, suppliers,
    insurers, notifications, audit, staff,
  };
};

/* ---------------- analytics series ---------------- */

export const REVENUE_14D = [4250, 5120, 4780, 6310, 5890, 7240, 6830, 5410, 6150, 7520, 6940, 8130, 7720, 8460];
export const OPD_7D = [86, 92, 78, 104, 97, 61, 42];
export const OPD_7D_LABELS = (() => {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toLocaleDateString("en-US", { weekday: "short" }));
  }
  return out;
})();

export const DX_STATS = [
  { dx: "Essential hypertension (I10)", count: 46 },
  { dx: "Acute URI (J06.9)", count: 38 },
  { dx: "Type 2 diabetes (E11)", count: 31 },
  { dx: "Migraine (G43)", count: 17 },
  { dx: "Asthma (J45)", count: 14 },
  { dx: "Ankle sprain (S93.4)", count: 11 },
];

export const REVENUE_BY_DEPT = [
  { dept: "Internal Medicine", value: 18400 },
  { dept: "Cardiology", value: 15900 },
  { dept: "Surgery", value: 12600 },
  { dept: "Obstetrics", value: 8200 },
  { dept: "Pediatrics", value: 6400 },
  { dept: "Orthopedics", value: 5100 },
  { dept: "Neurology", value: 3900 },
];

export const SLOT_TIMES = (() => {
  const out: string[] = [];
  for (let h = 9; h <= 16; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    if (h !== 16) out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
})();

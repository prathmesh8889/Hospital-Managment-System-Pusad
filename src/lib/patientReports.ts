import type { AppState } from "./store";
import { INR_RATE, ageOf, fullName } from "./data";

const cleanFileName = (value: string) => value.replace(/[^a-z0-9_-]+/gi, "-").replace(/-+/g, "-");
const shortDate = (value?: string) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const rupees = (baseAmount: number) => `INR ${Math.round(baseAmount * INR_RATE).toLocaleString("en-IN")}`;

async function createPdf() {
  const { jsPDF } = await import("jspdf");
  return new jsPDF({ unit: "mm", format: "a4", compress: true });
}

function addHeader(doc: Awaited<ReturnType<typeof createPdf>>, hospital: string, title: string, reference: string) {
  doc.setFillColor(10, 42, 33);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(hospital, 15, 12);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(172, 224, 200);
  doc.text("Main Campus · Pusad · Hospital Management System", 15, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(title, 195, 11, { align: "right" });
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.text(reference, 195, 18, { align: "right" });
  doc.setTextColor(20, 35, 30);
}

function addFooter(doc: Awaited<ReturnType<typeof createPdf>>, label: string) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(216, 225, 219);
    doc.line(15, 282, 195, 282);
    doc.setTextColor(110, 128, 121);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`${label} · Generated ${new Date().toLocaleString("en-IN")}`, 15, 287);
    doc.text(`Page ${page} of ${pages}`, 195, 287, { align: "right" });
  }
}

function ensurePage(doc: Awaited<ReturnType<typeof createPdf>>, y: number, needed = 18) {
  if (y + needed <= 277) return y;
  doc.addPage();
  return 18;
}

function sectionTitle(doc: Awaited<ReturnType<typeof createPdf>>, title: string, y: number) {
  const next = ensurePage(doc, y, 14);
  doc.setFillColor(236, 246, 240);
  doc.roundedRect(15, next, 180, 9, 1.5, 1.5, "F");
  doc.setTextColor(11, 107, 81);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.2);
  doc.text(title.toUpperCase(), 19, next + 6);
  doc.setTextColor(20, 35, 30);
  return next + 14;
}

function detailRow(doc: Awaited<ReturnType<typeof createPdf>>, label: string, value: string, y: number) {
  const lines = doc.splitTextToSize(value || "—", 135) as string[];
  const next = ensurePage(doc, y, Math.max(7, lines.length * 4.5));
  doc.setFont("helvetica", "bold");
  doc.setTextColor(91, 111, 103);
  doc.setFontSize(8.2);
  doc.text(label, 17, next);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 35, 30);
  doc.text(lines, 58, next);
  return next + Math.max(6, lines.length * 4.5);
}

function patientIdentity(state: AppState, patientId: string) {
  const patient = state.patients.find((item) => item.id === patientId);
  if (!patient) throw new Error("Patient not found");
  return patient;
}

export async function downloadMedicalReportPdf(state: AppState, patientId: string) {
  const patient = patientIdentity(state, patientId);
  const doc = await createPdf();
  addHeader(doc, state.hospitalName, "MEDICAL REPORT", patient.code);
  let y = 40;

  y = sectionTitle(doc, "Patient profile", y);
  y = detailRow(doc, "Patient", `${fullName(patient)} · ${patient.code}`, y);
  y = detailRow(doc, "Demographics", `${shortDate(patient.dob)} · ${ageOf(patient.dob)} years · ${patient.gender} · Blood ${patient.blood}`, y);
  y = detailRow(doc, "Known conditions", patient.conditions.join(", ") || "No known chronic conditions", y);
  y = detailRow(doc, "Allergies", patient.allergies.join(", ") || "No known allergies", y);

  const consultations = state.consultations.filter((item) => item.patientId === patientId).sort((a, b) => +new Date(b.at) - +new Date(a.at));
  y = sectionTitle(doc, `Doctor consultations (${consultations.length})`, y + 4);
  if (!consultations.length) y = detailRow(doc, "Status", "No consultations recorded", y);
  consultations.forEach((consultation, index) => {
    const doctor = state.doctors.find((item) => item.id === consultation.doctorId);
    y = detailRow(doc, `${index + 1}. ${shortDate(consultation.at)}`, `${doctor?.name ?? "Doctor"} · Complaint: ${consultation.complaint || "—"} · Examination: ${consultation.examination || "—"} · Diagnosis: ${consultation.diagnosis || "Pending"} · Advice: ${consultation.advice || "—"}`, y);
  });

  const prescriptions = state.prescriptions.filter((item) => item.patientId === patientId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  y = sectionTitle(doc, `Medication history (${prescriptions.length})`, y + 4);
  if (!prescriptions.length) y = detailRow(doc, "Status", "No prescriptions recorded", y);
  prescriptions.forEach((rx, index) => {
    const medicines = rx.items.map((item) => {
      const medicine = state.medicines.find((entry) => entry.id === item.medicineId);
      return `${medicine?.name ?? "Medicine"} ${item.dosage}, ${item.frequency}, ${item.duration}`;
    }).join("; ");
    y = detailRow(doc, `${index + 1}. ${rx.code}`, `${shortDate(rx.createdAt)} · ${rx.status.toUpperCase()} · ${medicines}${rx.notes ? ` · Notes: ${rx.notes}` : ""}`, y);
  });

  const labs = state.labOrders.filter((item) => item.patientId === patientId);
  const imaging = state.imagingOrders.filter((item) => item.patientId === patientId);
  y = sectionTitle(doc, `Diagnostics (${labs.length + imaging.length})`, y + 4);
  if (!labs.length && !imaging.length) y = detailRow(doc, "Status", "No laboratory or imaging reports recorded", y);
  labs.forEach((lab, index) => {
    const values = lab.analytes.map((item) => `${item.name}: ${item.result ?? "pending"} ${item.unit}`).join(", ");
    y = detailRow(doc, `${index + 1}. ${lab.code}`, `${lab.status.toUpperCase()} · ${values || lab.tests.join(", ")}`, y);
  });
  imaging.forEach((scan, index) => {
    y = detailRow(doc, `${labs.length + index + 1}. ${scan.code}`, `${scan.modality} ${scan.bodyPart} · ${scan.status.toUpperCase()} · ${scan.findings || "Findings pending"}`, y);
  });

  addFooter(doc, "Medical report · Clinical information only");
  doc.save(`${cleanFileName(patient.code)}-${cleanFileName(fullName(patient))}-medical-report.pdf`);
}

export async function downloadHealthReportPdf(state: AppState, patientId: string) {
  const patient = patientIdentity(state, patientId);
  const doc = await createPdf();
  addHeader(doc, state.hospitalName, "HEALTH STATUS REPORT", patient.code);
  let y = 40;

  y = sectionTitle(doc, "Health profile", y);
  y = detailRow(doc, "Patient", `${fullName(patient)} · ${patient.code} · ${ageOf(patient.dob)} years · ${patient.gender}`, y);
  y = detailRow(doc, "Blood group", patient.blood, y);
  y = detailRow(doc, "Conditions", patient.conditions.join(", ") || "No known chronic conditions", y);
  y = detailRow(doc, "Allergies", patient.allergies.join(", ") || "No known allergies", y);

  const consultations = state.consultations.filter((item) => item.patientId === patientId).sort((a, b) => +new Date(b.at) - +new Date(a.at));
  y = sectionTitle(doc, "Vitals and doctor assessment", y + 4);
  if (!consultations.length) y = detailRow(doc, "Status", "No health observations recorded", y);
  consultations.forEach((consultation, index) => {
    const doctor = state.doctors.find((item) => item.id === consultation.doctorId);
    const v = consultation.vitals;
    const vitals = `BP ${v.bpSys ?? "—"}/${v.bpDia ?? "—"} mmHg · HR ${v.hr ?? "—"} bpm · Temp ${v.temp ?? "—"} · SpO2 ${v.spo2 ?? "—"}% · Weight ${v.weight ?? "—"} kg`;
    y = detailRow(doc, `${index + 1}. ${shortDate(consultation.at)}`, `${doctor?.name ?? "Doctor"} · ${vitals}`, y);
    y = detailRow(doc, "Assessment", `Complaint: ${consultation.complaint || "—"} · Diagnosis: ${consultation.diagnosis || "Pending"} · Advice: ${consultation.advice || "—"}`, y);
  });

  const latest = consultations[0];
  y = sectionTitle(doc, "Current summary", y + 4);
  y = detailRow(doc, "Latest diagnosis", latest?.diagnosis || "No completed diagnosis recorded", y);
  y = detailRow(doc, "Latest advice", latest?.advice || "No current doctor advice recorded", y);
  y = detailRow(doc, "Report scope", "Health status only. Billing and payment information are intentionally excluded.", y);

  addFooter(doc, "Health status report · No billing data");
  doc.save(`${cleanFileName(patient.code)}-${cleanFileName(fullName(patient))}-health-report.pdf`);
}

export async function downloadServiceReportPdf(state: AppState, patientId: string) {
  const patient = patientIdentity(state, patientId);
  const doc = await createPdf();
  addHeader(doc, state.hospitalName, "HOSPITAL SERVICE REPORT", patient.code);
  let y = 40;

  y = detailRow(doc, "Patient", `${fullName(patient)} · ${patient.code}`, y);
  y = detailRow(doc, "Contact", `${patient.phone} · ${patient.address || "No address"}`, y);

  const consultations = state.consultations.filter((item) => item.patientId === patientId).sort((a, b) => +new Date(b.at) - +new Date(a.at));
  y = sectionTitle(doc, `Consultation services (${consultations.length})`, y + 4);
  if (!consultations.length) y = detailRow(doc, "Status", "No consultation services recorded", y);
  consultations.forEach((c, index) => {
    const doctor = state.doctors.find((item) => item.id === c.doctorId);
    y = detailRow(doc, `${index + 1}. ${shortDate(c.at)}`, `${doctor?.name ?? "Doctor"} · ${doctor?.specialization ?? "General Medicine"} · ${c.status.toUpperCase()}`, y);
  });

  const labs = state.labOrders.filter((item) => item.patientId === patientId);
  y = sectionTitle(doc, `Laboratory services (${labs.length})`, y + 4);
  if (!labs.length) y = detailRow(doc, "Status", "No laboratory services recorded", y);
  labs.forEach((lab, index) => {
    y = detailRow(doc, `${index + 1}. ${lab.code}`, `${lab.tests.join(" + ")} · ${lab.status.toUpperCase()}${lab.urgent ? " · URGENT" : ""}`, y);
  });

  const imaging = state.imagingOrders.filter((item) => item.patientId === patientId);
  y = sectionTitle(doc, `Imaging services (${imaging.length})`, y + 4);
  if (!imaging.length) y = detailRow(doc, "Status", "No imaging services recorded", y);
  imaging.forEach((scan, index) => {
    y = detailRow(doc, `${index + 1}. ${scan.code}`, `${scan.modality} · ${scan.bodyPart} · ${scan.status.toUpperCase()}`, y);
  });

  const admissions = state.admissions.filter((item) => item.patientId === patientId);
  y = sectionTitle(doc, `Admission / ward services (${admissions.length})`, y + 4);
  if (!admissions.length) y = detailRow(doc, "Status", "No admission services recorded", y);
  admissions.forEach((admission, index) => {
    const ward = state.wards.find((item) => item.id === admission.wardId);
    const bed = state.beds.find((item) => item.id === admission.bedId);
    y = detailRow(doc, `${index + 1}. ${admission.code}`, `${ward?.name ?? "Ward"}${bed ? ` · Bed ${bed.label}` : ""} · ${admission.reason} · ${admission.status.toUpperCase()}`, y);
  });

  y = sectionTitle(doc, "Important", y + 4);
  y = detailRow(doc, "Report scope", "Service history only. Charges, invoice totals and payments are available separately in the Bill PDF.", y);

  addFooter(doc, "Hospital service report · No payment data");
  doc.save(`${cleanFileName(patient.code)}-${cleanFileName(fullName(patient))}-service-report.pdf`);
}

export async function downloadPrescriptionBillPdf(state: AppState, prescriptionId: string) {
  const rx = state.prescriptions.find((item) => item.id === prescriptionId);
  if (!rx) throw new Error("Prescription not found");
  const patient = patientIdentity(state, rx.patientId);
  const doctor = state.doctors.find((item) => item.id === rx.doctorId);
  const doc = await createPdf();
  addHeader(doc, state.hospitalName, "PRESCRIPTION MEDICINE BILL", rx.code);
  let y = 40;

  y = detailRow(doc, "Patient", `${fullName(patient)} · ${patient.code}`, y);
  y = detailRow(doc, "Prescription", `${rx.code} · ${shortDate(rx.createdAt)} · ${doctor?.name ?? "Doctor"}`, y);
  y = detailRow(doc, "Status", rx.status.toUpperCase(), y);

  y = sectionTitle(doc, "Medicine charges", y + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(91, 111, 103);
  doc.text("MEDICINE", 17, y);
  doc.text("QTY", 133, y, { align: "right" });
  doc.text("RATE", 162, y, { align: "right" });
  doc.text("AMOUNT", 193, y, { align: "right" });
  y += 5;

  let total = 0;
  rx.items.forEach((item, index) => {
    const medicine = state.medicines.find((entry) => entry.id === item.medicineId);
    const rate = medicine?.price ?? 0;
    const amount = rate * item.qty;
    total += amount;
    const lines = doc.splitTextToSize(`${index + 1}. ${medicine?.name ?? "Medicine"}`, 100) as string[];
    const height = Math.max(8, lines.length * 4.2 + 2);
    y = ensurePage(doc, y, height);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(20, 35, 30);
    doc.text(lines, 17, y + 3);
    doc.text(String(item.qty), 133, y + 3, { align: "right" });
    doc.text(rupees(rate), 162, y + 3, { align: "right" });
    doc.text(rupees(amount), 193, y + 3, { align: "right" });
    doc.setDrawColor(231, 237, 233);
    doc.line(15, y + height - 2, 195, y + height - 2);
    y += height;
  });

  y = sectionTitle(doc, "Prescription bill total", y + 5);
  y = detailRow(doc, "Medicine total", rupees(total), y);
  y = detailRow(doc, "Billing note", "This document contains prescription medicine charges only. Consultation, lab, imaging, bed and other service charges remain on their separate hospital invoice.", y);

  addFooter(doc, "Prescription medicine bill · Separate from hospital invoice");
  doc.save(`${cleanFileName(rx.code)}-${cleanFileName(patient.code)}-prescription-bill.pdf`);
}

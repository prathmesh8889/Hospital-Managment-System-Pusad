import type { AppState } from "./store";
import { ageOf, billTotals, fullName } from "./data";

const cleanFileName = (value: string) => value.replace(/[^a-z0-9_-]+/gi, "-").replace(/-+/g, "-");
const shortDate = (value?: string) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const money = (value: number) => `INR ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  doc.setFontSize(11);
  doc.text(title, 195, 11, { align: "right" });
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.text(reference, 195, 18, { align: "right" });
  doc.setTextColor(20, 35, 30);
}

function addFooter(doc: Awaited<ReturnType<typeof createPdf>>) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(216, 225, 219);
    doc.line(15, 282, 195, 282);
    doc.setTextColor(110, 128, 121);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`Generated ${new Date().toLocaleString("en-IN")} · Confidential medical record`, 15, 287);
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
  doc.setFontSize(9.5);
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

export async function downloadPrescriptionPdf(state: AppState, prescriptionId: string) {
  const rx = state.prescriptions.find((item) => item.id === prescriptionId);
  if (!rx) throw new Error("Prescription not found");
  const patient = state.patients.find((item) => item.id === rx.patientId);
  const doctor = state.doctors.find((item) => item.id === rx.doctorId);
  if (!patient) throw new Error("Patient not found");

  const doc = await createPdf();
  addHeader(doc, state.hospitalName, "MEDICAL PRESCRIPTION", rx.code);
  let y = 40;
  y = detailRow(doc, "Patient", `${fullName(patient)} · ${patient.code}`, y);
  y = detailRow(doc, "Patient details", `${ageOf(patient.dob)} years · ${patient.gender} · Blood group ${patient.blood}`, y);
  y = detailRow(doc, "Prescribed by", `${doctor?.name ?? "Duty Medical Officer"} · ${doctor?.specialization ?? "General Medicine"} · Reg. ${doctor?.license ?? "—"}`, y);
  y = detailRow(doc, "Date", shortDate(rx.createdAt), y);

  if (patient.allergies.length) {
    y = ensurePage(doc, y + 2, 13);
    doc.setFillColor(250, 236, 230);
    doc.roundedRect(15, y, 180, 10, 1.5, 1.5, "F");
    doc.setTextColor(160, 58, 36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(`KNOWN ALLERGIES: ${patient.allergies.join(", ").toUpperCase()}`, 19, y + 6.5);
    doc.setTextColor(20, 35, 30);
    y += 16;
  }

  y = sectionTitle(doc, "Medicines and directions", y + 2);
  const columns = [17, 77, 105, 137, 171];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(91, 111, 103);
  ["MEDICINE", "DOSAGE", "FREQUENCY", "DURATION", "QTY"].forEach((label, i) => doc.text(label, columns[i], y));
  y += 5;
  doc.setDrawColor(216, 225, 219);
  doc.line(15, y - 2, 195, y - 2);

  rx.items.forEach((item, index) => {
    const medicine = state.medicines.find((entry) => entry.id === item.medicineId);
    const medicineLines = doc.splitTextToSize(`${index + 1}. ${medicine?.name ?? "Medicine"}${medicine?.generic ? ` (${medicine.generic})` : ""}`, 55) as string[];
    const height = Math.max(9, medicineLines.length * 4.2 + 2);
    y = ensurePage(doc, y, height);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(20, 35, 30);
    doc.text(medicineLines, columns[0], y + 3);
    doc.text(item.dosage, columns[1], y + 3);
    doc.text(doc.splitTextToSize(item.frequency, 27), columns[2], y + 3);
    doc.text(doc.splitTextToSize(item.duration, 28), columns[3], y + 3);
    doc.text(String(item.qty), 185, y + 3, { align: "right" });
    doc.setDrawColor(231, 237, 233);
    doc.line(15, y + height - 2, 195, y + height - 2);
    y += height;
  });

  if (rx.notes) {
    y = sectionTitle(doc, "Doctor's notes", y + 4);
    y = detailRow(doc, "Advice", rx.notes, y);
  }
  y = ensurePage(doc, Math.max(y + 18, 235), 25);
  doc.setDrawColor(20, 35, 30);
  doc.line(132, y, 192, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(doctor?.name ?? "Duty Medical Officer", 162, y + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(91, 111, 103);
  doc.setFontSize(7.5);
  doc.text("Doctor signature / digital approval", 162, y + 9, { align: "center" });
  addFooter(doc);
  doc.save(`${cleanFileName(rx.code)}-${cleanFileName(fullName(patient))}-prescription.pdf`);
}

export async function downloadPatientReportPdf(state: AppState, patientId: string) {
  const patient = state.patients.find((item) => item.id === patientId);
  if (!patient) throw new Error("Patient not found");
  const doc = await createPdf();
  addHeader(doc, state.hospitalName, "CONSOLIDATED PATIENT REPORT", patient.code);
  let y = 40;

  y = sectionTitle(doc, "Patient profile", y);
  y = detailRow(doc, "Name / ID", `${fullName(patient)} · ${patient.code}`, y);
  y = detailRow(doc, "Demographics", `${shortDate(patient.dob)} · ${ageOf(patient.dob)} years · ${patient.gender} · Blood ${patient.blood}`, y);
  y = detailRow(doc, "Contact", `${patient.phone} · ${patient.email || "No email"} · ${patient.address || "No address"}`, y);
  y = detailRow(doc, "Emergency contact", `${patient.emergencyName} · ${patient.emergencyPhone}`, y);
  y = detailRow(doc, "Known conditions", patient.conditions.join(", ") || "No known chronic conditions", y);
  y = detailRow(doc, "Allergies", patient.allergies.join(", ") || "No known allergies", y);

  const consultations = state.consultations.filter((item) => item.patientId === patientId).sort((a, b) => +new Date(b.at) - +new Date(a.at));
  y = sectionTitle(doc, `Consultations (${consultations.length})`, y + 4);
  if (!consultations.length) y = detailRow(doc, "Status", "No consultations recorded", y);
  consultations.forEach((consultation, index) => {
    const doctor = state.doctors.find((item) => item.id === consultation.doctorId);
    y = detailRow(doc, `${index + 1}. ${shortDate(consultation.at)}`, `${doctor?.name ?? "Doctor"} · ${consultation.status.toUpperCase()} · Complaint: ${consultation.complaint || "—"} · Diagnosis: ${consultation.diagnosis || "Pending"} · Advice: ${consultation.advice || "—"}`, y);
    const vitals = consultation.vitals;
    if (Object.keys(vitals).length) y = detailRow(doc, "Vitals", `BP ${vitals.bpSys ?? "—"}/${vitals.bpDia ?? "—"}, HR ${vitals.hr ?? "—"}, Temp ${vitals.temp ?? "—"}, SpO2 ${vitals.spo2 ?? "—"}%, Weight ${vitals.weight ?? "—"} kg`, y);
  });

  const prescriptions = state.prescriptions.filter((item) => item.patientId === patientId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  y = sectionTitle(doc, `Prescriptions (${prescriptions.length})`, y + 4);
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

  const bills = state.bills.filter((item) => item.patientId === patientId);
  const billed = bills.reduce((sum, bill) => sum + billTotals(bill).total, 0);
  const paid = bills.reduce((sum, bill) => sum + billTotals(bill).paid, 0);
  y = sectionTitle(doc, "Billing summary", y + 4);
  y = detailRow(doc, "Invoices", `${bills.length} invoice(s) · Total ${money(billed)} · Paid ${money(paid)} · Balance ${money(Math.max(0, billed - paid))}`, y);

  addFooter(doc);
  doc.save(`${cleanFileName(patient.code)}-${cleanFileName(fullName(patient))}-medical-report.pdf`);
}

import { jsPDF } from "jspdf";

const money = (v) => `EGP ${(Number(v) || 0).toFixed(2)}`;

/** Draws the payslip and returns a PDF Blob. */
export function buildPayslipPdf({ employeeName, monthLabel, brandName, detail }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, L = 15, R = W - 15;
  let y = 18;

  const ensure = (h) => { if (y + h > 280) { doc.addPage(); y = 18; } };
  const section = (title) => {
    ensure(14);
    y += 4;
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(title, L, y);
    doc.setDrawColor(180); doc.line(L, y + 1.5, R, y + 1.5);
    y += 7;
  };
  // cols: [{ x, align }]; cells: strings
  const row = (cols, cells, bold = false) => {
    ensure(7);
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(9);
    let h = 5;
    cells.forEach((c, i) => {
      const maxW = cols[i].w || 60;
      const lines = doc.splitTextToSize(String(c ?? ""), maxW);
      doc.text(lines, cols[i].x, y, { align: cols[i].align || "left" });
      h = Math.max(h, lines.length * 4.2 + 1);
    });
    y += h;
  };

  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(brandName || "Payslip", L, y);
  doc.setFontSize(11); doc.text("PAYSLIP", R, y, { align: "right" });
  y += 7;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`Employee: ${employeeName}`, L, y);
  doc.text(`Period: ${monthLabel}`, R, y, { align: "right" });
  y += 4;

  const e = detail.earnings;
  section("Earnings");
  const two = [{ x: L, w: 120 }, { x: R, align: "right" }];
  if (e.base) row(two, ["Base salary", money(e.base)]);
  if (e.hourly) row(two, ["Hourly earnings", money(e.hourly)]);
  if (e.overtime) row(two, [`Overtime (${detail.hours.overtime.toFixed(1)} h)`, money(e.overtime)]);
  if (e.bonus) row(two, ["Bonus", money(e.bonus)]);
  row(two, [`Gross (after attendance deductions) - ${detail.hours.approvedDays} approved days, ${detail.hours.total.toFixed(1)} h`, money(e.gross)], true);

  section("Overtime details");
  const ot = [{ x: L }, { x: 80 }, { x: R, align: "right" }];
  if (detail.overtime.length === 0) row(two, ["No overtime this period", ""]);
  else {
    row(ot, ["Date", "Hours", "Amount"], true);
    detail.overtime.forEach((o) => row(ot, [o.date, o.hours.toFixed(2), money(o.amount)]));
  }

  section("Deductions");
  const dc = [{ x: L }, { x: 45, w: 105 }, { x: R, align: "right" }];
  if (detail.deductions.length === 0) row(two, ["No deductions this period", ""]);
  else {
    row(dc, ["Date", "Reason", "Amount"], true);
    detail.deductions.forEach((d) => row(dc, [d.date || "-", d.reason, `-${money(d.amount)}`]));
  }

  section("Advance installments");
  const ac = [{ x: L }, { x: 45, w: 70 }, { x: 150, align: "right" }, { x: R, align: "right" }];
  if (detail.advances.length === 0) row(two, ["No advance installments this period", ""]);
  else {
    row(ac, ["Advance date", "Reason", "Installment", "Balance after"], true);
    detail.advances.forEach((a) => row(ac, [a.date || "-", a.reason, `-${money(a.installment)}`, money(a.remaining)]));
  }

  ensure(16);
  y += 4;
  doc.setDrawColor(0); doc.line(L, y, R, y);
  y += 7;
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("NET PAY", L, y);
  doc.text(money(detail.totals.net), R, y, { align: "right" });

  return doc.output("blob");
}
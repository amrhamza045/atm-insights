import { base44 } from "@/api/base44Client";
import { buildPayslipDetail } from "./payslipData";
import { buildPayslipPdf } from "./payslipPdf";

export const monthLabelOf = (month) =>
  new Date(`${month.slice(0, 7)}-01T12:00:00`).toLocaleString("en-US", { month: "long", year: "numeric" });

/**
 * Builds the payslip PDF for one employee and saves it as "pending_review".
 * `existing` is the employee's Payslip for this month (if any). Dispatched payslips are left alone.
 */
export async function generatePayslip({ emp, rec, calc, month, existing, brandName }) {
  if (existing?.status === "dispatched") return existing;
  const detail = buildPayslipDetail({ rec, calc, extraDeduction: Number(rec.deductions) || 0 });
  const label = monthLabelOf(month);
  const blob = buildPayslipPdf({ employeeName: emp.name, monthLabel: label, brandName, detail });
  const file = new File([blob], `payslip-${emp.name}-${month.slice(0, 7)}.pdf`, { type: "application/pdf" });
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });

  const data = {
    employee_id: emp.id,
    employee_name: emp.name,
    employee_email: emp.email || "",
    branch_id: rec.branch_id,
    branch_name: rec.branch_name,
    month: `${month.slice(0, 7)}-01`,
    net_salary: detail.totals.net,
    detail,
    pdf_file_uri: file_uri,
    status: "pending_review",
    generated_at: new Date().toISOString(),
  };
  return existing?.id
    ? base44.entities.Payslip.update(existing.id, data)
    : base44.entities.Payslip.create(data);
}
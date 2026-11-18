import { base44 } from "@/api/base44Client";
import { buildCateringPdf } from "./cateringPdf";
import { buildCateringPdfArabic } from "./cateringPdfArabic";
import { loadTicketPdf } from "./kitchenTicketPdf";
import { buildDocEmailVars, fillTemplate, DEFAULT_DOC_EMAIL_SUBJECT, DEFAULT_DOC_EMAIL_BODY } from "./docEmailTemplate";

/**
 * Regenerates the document PDF from the current state, uploads it, and emails
 * the client a link to it. Never reuses a previously uploaded file — a revised
 * quote must never be sent from a stale PDF.
 *
 * subject/body are the staff-edited text for this one send; {{link}} inside them
 * is replaced with the freshly uploaded PDF url.
 */
export async function sendCateringDocumentEmail({ lang, email, type, event, docData, quote, reconciliation, branding, subject, body }) {
  const args = { type, event, docData, quote, reconciliation, branding };
  const { pdf, filename } = type === "quotation" && quote ? await loadTicketPdf(event, quote, true)
    : lang === "ar" ? await buildCateringPdfArabic(args) : await buildCateringPdf(args);

  const blob = pdf.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });
  const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });

  const vars = buildDocEmailVars({ lang, type, event, docData, branding, link: file_url });
  const finalSubject = fillTemplate(subject || DEFAULT_DOC_EMAIL_SUBJECT, vars);
  const finalBody = fillTemplate(body || DEFAULT_DOC_EMAIL_BODY, vars);

  return base44.integrations.Core.SendEmail({
    to: email,
    subject: finalSubject,
    text: finalBody,
    from_name: branding?.brand_name || undefined,
  });
}
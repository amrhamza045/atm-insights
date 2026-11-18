import { base44 } from "@/api/base44Client";
import { buildCateringPdf } from "./cateringPdf";
import { buildCateringPdfArabic } from "./cateringPdfArabic";
import { DOC_STRINGS } from "./cateringDocStrings";
import { loadTicketPdf } from "./kitchenTicketPdf";
import { formatCurrency } from "@/components/utils/currencyFormatter";

/**
 * Regenerates the document PDF from the current state, uploads it so Twilio can
 * fetch it, and sends it to the client's WhatsApp as a document attachment.
 * Never reuses a previously uploaded file — a revised quote must never be sent
 * from a stale PDF.
 */
export async function sendCateringDocumentWhatsApp({ lang, phone, type, event, docData, quote, reconciliation, branding }) {
  const args = { type, event, docData, quote, reconciliation, branding };
  const { pdf, filename } = type === "quotation" && quote ? await loadTicketPdf(event, quote, true)
    : lang === "ar" ? await buildCateringPdfArabic(args) : await buildCateringPdf(args);

  const blob = pdf.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });
  const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });

  const s = DOC_STRINGS[lang];
  const caption = [
    `${s.titles[type]} — ${event.event_name}`,
    `${s.total}: ${formatCurrency(docData.total, true)}`,
    branding?.brand_name || "",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await base44.functions.invoke("sendWhatsAppMessage", {
    phone_number: phone || event.client_phone,
    message: caption,
    media_url: file_url,
  });
  return res?.data;
}
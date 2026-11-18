import { DOC_STRINGS } from "./cateringDocStrings";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export const DEFAULT_DOC_EMAIL_SUBJECT = "{{document_type}} — {{event_name}}";

export const DEFAULT_DOC_EMAIL_BODY = `Dear {{client_name}},

Please find your {{document_type}} for {{event_name}} on {{event_date}} as a PDF below.

Total: {{total}}

Download the PDF: {{link}}

Kind regards,
{{brand_name}}`;

export const DEFAULT_DOC_EMAIL_SUBJECT_AR = "{{document_type}} — {{event_name}}";

export const DEFAULT_DOC_EMAIL_BODY_AR = `عزيزنا {{client_name}}،

تجد أدناه {{document_type}} الخاص بمناسبة {{event_name}} بتاريخ {{event_date}} بصيغة PDF.

الإجمالي: {{total}}

رابط تحميل الملف: {{link}}

مع أطيب التحيات،
{{brand_name}}`;

/** Picks the saved template for a language, falling back to the built-in default. */
export function resolveDocTemplate(mailConfig, lang) {
  if (lang === "ar") {
    return {
      subject: mailConfig?.doc_email_subject_ar || DEFAULT_DOC_EMAIL_SUBJECT_AR,
      body: mailConfig?.doc_email_body_ar || DEFAULT_DOC_EMAIL_BODY_AR,
    };
  }
  return {
    subject: mailConfig?.doc_email_subject || DEFAULT_DOC_EMAIL_SUBJECT,
    body: mailConfig?.doc_email_body || DEFAULT_DOC_EMAIL_BODY,
  };
}

export function fillTemplate(template = "", vars = {}) {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.split(`{{${key}}}`).join(value ?? ""),
    template
  );
}

/** Values available to the document email templates. `link` is only known once
 *  the PDF has been uploaded, so it stays a placeholder until send time. */
export function buildDocEmailVars({ lang, type, event, docData, branding, link = "{{link}}" }) {
  const s = DOC_STRINGS[lang] || DOC_STRINGS.en;
  return {
    client_name: event?.client_name || "",
    event_name: event?.event_name || "",
    event_date: event?.event_date || "",
    document_type: s.titles[type] || type,
    total: formatCurrency(docData?.total, true),
    brand_name: branding?.brand_name || "",
    link,
  };
}
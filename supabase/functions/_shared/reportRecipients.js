/** Report recipients come only from ReportRecipientSettings (Notification settings). Pass a service-role client. */
export async function getReportRecipients(svc, key) {
  const rows = await svc.entities.ReportRecipientSettings.filter({ setting_key: 'report_recipients' });
  return (rows[0]?.[key] || []).map((e) => String(e).trim()).filter(Boolean);
}

/** Sends to every configured recipient; returns how many were sent (0 = none configured). */
export async function sendReport(svc, key, subject, body) {
  const to = await getReportRecipients(svc, key);
  for (const email of to) await svc.integrations.Core.SendEmail({ to: email, subject, body });
  return to.length;
}
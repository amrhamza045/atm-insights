// The reconciliation fields an event invoice journal is posted from (B06). Saved on the
// journal and compared by the health check, so a changed final invoice is never missed.
export const revenueSnapshot = (r) => ({ status: r.status, event_id: r.event_id, quote_id: r.quote_id || '', final_billing_total: Number(r.final_billing_total) || 0, finalized_date: r.finalized_date || '' });
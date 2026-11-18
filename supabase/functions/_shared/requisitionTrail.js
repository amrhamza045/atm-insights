const MAX_CLAIM_ATTEMPTS = 25;

export const STALE_MESSAGE = 'This requisition was updated — please reload';

const conflict = () => {
  const error = new Error(STALE_MESSAGE);
  error.status = 409;
  error.code = 'stale';
  return error;
};

/**
 * Claim the next revision number with a compare-and-swap on Requisition.current_revision:
 * the conditional update only matches while the counter still holds the value just read,
 * so two simultaneous writers can never get the same number — the loser re-reads and retries.
 * The requisition patch lands in the same update, so header state follows revision order.
 * `expect` (e.g. { status: 'draft' }) joins the same condition: a state transition happens
 * at most once, and a writer that finds the state already moved gets a 409 instead.
 */
async function claimRevisionNumber(svc, requisitionId, requisitionPatch, expect) {
  for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
    const fresh = await svc.entities.Requisition.get(requisitionId);
    if (expect && Object.entries(expect).some(([key, value]) => (key === 'current_revision' ? Number(fresh[key]) || 0 : fresh[key]) !== value)) throw conflict();
    const current = Number(fresh.current_revision) || 0;
    const { updated } = await svc.entities.Requisition.updateMany(
      { id: requisitionId, current_revision: current, ...(expect || {}) },
      { $set: { ...requisitionPatch, current_revision: current + 1 } },
    );
    if (updated === 1) return current + 1;
    await new Promise((resolve) => setTimeout(resolve, 25 + Math.random() * 75));
  }
  throw new Error('Too many simultaneous changes to this requisition — try again');
}

/**
 * The Permit Trail. RequisitionRevision is append-only: this is its only writer
 * and it only ever creates. The entity's data rules refuse every create, update
 * and delete that doesn't come from a backend function, admins included.
 * The number is claimed before the entry is written, so a failed write leaves a
 * visible gap in the numbering, never a duplicate.
 * Always pass an elevated (service-role) client.
 */
export async function appendRevision(svc, requisition, entry, requisitionPatch = {}, expect = null) {
  const revision_number = await claimRevisionNumber(svc, requisition.id, requisitionPatch, expect);
  return svc.entities.RequisitionRevision.create({
    line_snapshots: [],
    ...entry,
    requisition_id: requisition.id,
    event_id: requisition.event_id,
    branch_id: requisition.branch_id,
    revision_number,
    action_date: new Date().toISOString(),
  });
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { isSafetyValveEmail } from '../../shared/platformRole.js';

// Vendor contact details for manual footers. Readable by any signed-in user; can_edit only for the safety-valve account.
export default async function(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const [rec] = await base44.asServiceRole.entities.VendorSupportInfo.filter({ setting_key: 'vendor_support' });
  return Response.json({
    email: rec?.support_email || '',
    website: rec?.website || '',
    mobile: rec?.mobile || '',
    can_edit: isSafetyValveEmail(user.email),
  });
}
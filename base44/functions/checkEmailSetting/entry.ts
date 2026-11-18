import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { isEmailEnabled, EMAIL_KEYS } from '../../shared/emailSettings.js';

// Returns only whether one email type is switched on — no other settings leak.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { event_key } = await req.json();
    if (!EMAIL_KEYS.includes(event_key)) {
      return Response.json({ error: 'Unknown email type' }, { status: 400 });
    }
    const enabled = await isEmailEnabled(base44.asServiceRole, event_key);
    return Response.json({ enabled });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
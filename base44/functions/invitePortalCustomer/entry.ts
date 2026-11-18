import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { checkPermission } from '../../shared/requirePermission.js';

/**
 * Staff-triggered customer portal access.
 *
 * action = "invite": invite (or link) an email against a Client record, and stamp
 *   portal_client_id onto the user account if it already exists.
 * action = "sync": stamp any invited-but-unlinked emails whose accounts now exist.
 * action = "revoke": clear the link from the account so it can no longer see the client's data.
 *
 * Runs with the service role because linking requires writing to another user's
 * account, which non-admin coordinators cannot do directly.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only internal staff may grant portal access. A portal customer must never reach this.
    // Portal customers must never reach this — but an admin who also has a portal link keeps staff powers.
    const canEdit = (await checkPermission(base44, user, 'catering_edit')).allowed;
    if (user.portal_client_id && !canEdit) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (!canEdit && !user.is_catering_staff) {
      return Response.json({ error: 'Only catering staff can manage portal access' }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action || 'invite';
    const svc = base44.asServiceRole;

    const findUserByEmail = async (email) => {
      const matches = await svc.entities.User.filter({ email: String(email).toLowerCase().trim() });
      return matches[0] || null;
    };

    if (action === 'invite') {
      const email = String(body.email || '').toLowerCase().trim();
      const clientId = body.client_id;
      if (!email || !clientId) return Response.json({ error: 'email and client_id are required' }, { status: 400 });

      const client = await svc.entities.Client.get(clientId);
      if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

      // A portal login can only ever see this client's events, so inviting against a
      // client that owns none is always a mistake — usually a duplicate record. Refuse it.
      const clientEvents = await svc.entities.CateringEvent.filter({ client_id: clientId });
      if (!clientEvents.length) {
        return Response.json({
          error: `"${client.name}" has no catering events, so a portal invitation would show an empty portal. This usually means the events sit on a duplicate record — invite from the event itself, or merge the duplicates first.`,
        }, { status: 409 });
      }

      // One client per portal account — refuse an email already linked elsewhere.
      const existingAccess = await svc.entities.CateringPortalAccess.filter({ email });
      const conflict = existingAccess.find((a) => a.client_id !== clientId && a.status !== 'revoked');
      if (conflict) {
        return Response.json({ error: `That email already has portal access for ${conflict.client_name}` }, { status: 409 });
      }

      let account = await findUserByEmail(email);
      let invited = false;
      if (!account) {
        await base44.users.inviteUser(email, 'user');
        invited = true;
      }

      if (account) {
        await svc.entities.User.update(account.id, {
          portal_client_id: clientId,
          portal_client_name: client.name || '',
        });
      }

      const record = existingAccess.find((a) => a.client_id === clientId);
      const payload = {
        client_id: clientId,
        client_name: client.name || '',
        email,
        status: account ? 'linked' : 'invited',
        linked_user_id: account?.id || '',
        invited_by: user.email,
        invited_date: new Date().toISOString(),
        linked_date: account ? new Date().toISOString() : undefined,
      };
      const access = record
        ? await svc.entities.CateringPortalAccess.update(record.id, payload)
        : await svc.entities.CateringPortalAccess.create(payload);

      // Email the customer their portal link.
      const portalUrl = body.portal_url || '';
      let emailSent = false;
      try {
        await svc.integrations.Core.SendEmail({
          to: email,
          subject: `Your ${client.name || 'customer'} portal access`,
          body: `Hello,\n\nYou now have access to your customer portal, where you can follow your events, quotes and payments.\n\nOpen your portal here:\n${portalUrl}\n\nSign in with this email address (${email}). If you have not created a password yet, use the invitation email you received to set up your account first.\n\nThank you.`,
        });
        emailSent = true;
      } catch (_e) {
        emailSent = false;
      }

      return Response.json({ ok: true, invited, linked: !!account, emailSent, access });
    }

    if (action === 'sync') {
      const pending = await svc.entities.CateringPortalAccess.filter({ status: 'invited' });
      const linked = [];
      for (const row of pending) {
        const account = await findUserByEmail(row.email);
        if (!account) continue;
        await svc.entities.User.update(account.id, {
          portal_client_id: row.client_id,
          portal_client_name: row.client_name || '',
        });
        await svc.entities.CateringPortalAccess.update(row.id, {
          status: 'linked',
          linked_user_id: account.id,
          linked_date: new Date().toISOString(),
        });
        linked.push(row.email);
      }
      return Response.json({ ok: true, linkedCount: linked.length, linked });
    }

    if (action === 'revoke') {
      const row = await svc.entities.CateringPortalAccess.get(body.access_id);
      if (!row) return Response.json({ error: 'Access record not found' }, { status: 404 });
      const account = row.linked_user_id ? await svc.entities.User.get(row.linked_user_id) : await findUserByEmail(row.email);
      if (account) {
        await svc.entities.User.update(account.id, { portal_client_id: '', portal_client_name: '' });
      }
      await svc.entities.CateringPortalAccess.update(row.id, {
        status: 'revoked',
        revoked_by: user.email,
        revoked_date: new Date().toISOString(),
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
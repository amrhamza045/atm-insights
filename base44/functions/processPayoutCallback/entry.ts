import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { loadBrandName } from '../../shared/brand.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // No payment gateway calls this: admins only, so no one else can mark payouts paid or move balances.
        const user = await base44.auth.me().catch(() => null);
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admins only' }, { status: 403 });
        const brand = await loadBrandName(base44);
        
        // Webhook payload from payment gateway
        const { payoutId, status, transactionReference, errorMessage } = await req.json();

        if (!payoutId || !status) {
            return Response.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // Fetch payout
        const payout = await base44.asServiceRole.entities.Payout.get(payoutId);
        if (!payout) {
            return Response.json({ error: 'Payout not found' }, { status: 404 });
        }

        // Fetch client
        const client = await base44.asServiceRole.entities.Client.get(payout.client_id);

        if (status === 'completed' || status === 'success') {
            // Update client balances
            await base44.asServiceRole.entities.Client.update(client.id, {
                available_payout: (client.available_payout || 0) - payout.amount,
                consumed_payout: (client.consumed_payout || 0) + payout.amount,
                total_payout: (client.payout_earned || 0)
            });

            // Update payout status
            await base44.asServiceRole.entities.Payout.update(payoutId, {
                status: 'completed',
                transaction_reference: transactionReference || 'AUTO-PROCESSED',
                processed_by: 'system_automation'
            });

            // Send success notification
            await base44.asServiceRole.entities.Notification.create({
                client_id: payout.client_id,
                client_email: payout.client_email,
                title: "Payout Completed! 💰",
                message: `Your payout of £${payout.amount.toFixed(2)} has been successfully processed. Transaction reference: ${transactionReference || 'AUTO-PROCESSED'}`,
                type: "system",
                read: false
            });

            // Send email notification
            await base44.asServiceRole.integrations.Core.SendEmail({
                from_name: brand,
                to: payout.client_email,
                subject: `${brand} Partner: Payout Completed Successfully`,
                body: `Great news! Your payout request for £${payout.amount.toFixed(2)} has been successfully processed via ${payout.payment_method}. 
                
Transaction Reference: ${transactionReference || 'AUTO-PROCESSED'}

The amount has been sent to your provided payment details: ${payout.payment_details}.

Thank you for being a valued partner!

Best regards,
${brand} Team`
            });

        } else if (status === 'failed' || status === 'error') {
            // Update payout to rejected
            await base44.asServiceRole.entities.Payout.update(payoutId, {
                status: 'rejected',
                rejection_reason: errorMessage || 'Payment gateway processing failed',
                processed_by: 'system_automation'
            });

            // Send failure notification
            await base44.asServiceRole.entities.Notification.create({
                client_id: payout.client_id,
                client_email: payout.client_email,
                title: "Payout Processing Failed",
                message: `Your payout request of £${payout.amount.toFixed(2)} could not be processed. Reason: ${errorMessage || 'Payment gateway error'}. Please contact support.`,
                type: "system",
                read: false
            });

            // Send email notification
            await base44.asServiceRole.integrations.Core.SendEmail({
                from_name: brand,
                to: payout.client_email,
                subject: `${brand} Partner: Payout Processing Failed`,
                body: `We're sorry, but your payout request for £${payout.amount.toFixed(2)} could not be processed.

Reason: ${errorMessage || 'Payment gateway processing error'}

Your payout balance remains available. Please verify your payment details and try again, or contact our support team for assistance.

Best regards,
${brand} Team`
            });
        }

        return Response.json({ success: true, message: 'Payout status updated' });
    } catch (error) {
        console.error('Error processing payout callback:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
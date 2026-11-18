import { base44 } from "@/api/base44Client";
import { getBrandName } from "@/lib/brandName";

/**
 * Check if email notification is enabled for a specific event
 */
export async function isEmailNotificationEnabled(eventKey) {
  try {
    const brand = await getBrandName();
    // Checked on the server — most users can't read the settings record.
    const res = await base44.functions.invoke("checkEmailSetting", { event_key: eventKey });
    return res.data?.enabled !== false;
  } catch (error) {
    console.error("Failed to check email notification settings:", error);
    return true; // Default to enabled if check fails
  }
}

/**
 * Send email notification for successful registration
 */
export async function sendRegistrationApprovedEmail(clientData, referralCode, welcomeCashback, tierInfo) {
  if (!(await isEmailNotificationEnabled('registration_approved'))) return;
  try {
    const brand = await getBrandName();
    await base44.integrations.Core.SendEmail({
      to: clientData.email,
      from_name: `${brand} Partner`,
      subject: `Welcome to ${brand} Partner Program! 🎉`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">Welcome ${clientData.name}!</h2>
          <p>Congratulations! Your ${brand} Partner account has been approved.</p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin-top: 0; color: #92400e;">Your Referral Code</h3>
            <p style="font-size: 28px; font-weight: bold; color: #f59e0b; margin: 10px 0; letter-spacing: 2px;">${referralCode}</p>
            <p style="color: #78350f; margin-bottom: 0;">Share this code with friends and family to earn cashback rewards!</p>
          </div>
          
          ${welcomeCashback > 0 ? `
            <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 0; color: #065f46;"><strong>🎁 Welcome Bonus:</strong> ${welcomeCashback.toFixed(2)} EGP added to your cashback balance</p>
            </div>
          ` : ''}
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">How It Works</h3>
            <ol style="color: #4b5563; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Share your referral code with others</li>
              <li style="margin-bottom: 8px;">When they register and make purchases, you earn cashback based on your tier level</li>
              <li style="margin-bottom: 8px;">Redeem your cashback for exclusive rewards or withdraw as cash</li>
              <li style="margin-bottom: 8px;">The more people you refer, the higher your tier and cashback rate!</li>
            </ol>
          </div>
          
          <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af;"><strong>Current Tier:</strong> ${tierInfo?.level_name || 'Bronze'}</p>
            <p style="margin: 5px 0 0 0; color: #3b82f6; font-size: 14px;">
              Level 1: ${tierInfo?.cashback_percentage_level1 || 10}% | 
              Level 2: ${tierInfo?.cashback_percentage_level2 || 0}% | 
              Level 3: ${tierInfo?.cashback_percentage_level3 || 0}%
            </p>
          </div>
          
          <p style="margin-top: 30px; color: #6b7280;">Visit our restaurant and enjoy your membership benefits!</p>
          
          <p style="color: #6b7280; margin-top: 30px;">Best regards,<br><strong>The ${brand} Partner Team</strong></p>
        </div>
      `
    });
  } catch (error) {
    console.error("Failed to send registration email:", error);
  }
}

/**
 * Send email notification for payout approval
 */
export async function sendPayoutApprovedEmail(payoutData, clientData) {
  if (!(await isEmailNotificationEnabled('payout_approved'))) return;
  try {
    const brand = await getBrandName();
    await base44.integrations.Core.SendEmail({
      to: clientData.email,
      from_name: `${brand} Partner`,
      subject: "Payout Request Approved! 💰",
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Great News, ${clientData.name}!</h2>
          <p>Your payout request has been <strong>approved</strong> and is being processed.</p>
          
          <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="margin-top: 0; color: #065f46;">Payout Details</h3>
            <table style="width: 100%; color: #047857;">
              <tr>
                <td style="padding: 8px 0;"><strong>Amount:</strong></td>
                <td style="text-align: right; font-size: 24px; font-weight: bold;">£${payoutData.amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Method:</strong></td>
                <td style="text-align: right;">${payoutData.payment_method.replace(/_/g, ' ').toUpperCase()}</td>
              </tr>
              ${payoutData.transaction_reference ? `
                <tr>
                  <td style="padding: 8px 0;"><strong>Reference:</strong></td>
                  <td style="text-align: right;">${payoutData.transaction_reference}</td>
                </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>Payment Details:</strong> ${payoutData.payment_details}
            </p>
          </div>
          
          <p style="color: #6b7280;">The funds will be transferred to your specified account within 1-3 business days.</p>
          
          ${payoutData.receipt_url ? `
            <p style="color: #6b7280;">
              <a href="${/^https?:\/\//.test(payoutData.receipt_url) ? payoutData.receipt_url : window.location.origin + '/MyProfile'}" style="color: #f59e0b; text-decoration: none;">View Payment Receipt →</a>
            </p>
          ` : ''}
          
          <p style="color: #6b7280; margin-top: 30px;">Thank you for being a valued member of ${brand} Partner!</p>
          
          <p style="color: #6b7280; margin-top: 30px;">Best regards,<br><strong>The ${brand} Partner Team</strong></p>
        </div>
      `
    });
  } catch (error) {
    console.error("Failed to send payout approval email:", error);
  }
}

/**
 * Send email notification for payout rejection
 */
export async function sendPayoutRejectedEmail(payoutData, clientData, reason) {
  if (!(await isEmailNotificationEnabled('payout_rejected'))) return;
  try {
    const brand = await getBrandName();
    await base44.integrations.Core.SendEmail({
      to: clientData.email,
      from_name: `${brand} Partner`,
      subject: "Payout Request Update",
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Payout Request Update</h2>
          <p>Hello ${clientData.name},</p>
          <p>We regret to inform you that your payout request for <strong>£${payoutData.amount.toFixed(2)}</strong> could not be processed.</p>
          
          <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h3 style="margin-top: 0; color: #991b1b;">Reason</h3>
            <p style="color: #7f1d1d; margin: 0;">${reason || "Payment details could not be verified. Please check your information and try again."}</p>
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #374151;"><strong>What to do next:</strong></p>
            <ul style="color: #4b5563; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Verify your payment details are correct</li>
              <li>Ensure your account meets the minimum payout requirements</li>
              <li>Contact support if you need assistance</li>
              <li>Submit a new payout request when ready</li>
            </ul>
          </div>
          
          <p style="color: #6b7280;">Your cashback balance of <strong>£${payoutData.amount.toFixed(2)}</strong> has been returned to your account.</p>
          
          <p style="color: #6b7280; margin-top: 30px;">If you have any questions, please don't hesitate to contact our support team.</p>
          
          <p style="color: #6b7280; margin-top: 30px;">Best regards,<br><strong>The ${brand} Partner Team</strong></p>
        </div>
      `
    });
  } catch (error) {
    console.error("Failed to send payout rejection email:", error);
  }
}

/**
 * Send email notification for new rewards
 */
export async function sendNewRewardsEmail(clientEmail, clientName, rewards) {
  if (!(await isEmailNotificationEnabled('new_rewards'))) return;
  try {
    const brand = await getBrandName();
    const rewardsList = rewards.map(r => `
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <h4 style="margin: 0 0 8px 0; color: #1f2937;">${r.name}</h4>
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">${r.description || ''}</p>
        <p style="margin: 0; color: #f59e0b; font-weight: bold; font-size: 18px;">
          ${r.is_variable_cost ? 'Variable Amount' : `£${r.cashback_cost.toFixed(2)} cashback`}
        </p>
      </div>
    `).join('');

    await base44.integrations.Core.SendEmail({
      to: clientEmail,
      from_name: `${brand} Partner`,
      subject: "New Rewards Available! 🎁",
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">Exciting News, ${clientName}!</h2>
          <p>We've added <strong>${rewards.length} new reward${rewards.length > 1 ? 's' : ''}</strong> that you can redeem with your cashback!</p>
          
          <div style="margin: 20px 0;">
            ${rewardsList}
          </div>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 15px 0; color: #78350f; font-size: 16px;">Start redeeming your cashback today!</p>
            <a href="${window.location.origin}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Rewards
            </a>
          </div>
          
          <p style="color: #6b7280; margin-top: 30px;">Don't miss out on these exclusive rewards!</p>
          
          <p style="color: #6b7280; margin-top: 30px;">Best regards,<br><strong>The ${brand} Partner Team</strong></p>
        </div>
      `
    });
  } catch (error) {
    console.error("Failed to send new rewards email:", error);
  }
}

/**
 * Send email notification for tier upgrade
 */
export async function sendTierUpgradeEmail(clientEmail, clientName, oldTier, newTier, referralCount) {
  if (!(await isEmailNotificationEnabled('tier_upgrade'))) return;
  try {
    const brand = await getBrandName();
    await base44.integrations.Core.SendEmail({
      to: clientEmail,
      from_name: `${brand} Partner`,
      subject: `Congratulations! You've Reached ${newTier.level_name} Tier! 🏆`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">Congratulations, ${clientName}! 🎉</h2>
          <p>You've been upgraded to the <strong>${newTier.level_name}</strong> tier!</p>
          
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; border: 2px solid #f59e0b;">
            <div style="font-size: 48px; margin-bottom: 10px;">🏆</div>
            ${oldTier ? `
              <p style="color: #78350f; margin: 0; text-decoration: line-through; opacity: 0.6;">${oldTier.level_name}</p>
              <div style="font-size: 24px; color: #92400e; margin: 10px 0;">↓</div>
            ` : ''}
            <p style="color: #78350f; font-size: 32px; font-weight: bold; margin: 0;">${newTier.level_name}</p>
            <p style="color: #92400e; margin: 10px 0 0 0; font-size: 14px;">Based on ${referralCount} successful referrals</p>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Your New Benefits</h3>
            <table style="width: 100%; color: #4b5563; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0;"><strong>Level 1 Cashback:</strong></td>
                <td style="text-align: right; color: #10b981; font-weight: bold;">${newTier.cashback_percentage_level1}%</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Level 2 Cashback:</strong></td>
                <td style="text-align: right; color: #10b981; font-weight: bold;">${newTier.cashback_percentage_level2 || 0}%</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Level 3 Cashback:</strong></td>
                <td style="text-align: right; color: #10b981; font-weight: bold;">${newTier.cashback_percentage_level3 || 0}%</td>
              </tr>
              ${newTier.self_cashback_percentage ? `
                <tr>
                  <td style="padding: 8px 0;"><strong>Self Cashback:</strong></td>
                  <td style="text-align: right; color: #10b981; font-weight: bold;">${newTier.self_cashback_percentage}%</td>
                </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              💡 <strong>Keep growing your network</strong> to unlock even higher tiers and better cashback rates!
            </p>
          </div>
          
          <p style="color: #6b7280; margin-top: 30px;">Thank you for your continued growth with ${brand} Partner!</p>
          
          <p style="color: #6b7280; margin-top: 30px;">Best regards,<br><strong>The ${brand} Partner Team</strong></p>
        </div>
      `
    });
  } catch (error) {
    console.error("Failed to send tier upgrade email:", error);
  }
}
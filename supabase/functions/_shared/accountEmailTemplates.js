// Customer account emails (Admin › Email › Customer accounts & loyalty), built on the server
// so copies to staff never carry content from the browser.
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function welcomeEmail({ brand, name, referralCode, welcomeCashback }) {
  return {
    from_name: `${brand} GenMo`,
    subject: `Welcome to ${brand} GenMo! 🎉`,
    body: `<h2>Welcome ${esc(name)}!</h2>
      <p>Congratulations! Your ${esc(brand)} GenMo account has been created.</p>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Your Referral Code</h3>
        <p style="font-size: 24px; font-weight: bold; color: #f59e0b; margin: 10px 0;">${esc(referralCode)}</p>
        <p>Share this code with friends and family to earn cashback rewards!</p>
        ${welcomeCashback > 0 ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
          <p><strong>Welcome Bonus:</strong> ${welcomeCashback.toFixed(2)} EGP added to your cashback balance!</p>
        </div>` : ''}
      </div>
      <p>Visit our restaurant and enjoy your membership benefits!</p>
      <p>Best regards,<br>The ${esc(brand)} GenMo Team</p>`,
  };
}

const benefitRow = (label, value) => `<tr>
  <td style="padding: 8px 0;"><strong>${label}:</strong></td>
  <td style="text-align: right; color: #10b981; font-weight: bold;">${Number(value) || 0}%</td>
</tr>`;

export function tierUpgradeEmail({ brand, name, previous, tier, referrals }) {
  return {
    from_name: `${brand} Partner`,
    subject: `Congratulations! You've Reached ${tier.level_name} Tier! 🏆`,
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Congratulations, ${esc(name)}! 🎉</h2>
      <p>You've been upgraded to the <strong>${esc(tier.level_name)}</strong> tier!</p>
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; border: 2px solid #f59e0b;">
        <div style="font-size: 48px; margin-bottom: 10px;">🏆</div>
        <p style="color: #78350f; margin: 0; text-decoration: line-through; opacity: 0.6;">${esc(previous.level_name)}</p>
        <div style="font-size: 24px; color: #92400e; margin: 10px 0;">↓</div>
        <p style="color: #78350f; font-size: 32px; font-weight: bold; margin: 0;">${esc(tier.level_name)}</p>
        <p style="color: #92400e; margin: 10px 0 0 0; font-size: 14px;">Based on ${referrals} successful referrals</p>
      </div>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1f2937; margin-top: 0;">Your New Benefits</h3>
        <table style="width: 100%; color: #4b5563; font-size: 14px;">
          ${benefitRow('Level 1 Cashback', tier.cashback_percentage_level1)}
          ${benefitRow('Level 2 Cashback', tier.cashback_percentage_level2)}
          ${benefitRow('Level 3 Cashback', tier.cashback_percentage_level3)}
          ${tier.self_cashback_percentage ? benefitRow('Self Cashback', tier.self_cashback_percentage) : ''}
        </table>
      </div>
      <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">💡 <strong>Keep growing your network</strong> to unlock even higher tiers and better cashback rates!</p>
      </div>
      <p style="color: #6b7280; margin-top: 30px;">Thank you for your continued growth with ${esc(brand)} Partner!</p>
      <p style="color: #6b7280; margin-top: 30px;">Best regards,<br><strong>The ${esc(brand)} Partner Team</strong></p>
    </div>`,
  };
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { sendReport } from '../../shared/reportRecipients.js';
import { getCompanyOffset, formatInOffset, companyDay } from '../../shared/companyTimezone.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const denied = await denyUnlessPermitted(base44, user, 'financial_view');
    if (denied) return denied;

    const body = await req.json().catch(() => ({}));
    const sessionId = body.session_id;

    if (!sessionId) {
      return Response.json({ error: 'session_id is required' }, { status: 400 });
    }

    // Fetch the cashier session
    const session = await base44.asServiceRole.entities.CashierSession.get(sessionId);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const branchId = session.branch_id;
    const branchName = session.branch_name || 'Unknown Branch';
    const openingTime = session.opening_time;
    const closingTime = session.closing_time || new Date().toISOString();

    // Fetch all compliance records for this session
    const complianceRecords = await base44.asServiceRole.entities.DeliveryReceiptCompliance.filter({
      session_id: sessionId
    });

    // Fetch orders for this session (by branch + date range)
    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 500);
    const sessionOrders = allOrders.filter(o => {
      if (o.branch_id !== branchId) return false;
      const orderDate = new Date(o.created_date).getTime();
      return orderDate >= new Date(openingTime).getTime() && orderDate <= new Date(closingTime).getTime();
    });

    // Categorize orders by payment method
    const paymentSummary = {
      cash: 0,
      cl: 0,
      visa: 0,
      instapay: 0,
      hospitality: 0,
      recharge_balance: 0,
      other: 0
    };

    const orderCountByMethod = {
      cash: 0,
      cl: 0,
      visa: 0,
      instapay: 0,
      hospitality: 0,
      recharge_balance: 0,
      other: 0
    };

    for (const order of sessionOrders) {
      const pm = (order.payment_method || 'other').toLowerCase();
      const total = order.total || 0;
      if (pm === 'cash') {
        paymentSummary.cash += total;
        orderCountByMethod.cash++;
      } else if (pm === 'cl') {
        paymentSummary.cl += total;
        orderCountByMethod.cl++;
      } else if (pm === 'visa' || pm === 'visa_cash' || pm === 'visa_instapay') {
        paymentSummary.visa += total;
        orderCountByMethod.visa++;
      } else if (pm === 'instapay') {
        paymentSummary.instapay += total;
        orderCountByMethod.instapay++;
      } else if (pm === 'hospitality') {
        paymentSummary.hospitality += total;
        orderCountByMethod.hospitality++;
      } else if (pm === 'recharge_balance') {
        paymentSummary.recharge_balance += total;
        orderCountByMethod.recharge_balance++;
      } else {
        paymentSummary.other += total;
        orderCountByMethod.other++;
      }
    }

    // Fetch expenses for this session
    const allExpenses = await base44.asServiceRole.entities.Expense.list('-expense_date', 500);
    const sessionExpenses = allExpenses.filter(e => {
      if (e.branch_id !== branchId) return false;
      const expDate = new Date(e.expense_date || e.created_date).getTime();
      return expDate >= new Date(openingTime).getTime() && expDate <= new Date(closingTime).getTime();
    });
    const totalExpenses = sessionExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Fetch purchases (cashier purchases) for this session
    let totalPurchases = 0;
    try {
      const allPurchases = await base44.asServiceRole.entities.CashierPurchase.list('-created_date', 500);
      const sessionPurchases = allPurchases.filter(p => {
        if (p.branch_id !== branchId && p.session_id !== sessionId) return false;
        const purDate = new Date(p.created_date).getTime();
        return purDate >= new Date(openingTime).getTime() && purDate <= new Date(closingTime).getTime();
      });
      totalPurchases = sessionPurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
    } catch (e) {
      // CashierPurchase might not exist
    }

    // Also try PurchaseInvoice
    try {
      const allInvoices = await base44.asServiceRole.entities.PurchaseInvoice.list('-created_date', 500);
      const sessionInvoices = allInvoices.filter(p => {
        if (p.branch_id !== branchId) return false;
        const invDate = new Date(p.created_date || p.invoice_date).getTime();
        return invDate >= new Date(openingTime).getTime() && invDate <= new Date(closingTime).getTime();
      });
      totalPurchases += sessionInvoices.reduce((sum, p) => sum + (p.total_amount || p.amount || 0), 0);
    } catch (e) {
      // PurchaseInvoice might not exist
    }

    // Build compliance summary
    const totalDeliveryOrders = complianceRecords.length;
    const compliantCount = complianceRecords.filter(r => r.compliance_status === 'compliant').length;
    const nonCompliantCount = complianceRecords.filter(r => r.compliance_status === 'non_compliant').length;
    const noReceiptCount = complianceRecords.filter(r => r.compliance_status === 'no_receipt').length;

    // Mark records as report_sent
    for (const record of complianceRecords) {
      if (!record.report_sent) {
        await base44.asServiceRole.entities.DeliveryReceiptCompliance.update(record.id, { report_sent: true });
      }
    }

    // Build HTML email
    const fmtCurrency = (amt) => {
      const num = Number(amt || 0);
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const tzOffset = await getCompanyOffset(base44.asServiceRole.entities);
    const fmtDateTime = (dt) => dt ? formatInOffset(dt, tzOffset) : 'N/A';

    // Build compliance entries table rows
    const complianceRows = complianceRecords.map(r => `
      <tr style="${r.compliance_status === 'non_compliant' ? 'background:#fef2f2;' : r.compliance_status === 'no_receipt' ? 'background:#fffbeb;' : ''}">
        <td style="padding:8px;border:1px solid #e5e7eb;">${r.delivery_company_name || 'N/A'}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${r.customer_name || 'N/A'}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${r.customer_phone || 'N/A'}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${fmtCurrency(r.order_total)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${r.scanned_payment_method || 'N/A'}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${r.pos_payment_method || 'N/A'}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${r.expected_pos_payment_method || 'N/A'}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;color:${r.compliance_status === 'compliant' ? '#16a34a' : r.compliance_status === 'non_compliant' ? '#dc2626' : '#d97706'};">
          ${r.compliance_status.toUpperCase().replace('_', ' ')}
        </td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${r.cashier_name || 'N/A'}</td>
      </tr>
    `).join('');

    const totalSales = paymentSummary.cash + paymentSummary.cl + paymentSummary.visa + paymentSummary.instapay + paymentSummary.hospitality + paymentSummary.recharge_balance + paymentSummary.other;

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto;">
        <h1 style="color:#1e293b;border-bottom:3px solid #f59e0b;padding-bottom:10px;">📋 Delivery Receipt Compliance Report</h1>
        
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;">
          <h2 style="color:#334155;margin:0 0 8px;">Session Details</h2>
          <p style="margin:4px 0;"><strong>Branch:</strong> ${branchName}</p>
          <p style="margin:4px 0;"><strong>Cashier:</strong> ${session.cashier_name || 'N/A'}</p>
          <p style="margin:4px 0;"><strong>Opening Time:</strong> ${fmtDateTime(openingTime)}</p>
          <p style="margin:4px 0;"><strong>Closing Time:</strong> ${fmtDateTime(closingTime)}</p>
          <p style="margin:4px 0;"><strong>Session Date:</strong> ${session.session_date || 'N/A'}</p>
        </div>

        <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0;border:1px solid #bbf7d0;">
          <h2 style="color:#166534;margin:0 0 12px;">📊 Payment Summary</h2>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#dcfce7;">
                <th style="padding:10px;border:1px solid #bbf7d0;text-align:left;">Method</th>
                <th style="padding:10px;border:1px solid #bbf7d0;text-align:right;">Total Amount</th>
                <th style="padding:10px;border:1px solid #bbf7d0;text-align:center;">Orders</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;">💵 Cash</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${fmtCurrency(paymentSummary.cash)}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${orderCountByMethod.cash}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;">📋 CL (Credit Line)</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${fmtCurrency(paymentSummary.cl)}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${orderCountByMethod.cl}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;">💳 Visa</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${fmtCurrency(paymentSummary.visa)}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${orderCountByMethod.visa}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;">📱 InstaPay</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${fmtCurrency(paymentSummary.instapay)}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${orderCountByMethod.instapay}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;">🏨 Hospitality</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${fmtCurrency(paymentSummary.hospitality)}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${orderCountByMethod.hospitality}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;">🔋 Recharge Balance</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${fmtCurrency(paymentSummary.recharge_balance)}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${orderCountByMethod.recharge_balance}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;">Other</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${fmtCurrency(paymentSummary.other)}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${orderCountByMethod.other}</td></tr>
              <tr style="background:#fef3c7;font-weight:bold;"><td style="padding:10px;border:1px solid #e5e7eb;">TOTAL SALES</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;">${fmtCurrency(totalSales)}</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:center;">${sessionOrders.length}</td></tr>
            </tbody>
          </table>
        </div>

        <div style="background:#fffbeb;padding:16px;border-radius:8px;margin:16px 0;border:1px solid #fde68a;">
          <h2 style="color:#92400e;margin:0 0 12px;">💸 Expenses & Purchases</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;border:1px solid #e5e7eb;">Total Expenses</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;">${fmtCurrency(totalExpenses)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;">Total Purchases</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;">${fmtCurrency(totalPurchases)}</td></tr>
          </table>
        </div>

        <div style="background:${nonCompliantCount > 0 || noReceiptCount > 0 ? '#fef2f2' : '#f0fdf4'};padding:16px;border-radius:8px;margin:16px 0;border:1px solid ${nonCompliantCount > 0 || noReceiptCount > 0 ? '#fecaca' : '#bbf7d0'};">
          <h2 style="color:${nonCompliantCount > 0 || noReceiptCount > 0 ? '#dc2626' : '#166534'};margin:0 0 12px;">📋 Delivery Receipt Compliance Summary</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;border:1px solid #e5e7eb;">Total Delivery Orders</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;">${totalDeliveryOrders}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;">✅ Compliant</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;color:#16a34a;">${compliantCount}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;">❌ Non-Compliant (payment method mismatch)</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;color:#dc2626;">${nonCompliantCount}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;">⚠️ No Receipt Uploaded</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;color:#d97706;">${noReceiptCount}</td></tr>
          </table>
        </div>

        ${complianceRecords.length > 0 ? `
        <div style="margin:16px 0;">
          <h2 style="color:#334155;">📋 Delivery Compliance Entries</h2>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Delivery Co.</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Customer</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Phone</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Total</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Receipt PM</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">POS PM</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Expected</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Status</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Cashier</th>
              </tr>
            </thead>
            <tbody>
              ${complianceRows}
            </tbody>
          </table>
        </div>
        ` : '<p style="color:#64748b;font-style:italic;">No delivery company orders in this session.</p>'}

        <div style="margin-top:24px;padding:12px;background:#f8fafc;border-radius:8px;text-align:center;">
          <p style="color:#64748b;font-size:12px;margin:0;">This report was auto-generated on ${fmtDateTime(new Date().toISOString())} when cashier session was closed.</p>
        </div>
      </div>
    `;

    // Send email
    const reportDate = session.session_date || (tzOffset === null ? new Date().toISOString().split('T')[0] : companyDay(tzOffset));
    const recipientsSent = await sendReport(base44.asServiceRole, 'delivery_compliance_report',
      `📋 Compliance Report - ${branchName} - ${reportDate} - Cashier: ${session.cashier_name || 'N/A'}`, htmlBody);

    return Response.json({
      success: true,
      recipientsSent,
      summary: {
        branch: branchName,
        cashier: session.cashier_name,
        totalOrders: sessionOrders.length,
        totalSales,
        totalExpenses,
        totalPurchases,
        paymentSummary,
        compliance: {
          total: totalDeliveryOrders,
          compliant: compliantCount,
          nonCompliant: nonCompliantCount,
          noReceipt: noReceiptCount
        }
      }
    });
  } catch (error) {
    console.error('Compliance report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
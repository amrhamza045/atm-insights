import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { getCompanyOffset, companyDay } from '../../shared/companyTimezone.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        const denied = await denyUnlessPermitted(base44, user, 'payouts_approve');
        if (denied) return denied;

        const { payoutIds, fileFormat = 'csv', bankStandard = 'generic' } = await req.json();

        // Fetch payouts
        const payouts = await base44.entities.Payout.filter({ 
            id: { $in: payoutIds },
            status: 'pending'
        });

        if (payouts.length === 0) {
            return Response.json({ error: 'No valid pending payouts found' }, { status: 400 });
        }

        // Fetch client details
        const clientIds = payouts.map(p => p.client_id);
        const clients = await base44.entities.Client.filter({ 
            id: { $in: clientIds }
        });

        const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
        const tzOffset = await getCompanyOffset(base44.asServiceRole.entities);
        const fileDay = tzOffset === null ? new Date().toISOString().slice(0, 10) : companyDay(tzOffset);

        // Generate file content based on format
        let fileContent = '';
        let mimeType = '';
        let fileName = '';

        if (fileFormat === 'csv') {
            mimeType = 'text/csv';
            fileName = `payouts_${fileDay}.csv`;
            
            // CSV Header
            fileContent = 'Beneficiary Name,Account Number,Amount,Reference,Email,Payment Method\n';
            
            // CSV Rows
            payouts.forEach(payout => {
                const client = clientMap[payout.client_id];
                fileContent += `"${payout.client_name}","${payout.payment_details}",${payout.amount},"PAY-${payout.id.substring(0, 8)}","${payout.client_email}","${payout.payment_method}"\n`;
            });
        } else if (fileFormat === 'xml') {
            mimeType = 'application/xml';
            fileName = `payouts_${fileDay}.xml`;
            
            if (bankStandard === 'sepa') {
                // SEPA XML format (simplified)
                fileContent = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>PAYOUT-${Date.now()}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>${payouts.length}</NbOfTxs>
      <CtrlSum>${payouts.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</CtrlSum>
    </GrpHdr>
    <PmtInf>`;
                
                payouts.forEach(payout => {
                    fileContent += `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>PAY-${payout.id.substring(0, 8)}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="USD">${payout.amount.toFixed(2)}</InstdAmt>
        </Amt>
        <Cdtr>
          <Nm>${payout.client_name}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${payout.payment_details}</IBAN>
          </Id>
        </CdtrAcct>
      </CdtTrfTxInf>`;
                });
                
                fileContent += `
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
            } else {
                // Generic XML format
                fileContent = `<?xml version="1.0" encoding="UTF-8"?>
<PaymentBatch>
  <GeneratedDate>${new Date().toISOString()}</GeneratedDate>
  <TotalPayouts>${payouts.length}</TotalPayouts>
  <TotalAmount>${payouts.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</TotalAmount>
  <Payments>`;
                
                payouts.forEach(payout => {
                    fileContent += `
    <Payment>
      <PayoutId>${payout.id}</PayoutId>
      <Reference>PAY-${payout.id.substring(0, 8)}</Reference>
      <BeneficiaryName>${payout.client_name}</BeneficiaryName>
      <BeneficiaryEmail>${payout.client_email}</BeneficiaryEmail>
      <AccountDetails>${payout.payment_details}</AccountDetails>
      <Amount>${payout.amount.toFixed(2)}</Amount>
      <PaymentMethod>${payout.payment_method}</PaymentMethod>
      <RequestDate>${payout.created_date}</RequestDate>
    </Payment>`;
                });
                
                fileContent += `
  </Payments>
</PaymentBatch>`;
            }
        } else if (fileFormat === 'json') {
            mimeType = 'application/json';
            fileName = `payouts_${fileDay}.json`;
            
            const jsonData = {
                generated_date: new Date().toISOString(),
                total_payouts: payouts.length,
                total_amount: payouts.reduce((sum, p) => sum + p.amount, 0),
                payments: payouts.map(payout => ({
                    payout_id: payout.id,
                    reference: `PAY-${payout.id.substring(0, 8)}`,
                    beneficiary_name: payout.client_name,
                    beneficiary_email: payout.client_email,
                    account_details: payout.payment_details,
                    amount: payout.amount,
                    payment_method: payout.payment_method,
                    request_date: payout.created_date
                }))
            };
            
            fileContent = JSON.stringify(jsonData, null, 2);
        }

        // Update payouts to processing status
        await Promise.all(payouts.map(payout => 
            base44.asServiceRole.entities.Payout.update(payout.id, {
                status: 'processing'
            })
        ));

        // Return file as download
        return new Response(fileContent, {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Cache-Control': 'no-cache'
            }
        });
    } catch (error) {
        console.error('Error generating payment file:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
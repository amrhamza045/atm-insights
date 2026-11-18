import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';

// Staff who print to the business's printers (POS, kitchen tickets, Admin test prints).
const PRINTERS = ['cashier_edit', 'pos_view', 'cashier_view', 'inventory_view', 'inventory_edit', 'purchase_view', 'purchase_edit',
  'kds_view', 'kds_bar_view', 'admin_settings', 'settings_edit', 'catering_view', 'catering_edit'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const denied = await denyUnlessPermitted(base44, user, PRINTERS);
    if (denied) return denied;

    const { htmlContent, printerName } = await req.json();

    if (!htmlContent || !printerName) {
      return Response.json({ error: 'Missing htmlContent or printerName' }, { status: 400 });
    }

    const apiKey = Deno.env.get('PRINTNODE_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'PrintNode API key not configured' }, { status: 500 });
    }

    // Get list of printers to find matching printer ID
    const printersResponse = await fetch('https://api.printnode.com/printers', {
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':')}`
      }
    });

    if (!printersResponse.ok) {
      return Response.json({ error: 'Failed to fetch printers from PrintNode' }, { status: 500 });
    }

    const printers = await printersResponse.json();
    const printer = printers.find(p => p.name === printerName || p.name.includes(printerName));

    if (!printer) {
      return Response.json({ 
        error: `Printer "${printerName}" not found`,
        availablePrinters: printers.map(p => p.name)
      }, { status: 404 });
    }

    // Send print job to PrintNode
    const printJob = {
      printerId: printer.id,
      title: `POS Receipt ${Date.now()}`,
      contentType: 'raw_html',
      content: htmlContent,
      source: 'POS System'
    };

    const printResponse = await fetch('https://api.printnode.com/printjobs', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(printJob)
    });

    if (!printResponse.ok) {
      const error = await printResponse.text();
      return Response.json({ error: `Print failed: ${error}` }, { status: 500 });
    }

    const result = await printResponse.json();
    return Response.json({ 
      success: true, 
      printJobId: result,
      printer: printer.name 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const res = await handler(req);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});

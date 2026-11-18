import React, { useMemo, useState } from "react";
import { brandName } from "@/lib/brandName";
import { withGroupHeaders, collapsePackageLines } from "./docLineGroups";
import { useCateringSettings } from "./useCateringSettings";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { downloadCateringPdf } from "./cateringPdf";
import { downloadCateringPdfArabic } from "./cateringPdfArabic";
import { DOC_STRINGS, buildDocMeta } from "./cateringDocStrings";
import { buildCateringDocData } from "./cateringDocData";
import { translateCateringDoc } from "./translateCateringDoc";

const TITLES = DOC_STRINGS.en.titles;

/**
 * Printable catering documents, using the same print-window approach the POS
 * receipt printer uses rather than a separate document engine.
 */
export default function CateringDocumentDialog({ open, onOpenChange, type, event, quote, payments = [], reconciliation, serviceCosts = null, restaurantName = brandName() }) {
  const [generating, setGenerating] = useState(false);
  // Which action is waiting on a language answer: "print", "download" or null.
  const [pendingAction, setPendingAction] = useState(null);

  // Branding (logo + business name + palette) comes from Admin → Settings → Branding.
  const { data: branding } = useQuery({
    queryKey: ["restaurantInfo"],
    queryFn: async () => {
      const list = await base44.entities.RestaurantInfo.list();
      return list[0] || null;
    },
    enabled: open,
  });

  const { hideQuoteRecipeLines } = useCateringSettings();
  const doc = useMemo(() => {
    const d = buildCateringDocData({ type, event, quote, payments, reconciliation, serviceCosts });
    return d && type === "quotation" && hideQuoteRecipeLines ? { ...d, lines: collapsePackageLines(d.lines) } : d;
  }, [type, event, quote, payments, reconciliation, serviceCosts, hideQuoteRecipeLines]);

  if (!event || !doc) return null;
  const baseDoc = doc, baseQuote = quote, baseEvent = event;

  // Always generated fresh from the current quote/payment state — never cached,
  // so a revised quote can't hand out a PDF with superseded pricing.
  const downloadPdf = async (lang) => {
    setGenerating(true);
    try {
      const args = { type, event, docData: doc, quote, reconciliation, branding };
      if (lang === "ar") {
        const t = await translateCateringDoc({ doc, quote, event });
        await downloadCateringPdfArabic({ ...args, event: t.event, docData: t.doc, quote: t.quote });
      }
      else await downloadCateringPdf(args);
    } catch {
      toast.error("Could not generate the PDF");
    } finally {
      setGenerating(false);
    }
  };

  const print = async (lang) => {
    // Open the window inside the click so it isn't blocked, then fill it.
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) {
      toast.error("The print window was blocked — please allow pop-ups for this site and try again");
      return;
    }
    let doc = baseDoc, quote = baseQuote, event = baseEvent;
    if (lang === "ar") {
      w.document.write("<p style='font-family:sans-serif;padding:32px'>جارٍ التحضير…</p>");
      ({ doc, quote, event } = await translateCateringDoc({ doc, quote, event }));
      w.document.open();
    }
    const s = DOC_STRINGS[lang];
    const title = s.titles[type];
    const arabicFont = lang === "ar" ? "@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');" : "";
    const html = `
      <html dir="${s.dir}"><head><title>${title} ${doc.number}</title>
      <style>
        ${arabicFont}
        body{font-family:${lang === "ar" ? "'Cairo',Tahoma" : "Arial,Helvetica"},sans-serif;padding:32px;color:#111;text-align:${lang === "ar" ? "right" : "left"}}
        h1{font-size:20px;margin:0 0 4px}
        .muted{color:#666;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
        th,td{border-bottom:1px solid #ddd;padding:6px 4px;text-align:${lang === "ar" ? "right" : "left"}}
        td.n,th.n{text-align:${lang === "ar" ? "left" : "right"}}
        .totals{margin-top:12px;font-size:13px}
        .totals div{display:flex;justify-content:space-between;padding:2px 0}
        .grand{font-weight:bold;border-top:1px solid #000;margin-top:4px;padding-top:4px}
      </style></head><body>
      <h1>${branding?.brand_name || restaurantName} — ${title}</h1>
      ${buildDocMeta({ type, event, docData: doc, quote, s }).map((m) => `<p class="muted">${m}</p>`).join("")}
      ${type === "quotation" && quote?.package_description ? `<div style="margin-top:14px;font-size:13px"><strong>${s.packageDetails}</strong><p style="white-space:pre-line;margin:4px 0 0">${String(quote.package_description).replace(/</g, "&lt;")}</p></div>` : ""}
      <table><thead><tr><th>${s.description}</th><th class="n">${s.qty}</th><th class="n">${s.unit}</th><th class="n">${s.lineTotal}</th></tr></thead>
      <tbody>${withGroupHeaders(doc.lines)
        .map(
          (l) => l.subtotal !== undefined
            ? `<tr><td colspan="3" class="n" style="font-weight:700">${s.subtotal}</td><td class="n" style="font-weight:700">${formatCurrency(l.subtotal, true)}</td></tr>`
            : l.header
            ? `<tr><td colspan="4" style="background:#282828;color:#fff;font-weight:700">${String(l.header).replace(/</g, "&lt;")}</td></tr>`
            : `<tr><td>${l.name}</td><td class="n">${l.quantity || 1}</td><td class="n">${formatCurrency(l.unit_price || 0, true)}</td><td class="n">${formatCurrency(
              l.line_total || 0,
              true
            )}</td></tr>`
        )
        .join("")}</tbody></table>
      <div class="totals">
        <div><span>${type === "credit_note" ? s.credited : s.total}</span><span>${formatCurrency(doc.total, true)}</span></div>
        ${type !== "quotation" && type !== "credit_note" ? `<div><span>${s.receivedToDate}</span><span>${formatCurrency(doc.paid, true)}</span></div>` : ""}
        ${
          type === "final_invoice" || type === "invoice"
            ? `<div class="grand"><span>${s.balanceDue}</span><span>${formatCurrency(doc.total - doc.paid, true)}</span></div>`
            : ""
        }
      </div>
      ${type === "quotation" ? "" : `<p class="muted" style="margin-top:24px">${s.footer}</p>`}
      </body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), lang === "ar" ? 400 : 0);
  };

  const handleLanguage = (lang) => {
    const action = pendingAction;
    setPendingAction(null);
    // Open the print window inside the same click so it's never blocked or racing the dialog close.
    if (action === "print") print(lang);
    else downloadPdf(lang);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{TITLES[type]} — {event.event_name}</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <p className="text-xs text-slate-500">{doc.number} · {event.client_name}</p>
          <div className="rounded-lg border divide-y max-h-56 overflow-y-auto">
            {doc.lines.length === 0 ? (
              <p className="p-3 text-slate-400 text-sm">No lines on this document yet.</p>
            ) : (
              doc.lines.map((l, i) => (
                <div key={i} className="flex justify-between px-3 py-1.5">
                  <span className="min-w-0 truncate">{l.name} × {l.quantity || 1}</span>
                  <span>{formatCurrency(l.line_total || 0, true)}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-between font-semibold"><span>{type === "credit_note" ? "Credited" : "Total"}</span><span>{formatCurrency(doc.total, true)}</span></div>
          {type !== "quotation" && (
            <div className="flex justify-between text-slate-600"><span>Received to date</span><span>{formatCurrency(doc.paid, true)}</span></div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setPendingAction("print")}><Printer className="w-4 h-4" /> Print</Button>
          <Button className="gap-1.5" onClick={() => setPendingAction("download")} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF
          </Button>
        </DialogFooter>
        {/* Inline chooser — no second stacked dialog, so nothing can trap the screen. */}
        {pendingAction && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/95 p-6 sm:rounded-lg">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Choose language</p>
                <Button variant="ghost" size="icon" onClick={() => setPendingAction(null)} aria-label="Close">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-slate-500">Which language should we {pendingAction === "print" ? "print" : "download"} this document in?</p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-16 flex-col gap-0.5" onClick={() => handleLanguage("en")}>
                  <span className="font-semibold">English</span><span className="text-xs text-slate-500">Left-to-right</span>
                </Button>
                <Button variant="outline" className="h-16 flex-col gap-0.5" onClick={() => handleLanguage("ar")}>
                  <span className="font-semibold">العربية</span><span className="text-xs text-slate-500">Right-to-left</span>
                </Button>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setPendingAction(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
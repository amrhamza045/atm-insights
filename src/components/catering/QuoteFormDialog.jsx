import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ExemptBulkToggles from "./ExemptBulkToggles";
import LineExemptToggles from "./LineExemptToggles";
import LineDiscountField from "./LineDiscountField";
import { Trash2, Plus, ShieldAlert, Package, X, Camera } from "lucide-react";
import { toast } from "sonner";
import { computeQuoteTotals, checkCreditExposure, round2 } from "./cateringLogic";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { useBranch } from "@/components/branches/BranchContext";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import PackagePickerDialog from "./PackagePickerDialog";
import EventFormDialog from "./EventFormDialog";
import { packagePaxTotal } from "./docLineGroups";

// Consecutive lines sharing a package tag form one section; untagged lines stay standalone.
const groupLines = (lines) =>
  lines.reduce((groups, l, idx) => {
    const label = l.description || "";
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push({ l, idx });
    else groups.push({ label, items: [{ l, idx }] });
    return groups;
  }, []);
import MenuItemPicker from "./MenuItemPicker";
import { hasStockableRecipe } from "./planningGaps";
import MediaVendorPickerDialog from "./MediaVendorPickerDialog";
import PackageEconomicsBar from "./PackageEconomicsBar";
import { lineEconomics } from "./packageLogic";
import { resolveMenuItemUnitCost } from "@/lib/menuItemRecipeCost";
import { syncEventBilling } from "./serviceBilling";
import { reverifyDepositForRevision } from "./cateringFinance";
import { logEventAudit } from "./eventAudit";
import { resetHoldsIfRequirementsChanged } from "./quoteHoldReset";
import { afterRevisionApproved } from "./revisionHoldReset";
import { refreshEventRequisitionBaseline } from "./requisition/requisitionFlow";

async function reverify(event, quote) {
  const r = await reverifyDepositForRevision({ eventId: event.id, quote });
  if (r.covered) return;
  const parts = [r.demoted && "event moved back to deposit pending", r.requeued && "reservation re-queued for manager approval"].filter(Boolean);
  if (parts.length) logEventAudit("update", r.event, `Quote ${quote.revision_number} raised the deposit floor to ${r.required} EGP (covered ${r.depositPaid}) — ${parts.join(", ")}`);
  toast.error(`Deposit no longer covers this quote: ${r.required.toLocaleString()} EGP required, ${r.depositPaid.toLocaleString()} EGP covered. Record the additional deposit${r.requeued ? " — the reservation needs re-approval" : ""}.`, { duration: 8000 });
}

import LineNoteToggle from "@/components/catering/LineNoteToggle";
const blankLine = { item_type: "custom", cost_category: "food", menu_item_id: "", name: "", quantity: 1, unit_price: 0, unit_cost: 0, tax_exempt: false, service_exempt: false };

import { fetchRetainedFunds } from "./retainedFunds";

export default function QuoteFormDialog({ open, onOpenChange, event: eventProp, nextRevision, activeQuote, editQuote = null, duplicateFrom = null, draftEvent = false, onEventCreated }) {
  // Draft mode: the event doesn't exist yet; it is created after the quote is finalized.
  const [realEvent, setRealEvent] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  useEffect(() => { if (open) setRealEvent(null); }, [open]);
  const event = realEvent || eventProp;
  const currentEvent = event;
  const seed = editQuote || duplicateFrom;
  const [floor, setFloor] = useState(0);
  useEffect(() => {
    if (open && duplicateFrom && event?.id) fetchRetainedFunds(event.id).then(setFloor);
  }, [open, duplicateFrom, event?.id]);
  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();
  const { currentUser, permissions } = usePermissions();
  const isAdmin = useIsAdmin();

  const [lines, setLines] = useState([{ ...blankLine }]);
  const [taxRate, setTaxRate] = useState(14);
  const [serviceRate, setServiceRate] = useState(12);
  const [discount, setDiscount] = useState(0);
  const [discountMode, setDiscountMode] = useState("percent");
  const [saving, setSaving] = useState(false);
  const [creditBlock, setCreditBlock] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [variantLabel, setVariantLabel] = useState("");
  const [pkgInfo, setPkgInfo] = useState({ package_id: "", package_name: "", package_category: "", package_source: "manual", pricing_mode: "itemized" });
  const submittingRef = useRef(false);

  const eventGuests = Number(event?.expected_guests) || 0;
  const guests = packagePaxTotal(lines) || eventGuests;

  // Seed the form from the quote being edited, or start a clean new revision.
  useEffect(() => {
    if (!open) return;
    if (seed) {
      setLines((seed.line_items || []).length ? seed.line_items.map((l) => ({ ...l })) : [{ ...blankLine }]);
      setTaxRate(seed.tax_rate ?? 0);
      setServiceRate(seed.service_charge_rate ?? 0);
      setDiscount(seed.discount_amount ?? 0);
      setDiscountMode("amount");
      setVariantLabel(seed.variant_label || "");
      setPkgInfo({
        package_id: seed.package_id || "",
        package_name: seed.package_name || "",
        package_category: seed.package_category || "",
        package_source: seed.package_source || "manual",
        package_description: seed.package_description || "",
      });
    } else {
      setLines([{ ...blankLine }]);
      setTaxRate(14);
      setServiceRate(12);
      setDiscount(0);
      setDiscountMode("percent");
      setVariantLabel("");
      setPkgInfo({ package_id: "", package_name: "", package_category: "", package_source: "manual" });
    }
    setCreditBlock(null);
  }, [open, seed]);

  const effectiveBranchId = event?.branch_id || selectedBranchId || null;

  const { data: allMenuItems = [] } = useQuery({
    queryKey: ["catering-menu-items"],
    queryFn: () => base44.entities.MenuItem.list("-created_date", 1000),
    enabled: open,
  });

  const menuItems = useMemo(() => {
    if (!effectiveBranchId) return allMenuItems;
    const branchOwned = allMenuItems.filter((m) => m.branch_id === effectiveBranchId);
    const branchOwnedNames = new Set(branchOwned.map((m) => String(m.name || "").trim().toLowerCase()));
    const fallbackShared = allMenuItems.filter(
      (m) => !m.branch_id && !branchOwnedNames.has(String(m.name || "").trim().toLowerCase())
    );
    return [...branchOwned, ...fallbackShared];
  }, [allMenuItems, effectiveBranchId]);

  const { data: allInventoryItems = [] } = useQuery({
    queryKey: ["inventoryItemsAll"],
    queryFn: () => base44.entities.InventoryItem.list("name", 1000),
    enabled: open,
  });

  const inventoryItems = useMemo(
    () =>
      effectiveBranchId
        ? allInventoryItems.filter((i) => !i.branch_id || i.branch_id === effectiveBranchId)
        : allInventoryItems,
    [allInventoryItems, effectiveBranchId]
  );

  const { data: unitRules = [] } = useQuery({
    queryKey: ["unitConversionRules"],
    queryFn: async () => {
      try {
        return await base44.entities.UnitConversionRule.list("-created_date", 500);
      } catch {
        return [];
      }
    },
    enabled: open,
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipesAll"],
    queryFn: () => base44.entities.Recipe.list("-created_date", 500),
    enabled: open,
  });

  // Backfill unit_cost from the menu item's recipe total cost when a menu_item line has 0 unit_cost
  const resolvedLines = useMemo(
    () =>
      lines.map((l) => {
        if (l.item_type === "menu_item" && l.menu_item_id && !(Number(l.unit_cost) > 0)) {
          const mi = menuItems.find((m) => m.id === l.menu_item_id);
          if (mi) {
            const recipeCost = resolveMenuItemUnitCost(mi, inventoryItems, unitRules, recipes);
            if (recipeCost > 0) return { ...l, unit_cost: recipeCost };
          }
        }
        return l;
      }),
    [lines, menuItems, inventoryItems, unitRules, recipes]
  );

  // A percentage discount is resolved against the gross total (subtotal + tax +
  // service) so what staff type is what comes off the number the client pays.
  const discountAmount = useMemo(() => {
    if (discountMode !== "percent") return round2(Number(discount) || 0);
    const gross = computeQuoteTotals(resolvedLines, taxRate, serviceRate, 0, 0);
    return round2((gross.total * (Number(discount) || 0)) / 100);
  }, [discount, discountMode, resolvedLines, taxRate, serviceRate]);

  const totals = useMemo(
    () => computeQuoteTotals(resolvedLines, taxRate, serviceRate, discountAmount, event?.deposit_percentage ?? 50),
    [resolvedLines, taxRate, serviceRate, discountAmount, event]
  );

  const economics = useMemo(() => lineEconomics(resolvedLines), [resolvedLines]);

  // Packages are appended as their own lines (tagged with package + pax), so one
  // quote can mix e.g. Package A × 50, Package B × 100 and single items × 200.
  const applyPackage = ({ lines: pkgLines, pax, ...info }) => {
    const tag = `${info.package_name} · ${pax} persons`;
    const tagged = pkgLines.map((l) => {
      let unitCost = Number(l.unit_cost) || 0;
      if (l.menu_item_id && !(unitCost > 0)) {
        const mi = menuItems.find((m) => m.id === l.menu_item_id);
        if (mi) unitCost = resolveMenuItemUnitCost(mi, inventoryItems, unitRules, recipes);
      }
      return { ...l, unit_cost: unitCost, description: tag };
    });
    setLines((ls) => [...ls.filter((l) => l.name || l.menu_item_id), ...tagged]);
    setPkgInfo((p) => {
      if (!p.package_name) return info;
      return {
        ...p,
        package_name: `${p.package_name} + ${info.package_name}`,
        package_source: p.package_source === "manual" ? info.package_source : p.package_source,
        package_description: [p.package_description, info.package_description].filter(Boolean).join("\n\n"),
        pricing_mode: "itemized",
      };
    });
    toast.success(`${info.package_name} added for ${pax} guests`);
  };

  const clearPackage = () => {
    setPkgInfo({ package_id: "", package_name: "", package_category: "", package_source: "manual" });
  };

  // A media vendor becomes a bespoke line: vendor price is the cost, and it is
  // seeded as the sell price too so staff can mark it up before saving.
  const addMediaVendor = (v) => {
    const price = Number(v.price) || 0;
    const basis = v.price_basis === "per_hour" ? "/hr" : v.price_basis === "per_day" ? "/day" : "";
    setLines((ls) => [
      ...ls,
      {
        ...blankLine,
        cost_category: "other",
        name: `${v.name} — ${v.service_type === "both" ? "Photo & Video" : v.service_type === "videographer" ? "Videography" : "Photography"}${basis}`,
        quantity: 1,
        unit_price: price,
        unit_cost: price,
      },
    ]);
    toast.success(`${v.name} added as a quote line`);
  };

  const setLine = (idx, patch) => setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const pickMenuItem = (idx, itemId) => {
    const mi = menuItems.find((m) => m.id === itemId);
    if (!mi) return;
    setLine(idx, {
      item_type: "menu_item",
      cost_category: "food",
      menu_item_id: mi.id,
      name: mi.name,
      unit_price: Number(mi.price) || 0,
      unit_cost: resolveMenuItemUnitCost(mi, inventoryItems, unitRules, recipes),
      tax_exempt: !!mi.tax_exempt,
      service_exempt: !!mi.service_exempt,
    });
  };

  const persist = async (overridden, evArg) => {
    const event = evArg || currentEvent;
    try {
      const payload = {
        branch_id: selectedBranchId,
        branch_name: selectedBranch?.name || "",
        event_id: event.id,
        event_name: event.event_name,
        client_id: event.client_id,
        client_name: event.client_name,
        revision_number: editQuote ? editQuote.revision_number : nextRevision,
        status: editQuote ? editQuote.status : duplicateFrom ? "pending_approval" : "active",
        // reference_unit_price is a UI-only hint — never stored on the quote.
        line_items: totals.lines.map(({ reference_unit_price, ...l }) => l),
        subtotal: totals.subtotal,
        line_discount_total: totals.line_discount_total,
        tax_rate: Number(taxRate) || 0,
        tax_total: totals.tax_total,
        service_charge_rate: Number(serviceRate) || 0,
        service_charge_total: totals.service_charge_total,
        discount_amount: discountAmount,
        total: totals.total,
        estimated_cost: totals.estimated_cost,
        estimated_margin: totals.estimated_margin,
        estimated_margin_percentage: totals.total > 0 ? round2((totals.estimated_margin / totals.total) * 100) : 0,
        // Always written (never undefined) so switching or clearing the package
        // actually replaces what was stored on the quote.
        package_id: pkgInfo.package_id || "",
        package_name: pkgInfo.package_name || "",
        package_category: pkgInfo.package_category || "",
        package_source: pkgInfo.package_source || "manual",
        package_description: pkgInfo.package_description || "",
        variant_label: variantLabel || "",
        guests_at_quote: guests,
        deposit_percentage: event.deposit_percentage ?? 50,
        required_deposit: totals.required_deposit,
        credit_check_status: overridden ? "overridden" : "passed",
        credit_exposure_snapshot: creditBlock?.exposure || 0,
        credit_limit_snapshot: creditBlock?.limit || 0,
        credit_override_by: overridden ? currentUser?.email || "" : undefined,
        created_by_email: editQuote ? editQuote.created_by_email || "" : currentUser?.email || "",
      };

      // The active quote's package pax sum is the event's guest count everywhere in catering.
      const paxTotal = packagePaxTotal(lines);
      const paxPatch = paxTotal > 0 ? { expected_guests: paxTotal } : {};

      // Editing revises the existing quote in place; otherwise a new revision is created.
      if (editQuote) {
        await base44.entities.CateringQuote.update(editQuote.id, payload);
        if (event.active_quote_id === editQuote.id) {
          await base44.entities.CateringEvent.update(event.id, { quote_total: totals.total, ...paxPatch });
          await syncEventBilling({ ...event, quote_total: totals.total });
          await reverify(event, { ...editQuote, ...payload });
          if (await resetHoldsIfRequirementsChanged({ event, oldQuote: editQuote, newQuote: payload, userEmail: currentUser?.email })) {
            toast.warning("Required items changed — all holds for this event were released. Re-run reservations.");
          }
          await refreshEventRequisitionBaseline(event.id);
        }
        queryClient.invalidateQueries();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["catering-quotes"] }),
          queryClient.invalidateQueries({ queryKey: ["catering-events"] }),
        ]);
        toast.success(`Quote ${editQuote.revision_number} updated`);
        onOpenChange(false);
        return;
      }

      const created = await base44.entities.CateringQuote.create(payload);

      // A duplicate waits for approval: the active quote and event billing stay untouched.
      if (duplicateFrom) {
        // Auto-approval: the server decides whether this user may approve their own revision.
        const auto = await base44.functions.invoke("reviewCateringQuote", { quote_id: created.id, decision: "approve", auto: true }).catch(() => null);
        if (auto?.data && !auto.data.error) {
          await afterRevisionApproved({ eventId: event.id, previousQuoteId: auto.data.previous_quote_id, quoteId: created.id });
          await Promise.all(["catering-quotes", "catering-events"].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));
          toast.success(`Quote ${nextRevision} created and auto-approved`);
          onOpenChange(false);
          return;
        }
        await queryClient.invalidateQueries({ queryKey: ["catering-quotes"] });
        toast.success(`Quote ${nextRevision} created from quote ${duplicateFrom.revision_number} — awaiting approval`);
        onOpenChange(false);
        return;
      }

      if (pkgInfo.package_id) {
        const pkg = await base44.entities.CateringPackage.get(pkgInfo.package_id);
        await base44.entities.CateringPackage.update(pkgInfo.package_id, {
          times_used: (Number(pkg?.times_used) || 0) + 1,
          last_used_date: new Date().toISOString(),
        });
        await queryClient.invalidateQueries({ queryKey: ["catering-packages"] });
      }

      if (activeQuote?.id) {
        await base44.entities.CateringQuote.update(activeQuote.id, { status: "superseded" });
      }

      await base44.entities.CateringEvent.update(event.id, {
        active_quote_id: created.id,
        active_quote_revision: nextRevision,
        quote_total: totals.total,
        ...paxPatch,
        status: event.status === "enquiry" ? "quoted" : event.status,
      });
      await syncEventBilling({ ...event, quote_total: totals.total });
      await reverify(event, created);
      if (await resetHoldsIfRequirementsChanged({ event, oldQuote: activeQuote, newQuote: created, userEmail: currentUser?.email })) {
        toast.warning("Required items changed — all holds for this event were released. Re-run reservations.");
      }
      await refreshEventRequisitionBaseline(event.id);
      queryClient.invalidateQueries();

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catering-quotes"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-events"] }),
      ]);
      toast.success(`Quote ${nextRevision} is now the active quote`);
      if (draftEvent) onEventCreated?.(event.id);
      onOpenChange(false);
      setLines([{ ...blankLine }]);
      setCreditBlock(null);
      setVariantLabel("");
      clearPackage();
    } catch (e) {
      toast.error("Could not save the quote");
    }
  };

  const submitOnce = async (action) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    try {
      await action();
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  const handleSave = () => submitOnce(async () => {
    const orphanIdx = lines.findIndex((l) => l.item_type === "menu_item" && !l.menu_item_id);
    if (orphanIdx !== -1) {
      toast.error(`Line ${orphanIdx + 1} — choose a menu item (or switch it to Bespoke)`);
      return;
    }
    if (!totals.lines.length || totals.total <= 0) {
      toast.error("Add at least one line item with a price");
      return;
    }
    if (duplicateFrom) {
      const liveFloor = await fetchRetainedFunds(event.id);
      setFloor(liveFloor);
      if (totals.total < liveFloor) {
        toast.error(`Total ${totals.total.toLocaleString()} EGP is below the ${liveFloor.toLocaleString()} EGP already retained for this event. Add items or reduce the discount.`);
        return;
      }
    }
    // A new event's mandatory details are collected now, once the quote is final.
    if (draftEvent && !realEvent) {
      setShowEventForm({ event_name: eventProp?.event_name || "", expected_guests: packagePaxTotal(lines) || "" });
      return;
    }
    await creditCheckAndPersist(event);
  });

  const creditCheckAndPersist = async (ev) => {
    const client = await base44.entities.Client.get(ev.client_id);
    const result = await checkCreditExposure({
      clientId: ev.client_id,
      creditLimit: client?.catering_credit_limit,
      newQuoteTotal: totals.total,
      excludeEventId: ev.id,
    });
    setCreditBlock(result);
    if (result.limitApplies && !result.withinLimit) {
      toast.error("Credit limit exceeded — quote blocked");
      return;
    }
    await persist(false, ev);
  };

  const handleEventCreated = (created) => {
    setRealEvent(created);
    submitOnce(() => creditCheckAndPersist(created));
  };

  if (!event) return null;

  return (
    <>
    <Dialog open={open && !showEventForm && !(realEvent && saving)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editQuote ? `Edit Quote ${editQuote.revision_number}` : duplicateFrom ? `Duplicate of Quote ${duplicateFrom.revision_number} → Quote ${nextRevision}` : `New Quote — Quote ${nextRevision}`} · {event.event_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex-1 min-w-[180px]">
              <Label>Variant / tier label (optional)</Label>
              <Input value={variantLabel} onChange={(e) => setVariantLabel(e.target.value)} placeholder="Premium, Economy…" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-1.5" onClick={() => setShowMediaPicker(true)}>
                <Camera className="w-4 h-4" /> Photo &amp; video
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => setShowPicker(true)}>
                <Package className="w-4 h-4" /> Add package
              </Button>
            </div>
          </div>

          {pkgInfo.package_name && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="min-w-0">
                <p className="text-xs text-slate-700">
                  Built from <span className="font-semibold">{pkgInfo.package_name}</span>
                  {pkgInfo.package_source === "one_off_package" ? " (one-off, not saved to catalog)" : ""} · each package keeps its own guest count
                </p>
                {/* Headline-priced packages carry their whole selling price on the package
                    charge line, so item unit prices are intentionally 0. Say so — staff
                    otherwise read the zeros as missing data. */}
                {pkgInfo.pricing_mode === "per_guest" || pkgInfo.pricing_mode === "flat" ? (
                  <p className="text-xs text-amber-700 mt-0.5">
                    This package is priced {pkgInfo.pricing_mode === "per_guest" ? "per guest" : "as a flat fee"} — the full price sits on the
                    “package charge” line at the bottom, so item unit prices are 0 by design (costs are still per item).
                  </p>
                ) : null}
              </div>
              <Button variant="ghost" size="icon" onClick={clearPackage}><X className="w-4 h-4" /></Button>
            </div>
          )}

          <div>
            <Label>Package description (shown on the quotation)</Label>
            <Textarea
              rows={4}
              value={pkgInfo.package_description || ""}
              onChange={(e) => setPkgInfo((p) => ({ ...p, package_description: e.target.value }))}
              placeholder="Inclusions, menu highlights, service details…"
            />
          </div>

          {creditBlock?.limitApplies && !creditBlock.withinLimit && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Credit limit exceeded
              </p>
              <p className="text-xs text-red-700 mt-1">
                Exposure {formatCurrency(creditBlock.exposure, true)} (open on other events {formatCurrency(creditBlock.openOnOthers, true)} + this quote) vs limit {formatCurrency(creditBlock.limit, true)}.
              </p>
              {(isAdmin || permissions?.catering_quote_approve === true) ? (
                <Button size="sm" variant="destructive" className="mt-2" onClick={() => submitOnce(() => persist(true))} disabled={saving}>
                  Override and create
                </Button>
              ) : (
                <p className="text-xs text-red-700 mt-2">An Admin must override this to proceed.</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <ExemptBulkToggles lines={lines} onChange={setLines} />
            {groupLines(lines).map((g, gi) => (
              <div key={gi} className={g.label ? "rounded-xl border-2 border-slate-300 bg-slate-50/60 overflow-hidden" : "space-y-2"}>
                {g.label && (
                  <div className="flex items-center justify-between bg-slate-800 px-3 py-2 text-white">
                    <span className="text-sm font-semibold">{g.label}</span>
                    <span className="text-xs opacity-80">{g.items.length} lines</span>
                  </div>
                )}
                <div className={g.label ? "space-y-2 p-2" : "space-y-2"}>
            {g.items.map(({ l, idx }) => (
              <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Select value={l.item_type} onValueChange={(v) => setLine(idx, { item_type: v, menu_item_id: "", unit_cost: 0 })}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="menu_item">Menu item</SelectItem>
                      <SelectItem value="custom">Bespoke</SelectItem>
                    </SelectContent>
                  </Select>
                  {l.item_type === "menu_item" ? (
                    <MenuItemPicker items={menuItems} value={l.menu_item_id} onChange={(v) => pickMenuItem(idx, v)} />
                  ) : (
                    <Input className="flex-1" placeholder="Custom item name" value={l.name} onChange={(e) => setLine(idx, { name: e.target.value })} />
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                {l.item_type === "menu_item" && !l.menu_item_id && (
                  <p className="text-xs text-red-600">Select an item — this line can't be saved without one.</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                  <div>
                    <Label className="text-xs">Cost category</Label>
                    <Select value={l.cost_category || "food"} onValueChange={(v) => setLine(idx, { cost_category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="food">Food</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Qty / persons</Label><Input type="number" min="0" value={l.quantity} onChange={(e) => setLine(idx, { quantity: e.target.value })} /></div>
                  <div>
                    <Label className="text-xs">Unit price</Label>
                    <Input type="number" min="0" value={l.unit_price} onChange={(e) => setLine(idx, { unit_price: e.target.value })} />
                    {Number(l.reference_unit_price) > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Item price {formatCurrency(Number(l.reference_unit_price), false)} — covered by the package charge
                      </p>
                    )}
                  </div>
                  <LineDiscountField line={l} computed={totals.lines[idx]} onChange={(patch) => setLine(idx, patch)} />
                </div>
                <LineNoteToggle line={l} onChange={(patch) => setLine(idx, patch)} />
                {l.manually_sourced && (
                  <p className="text-xs text-slate-600">Manually sourced{l.manually_sourced_by ? ` — marked by ${l.manually_sourced_by}` : ""}; excluded from planning.</p>
                )}
                {!l.manually_sourced && (l.cost_category || "food") === "food" &&
                  (l.item_type === "custom" || (l.menu_item_id && !hasStockableRecipe(menuItems.find((m) => m.id === l.menu_item_id)))) &&
                  (l.item_type === "custom" ? l.name : l.menu_item_id) && (
                    <p className="text-xs text-amber-700">
                      {l.item_type === "custom" ? "Bespoke line" : "This menu item"} has no usable recipe — planning won't reserve any inventory for it.
                    </p>
                  )}
              </div>
            ))}
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setLines((ls) => [...ls, { ...blankLine }])}>
              <Plus className="w-4 h-4" /> Add line
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><Label>Tax %</Label><Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></div>
            <div><Label>Service %</Label><Input type="number" value={serviceRate} onChange={(e) => setServiceRate(e.target.value)} /></div>
            <div>
              <Label>Discount</Label>
              <div className="flex gap-1.5">
                <Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                <Select value={discountMode} onValueChange={setDiscountMode}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">%</SelectItem>
                    <SelectItem value="amount">EGP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <PackageEconomicsBar economics={economics} guests={guests} label="Quote economics before tax & service" />

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm space-y-1">
            {totals.line_discount_total > 0 && (
              <div className="flex justify-between text-emerald-700"><span>Line discounts (included in subtotal)</span><span>− {formatCurrency(totals.line_discount_total, true)}</span></div>
            )}
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal, true)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(totals.tax_total, true)}</span></div>
            <div className="flex justify-between"><span>Service</span><span>{formatCurrency(totals.service_charge_total, true)}</span></div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount{discountMode === "percent" ? ` (${Number(discount) || 0}% of total)` : ""}</span>
                <span>− {formatCurrency(discountAmount, true)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-slate-900"><span>Total</span><span>{formatCurrency(totals.total, true)}</span></div>
            {duplicateFrom && (
              <div className={`flex justify-between ${totals.total < floor ? "text-red-600 font-medium" : "text-slate-600"}`}>
                <span>Minimum total (net funds retained)</span><span>{formatCurrency(floor, true)}</span>
              </div>
            )}
            {event.payment_policy_id ? (
              <div className="flex justify-between text-slate-600"><span>Deposit</span><span>Set by the "{event.payment_policy_name}" payment policy</span></div>
            ) : (
              <div className="flex justify-between text-slate-600"><span>Required deposit ({event.deposit_percentage ?? 50}%)</span><span>{formatCurrency(totals.required_deposit, true)}</span></div>
            )}
            <div className="flex justify-between text-slate-600"><span>Est. cost / margin</span><span>{formatCurrency(totals.estimated_cost, true)} / {formatCurrency(totals.estimated_margin, true)}</span></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : editQuote ? "Save changes" : draftEvent && !realEvent ? "Finalize quote & add event details" : `Create quote ${nextRevision}`}
          </Button>
        </DialogFooter>

        <PackagePickerDialog open={showPicker} onOpenChange={setShowPicker} guests={eventGuests} onApply={applyPackage} />
        <MediaVendorPickerDialog open={showMediaPicker} onOpenChange={setShowMediaPicker} onPick={addMediaVendor} />
      </DialogContent>
    </Dialog>
    {draftEvent && (
      <EventFormDialog
        open={!!showEventForm}
        onOpenChange={(v) => !v && setShowEventForm(false)}
        event={showEventForm || null}
        onCreated={handleEventCreated}
      />
    )}
    </>
  );
}
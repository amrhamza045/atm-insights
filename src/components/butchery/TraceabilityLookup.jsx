import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, ArrowRight, Beef, Package, Scissors, ChevronRight, Loader2 } from "lucide-react";
import { fmtMoney, fmtNum } from "./shared";

function TraceChain({ chain }) {
  return (
    <div className="space-y-2">
      {chain.map((step, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <step.icon className="w-4 h-4 text-red-600" />
            </div>
            {i < chain.length - 1 && <div className="w-0.5 h-6 bg-slate-200" />}
          </div>
          <div className="pt-1">
            <p className="text-xs text-slate-400">{step.label}</p>
            <p className="text-sm font-medium text-slate-900">{step.value}</p>
            {step.detail && <p className="text-xs text-slate-500">{step.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TraceabilityLookup() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");

  const { data: results, isLoading } = useQuery({
    queryKey: ["traceability", searched],
    queryFn: async () => {
      if (!searched) return null;
      const q = searched.toLowerCase();
      const result = { animals: [], rawMaterials: [], suppliers: [], backward: [], forwardTraces: [] };

      // Load all records with high limit to avoid truncation
      const [animals, rms, suppliers] = await Promise.all([
        base44.entities.Animal.list("-created_date", 500),
        base44.entities.ButcheryRawMaterial.list("-created_date", 500),
        base44.entities.ButcherySupplier.list("name", 500),
      ]);

      // Search animals by tag_number or supplier_name
      result.animals = animals.filter((a) =>
        a.tag_number?.toLowerCase().includes(q) ||
        a.supplier_name?.toLowerCase().includes(q) ||
        a.species?.toLowerCase().includes(q)
      );

      // Search raw materials by lot_number, sku_name, or animal_tag
      const matchedRms = rms.filter((r) =>
        r.lot_number?.toLowerCase().includes(q) ||
        r.sku_name?.toLowerCase().includes(q) ||
        r.animal_tag?.toLowerCase().includes(q) ||
        r.supplier_name?.toLowerCase().includes(q) ||
        (r.rework_parent_lot_chain || []).some((l) => l?.toLowerCase().includes(q))
      );
      result.rawMaterials = matchedRms;

      // Backward trace from ALL matched lots
      for (const rm of matchedRms) {
        result.backward.push({ lot: rm.lot_number, chain: await traceBackward(rm) });
      }

      // Search suppliers
      result.suppliers = suppliers.filter((s) =>
        s.name?.toLowerCase().includes(q) ||
        s.contact_person?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q)
      );

      // Forward trace from matched animals
      for (const animal of result.animals) {
        result.forwardTraces.push({ animal, skus: await traceForward(animal) });
      }
      // Forward from matched suppliers
      for (const supplier of result.suppliers) {
        const supplierAnimals = animals.filter((a) => a.supplier_id === supplier.id);
        const allSkus = [];
        for (const a of supplierAnimals) {
          const skus = await traceForward(a);
          for (const s of skus) {
            if (!allSkus.find((x) => x.id === s.id)) allSkus.push(s);
          }
        }
        if (allSkus.length) result.forwardTraces.push({ supplier, skus: allSkus });
      }
      return result;
    },
    enabled: !!searched,
  });

  const handleSearch = () => setSearched(query);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="Search by animal tag, lot number, or supplier..." className="pl-9" />
        </div>
        <Button onClick={handleSearch} className="bg-red-600 hover:bg-red-700">Search</Button>
      </div>

      {!searched && (
        <Card className="p-8 text-center text-slate-400">Search by animal tag, lot number, or supplier name to trace forward and backward through the full chain.</Card>
      )}

      {isLoading && <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto" />}

      {results && !isLoading && (
        <div className="space-y-4">
          {/* Backward traces */}
          {results.backward?.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Backward Trace — from Lot</h3>
              <div className="space-y-4">
                {results.backward.map((bt, i) => (
                  <div key={i}>
                    {results.backward.length > 1 && (
                      <p className="text-xs font-medium text-red-600 mb-2">Lot: {bt.lot}</p>
                    )}
                    <TraceChain chain={bt.chain} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Forward traces */}
          {results.forwardTraces?.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Forward Trace — from Source</h3>
              <div className="space-y-3">
                {results.forwardTraces.map((ft, i) => (
                  <div key={i} className="border-l-2 border-red-200 pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      {ft.animal ? <Beef className="w-4 h-4 text-red-500" /> : <Package className="w-4 h-4 text-blue-500" />}
                      <span className="font-medium text-sm text-slate-900">
                        {ft.animal ? `Animal #${ft.animal.tag_number}` : ft.supplier?.name}
                      </span>
                    </div>
                    {ft.skus.length === 0 ? (
                      <p className="text-xs text-slate-400">No SKUs produced yet</p>
                    ) : (
                      <div className="space-y-1">
                        {ft.skus.map((s) => (
                          <div key={s.id} className="text-xs flex items-center gap-2 bg-slate-50 rounded px-2 py-1">
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-medium">{s.sku_name}</span>
                            <span className="text-slate-500">Lot: {s.lot_number}</span>
                            <span className="text-slate-500">{fmtNum(s.quantity)} {s.unit}</span>
                            <Badge variant="outline" className="capitalize">{s.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {results.backward?.length === 0 && (results.forwardTraces?.length || 0) === 0 && (
            <Card className="p-8 text-center text-slate-400">No matches found for "{searched}".</Card>
          )}
        </div>
      )}
    </div>
  );
}

async function traceBackward(rm) {
  const chain = [{ label: "Raw Material SKU", value: rm.sku_name, detail: `Lot: ${rm.lot_number} · ${fmtNum(rm.quantity)} ${rm.unit}`, icon: Package }];
  // lot chain through rework
  if (rm.rework_parent_lot_chain?.length) {
    chain.push({ label: "Rework Parent Lots", value: rm.rework_parent_lot_chain.join(", "), icon: Scissors });
  }
  if (rm.slaughter_event_id) {
    const evt = await base44.entities.SlaughterEvent.get(rm.slaughter_event_id);
    if (evt) {
      chain.push({ label: "Slaughter Event", value: `#${evt.animal_tag}`, detail: `${fmtNum(evt.cold_carcass_weight)} kg cold carcass · ${new Date(evt.date || evt.created_date).toLocaleDateString()}`, icon: Scissors });
      if (evt.animal_id) {
        const animal = await base44.entities.Animal.get(evt.animal_id);
        if (animal) {
          chain.push({ label: "Animal", value: `#${animal.tag_number}`, detail: `${animal.species} · ${fmtNum(animal.live_weight)} kg live · ${fmtMoney(animal.purchase_cost)}`, icon: Beef });
          if (animal.supplier_id) {
            const supplier = await base44.entities.ButcherySupplier.get(animal.supplier_id);
            if (supplier) chain.push({ label: "Supplier", value: supplier.name, detail: supplier.phone || "", icon: Package });
          }
        }
      }
    }
  }
  return chain;
}

async function traceForward(animal) {
  const skus = [];
  // Direct: SKUs linked to this animal
  const animalRms = await base44.entities.ButcheryRawMaterial.filter({ animal_id: animal.id }, "-created_date", 200);
  for (const r of animalRms) { if (!skus.find((s) => s.id === r.id)) skus.push(r); }
  // Via slaughter events
  const events = await base44.entities.SlaughterEvent.filter({ animal_id: animal.id });
  for (const evt of events) {
    const evtRms = await base44.entities.ButcheryRawMaterial.filter({ slaughter_event_id: evt.id }, "-created_date", 200);
    for (const r of evtRms) { if (!skus.find((s) => s.id === r.id)) skus.push(r); }
    const cuts = await base44.entities.PrimalCut.filter({ slaughter_event_id: evt.id });
    for (const cut of cuts) {
      const cutRms = await base44.entities.ButcheryRawMaterial.filter({ primal_cut_id: cut.id }, "-created_date", 200);
      for (const crm of cutRms) { if (!skus.find((s) => s.id === crm.id)) skus.push(crm); }
    }
  }
  return skus;
}
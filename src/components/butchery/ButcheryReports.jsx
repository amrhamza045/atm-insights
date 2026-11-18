import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, Calculator } from "lucide-react";
import { fmtMoney, fmtNum, pct } from "./shared";

export default function ButcheryReports() {
  const [reportType, setReportType] = useState("margin");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterAnimal, setFilterAnimal] = useState("");

  const { data: rawMaterials = [], isLoading } = useQuery({
    queryKey: ["butcheryRawMaterials"],
    queryFn: () => base44.entities.ButcheryRawMaterial.list("-created_date"),
  });
  const { data: animals = [] } = useQuery({
    queryKey: ["animals"],
    queryFn: () => base44.entities.Animal.list("-created_date"),
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["butcherySuppliers"],
    queryFn: () => base44.entities.ButcherySupplier.list("name"),
  });
  const { data: events = [] } = useQuery({
    queryKey: ["slaughterEvents"],
    queryFn: () => base44.entities.SlaughterEvent.list("-created_date"),
  });
  const { data: cuts = [] } = useQuery({
    queryKey: ["primalCutsAll"],
    queryFn: () => base44.entities.PrimalCut.list("-created_date"),
  });

  const filtered = useMemo(() => {
    return rawMaterials.filter((r) => {
      if (filterSupplier && r.supplier_id !== filterSupplier) return false;
      if (filterGrade && r.quality_grade !== filterGrade) return false;
      if (filterAnimal && r.animal_id !== filterAnimal) return false;
      return true;
    });
  }, [rawMaterials, filterSupplier, filterGrade, filterAnimal]);

  const soldItems = filtered.filter((r) => r.status === "sold");

  const marginSummary = useMemo(() => {
    const totalRevenue = soldItems.reduce((s, r) => s + (r.sale_price || 0), 0);
    const totalCost = soldItems.reduce((s, r) => s + (r.allocated_cost || 0), 0);
    const totalMargin = totalRevenue - totalCost;
    return { totalRevenue, totalCost, totalMargin, marginPct: totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0, count: soldItems.length };
  }, [soldItems]);

  const yieldSummary = useMemo(() => {
    const totalLive = animals.reduce((s, a) => s + (a.live_weight || 0), 0);
    const totalCarcass = events.reduce((s, e) => s + (e.cold_carcass_weight || 0), 0);
    const totalCuts = cuts.reduce((s, c) => s + (c.weight || 0), 0);
    return {
      avgDressing: totalLive > 0 ? (totalCarcass / totalLive) * 100 : 0,
      cutYield: totalCarcass > 0 ? (totalCuts / totalCarcass) * 100 : 0,
      totalLive, totalCarcass, totalCuts,
    };
  }, [animals, events, cuts]);

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto" />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200">
        <button onClick={() => setReportType("margin")} className={`px-4 py-2 text-sm font-medium border-b-2 ${reportType === "margin" ? "border-red-600 text-red-700" : "border-transparent text-slate-500"}`}>Margin Report</button>
        <button onClick={() => setReportType("yield")} className={`px-4 py-2 text-sm font-medium border-b-2 ${reportType === "yield" ? "border-red-600 text-red-700" : "border-transparent text-slate-500"}`}>Yield & Cost Report</button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label>Supplier</Label>
          <Select value={filterSupplier} onValueChange={setFilterSupplier}>
            <SelectTrigger><SelectValue placeholder="All suppliers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All suppliers</SelectItem>
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Quality Grade</Label>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger><SelectValue placeholder="All grades" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All grades</SelectItem>
              {["prime", "choice", "standard", "utility", "ungraded"].map((g) => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Animal</Label>
          <Select value={filterAnimal} onValueChange={setFilterAnimal}>
            <SelectTrigger><SelectValue placeholder="All animals" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All animals</SelectItem>
              {animals.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.breed ? `${a.breed} ` : ""}{a.species} — #{a.tag_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {reportType === "margin" ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Revenue" value={fmtMoney(marginSummary.totalRevenue)} />
            <StatCard label="Cost" value={fmtMoney(marginSummary.totalCost)} />
            <StatCard label="Margin £" value={fmtMoney(marginSummary.totalMargin)} tone={marginSummary.totalMargin >= 0 ? "green" : "red"} />
            <StatCard label="Margin %" value={pct(marginSummary.marginPct)} tone={marginSummary.marginPct >= 0 ? "green" : "red"} />
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Lot</TableHead>
                  <TableHead>Animal</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Sale Price</TableHead>
                  <TableHead className="text-right">Margin £</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {soldItems.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-6">No sold items matching filters</TableCell></TableRow>
                ) : soldItems.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.sku_name}</TableCell>
                    <TableCell className="text-xs text-slate-500">{r.lot_number}</TableCell>
                    <TableCell className="text-xs">#{r.animal_tag || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{r.quality_grade}</Badge></TableCell>
                    <TableCell className="text-right">{fmtMoney(r.allocated_cost)}</TableCell>
                    <TableCell className="text-right">{fmtMoney(r.sale_price)}</TableCell>
                    <TableCell className={`text-right font-medium ${r.actual_margin >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtMoney(r.actual_margin)}</TableCell>
                    <TableCell className={`text-right ${r.margin_percentage >= 0 ? "text-green-600" : "text-red-600"}`}>{pct(r.margin_percentage)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Live Weight" value={`${fmtNum(yieldSummary.totalLive)} kg`} />
            <StatCard label="Total Carcass" value={`${fmtNum(yieldSummary.totalCarcass)} kg`} />
            <StatCard label="Avg Dressing %" value={pct(yieldSummary.avgDressing)} />
            <StatCard label="Cut Yield %" value={pct(yieldSummary.cutYield)} />
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Animal</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Live Wt</TableHead>
                  <TableHead className="text-right">Carcass Wt</TableHead>
                  <TableHead className="text-right">Dressing %</TableHead>
                  <TableHead className="text-right">Cut Yield %</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Net Cost</TableHead>
                  <TableHead className="text-right">Cost/kg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-slate-400 py-6">No slaughter events</TableCell></TableRow>
                ) : events.map((e) => {
                  const animal = animals.find((a) => a.id === e.animal_id);
                  const animalCuts = cuts.filter((c) => c.slaughter_event_id === e.id);
                  const cutsWt = animalCuts.reduce((s, c) => s + (c.weight || 0), 0);
                  const costPerKg = e.cold_carcass_weight > 0 ? (e.net_cost_to_allocate || 0) / e.cold_carcass_weight : 0;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">#{e.animal_tag || "—"}</TableCell>
                      <TableCell className="text-xs">{animal?.supplier_name || "—"}</TableCell>
                      <TableCell className="text-right">{fmtNum(animal?.live_weight)} kg</TableCell>
                      <TableCell className="text-right">{fmtNum(e.cold_carcass_weight)} kg</TableCell>
                      <TableCell className="text-right">{pct(e.dressing_percentage)}</TableCell>
                      <TableCell className="text-right">{e.cold_carcass_weight ? pct((cutsWt / e.cold_carcass_weight) * 100) : "—"}</TableCell>
                      <TableCell className="text-right">{fmtMoney(e.total_cost)}</TableCell>
                      <TableCell className="text-right">{fmtMoney(e.net_cost_to_allocate)}</TableCell>
                      <TableCell className="text-right font-medium">{fmtMoney(costPerKg)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const toneClass = tone === "green" ? "text-green-600" : tone === "red" ? "text-red-600" : "text-slate-900";
  return (
    <Card className="p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${toneClass}`}>{value}</p>
    </Card>
  );
}
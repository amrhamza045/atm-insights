import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { useBranch } from "@/components/branches/BranchContext";
import EventsPaginationBar from "@/components/catering/EventsPaginationBar";
import usePaginatedAllCosts from "./usePaginatedAllCosts";

const TYPE_STYLES = {
  Equipment: "bg-blue-100 text-blue-700",
  Staffing: "bg-emerald-100 text-emerald-700",
  Logistics: "bg-purple-100 text-purple-700",
};

function CostTypeSection({
  type,
  itemLabel,
  emptyText,
  group,
  resetKey,
}) {
  const sectionRef = useRef(null);
  const {
    rows,
    totalCount,
    page,
    totalPages,
    pageSize,
    hasPrevPage,
    hasNextPage,
    isLoading,
    isFetchingPage,
    goToPrevPage,
    goToNextPage,
    goToPage,
  } = group;

  return (
    <div ref={sectionRef} className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge className={`text-xs ${TYPE_STYLES[type]}`}>{type}</Badge>
          <span className="text-xs font-medium text-slate-600">
            {totalCount} {itemLabel}
          </span>
        </div>
        {rows.length > 0 && (
          <span className="text-xs text-slate-500">
            Showing {page * pageSize + 1}–{Math.min(page * pageSize + rows.length, totalCount || rows.length)} of{" "}
            {totalCount || rows.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center bg-white rounded-lg border border-slate-100">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-3">
          <motion.div
            key={`${type}-page-${page}-${resetKey}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="rounded-lg border border-slate-200 bg-white overflow-hidden"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Basis</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge className={`text-xs ${TYPE_STYLES[r.type]}`}>{r.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">{r.name}</TableCell>
                    <TableCell className="text-slate-500 capitalize">{r.detail}</TableCell>
                    <TableCell className="text-slate-500">{r.basis}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(r.cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>

          <EventsPaginationBar
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            currentCount={rows.length}
            totalCount={totalCount}
            itemLabel={itemLabel}
            hasPrevPage={hasPrevPage}
            hasNextPage={hasNextPage}
            isFetchingPage={isFetchingPage}
            onPrevPage={goToPrevPage}
            onNextPage={goToNextPage}
            onGoToPage={goToPage}
            scrollTargetRef={sectionRef}
          />
        </div>
      )}
    </div>
  );
}

export default function AllCostsTable({ filter = { status: "all", eventId: "all", from: "", to: "" } }) {
  const { selectedBranchId } = useBranch();
  const [search, setSearch] = useState("");

  const {
    equipmentGroup,
    staffingGroup,
    logisticsGroup,
    totalCount,
    resetKey,
  } = usePaginatedAllCosts({
    branchId: selectedBranchId,
    filter,
    search,
  });

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900">All predefined costs</h3>
          <Badge variant="outline" className="text-xs text-slate-600">
            {totalCount} total
          </Badge>
        </div>
        <div className="relative w-60">
          <Search className="w-4 h-4 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
          <Input
            className="h-8 pl-8"
            placeholder="Search costs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <CostTypeSection
          type="Equipment"
          itemLabel="equipment costs"
          emptyText="No equipment costs match the current filters."
          group={equipmentGroup}
          resetKey={resetKey}
        />

        <CostTypeSection
          type="Staffing"
          itemLabel="staffing costs"
          emptyText="No staffing costs match the current filters."
          group={staffingGroup}
          resetKey={resetKey}
        />

        <CostTypeSection
          type="Logistics"
          itemLabel="logistics costs"
          emptyText="No logistics costs match the current filters."
          group={logisticsGroup}
          resetKey={resetKey}
        />
      </div>
    </Card>
  );
}
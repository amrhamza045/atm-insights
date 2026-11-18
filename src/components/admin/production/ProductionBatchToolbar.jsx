import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Calendar, RotateCcw } from "lucide-react";

const QUICK_FILTERS = [
  { key: "today", label: "Today's Events" },
  { key: "all", label: "All Batches" },
  { key: "this_week", label: "This Week's Events" },
  { key: "this_month", label: "This Month's Events" },
  { key: "upcoming_events", label: "Upcoming Events" },
  { key: "completed_events", label: "Completed Events" },
  { key: "regular_only", label: "Non-Event Batches" },
];

export default function ProductionBatchToolbar({
  filters,
  onChange,
  onReset,
  recipes = [],
  branches = [],
  showBranchFilter = false,
}) {
  const update = (patch) => onChange({ ...filters, ...patch });
  const hasActiveFilters =
    filters.search ||
    filters.quickFilter !== "today" ||
    filters.batchStatus !== "all" ||
    filters.productionType !== "all" ||
    filters.recipeId !== "all" ||
    filters.eventStatus !== "all" ||
    filters.branchFilter !== "all" ||
    (filters.sortBy && filters.sortBy !== "auto") ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-sm">
      {/* Search bar + Quick filter chips */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search event name, event date (e.g. Nov 4 or 2026-11-04), customer name, or recipe..."
            className="pl-9 pr-8 h-9 text-sm"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => update({ search: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {QUICK_FILTERS.map((qf) => {
            const active = filters.quickFilter === qf.key;
            return (
              <button
                key={qf.key}
                type="button"
                onClick={() => update({ quickFilter: qf.key })}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {qf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed filter controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 pt-1 border-t border-slate-100">
        <Select value={filters.batchStatus} onValueChange={(v) => update({ batchStatus: v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Batch Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batch Statuses</SelectItem>
            <SelectItem value="active">Active (Pending + In Progress)</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.productionType} onValueChange={(v) => update({ productionType: v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Batch Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batch Types</SelectItem>
            <SelectItem value="catering">Event Batches Only</SelectItem>
            <SelectItem value="regular">Regular (Non-Event) Only</SelectItem>
            <SelectItem value="sub_recipe">Sub-Recipe Batches</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.eventStatus} onValueChange={(v) => update({ eventStatus: v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Event Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Event Statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="quoted">Quoted / Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.recipeId} onValueChange={(v) => update({ recipeId: v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="All Recipes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Recipes</SelectItem>
            {recipes.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sortBy || "auto"} onValueChange={(v) => update({ sortBy: v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Sort Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Sort: Default</SelectItem>
            <SelectItem value="date_asc">Date (Earliest First)</SelectItem>
            <SelectItem value="date_desc">Date (Latest First)</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
          </SelectContent>
        </Select>

        {showBranchFilter && (
          <Select value={filters.branchFilter} onValueChange={(v) => update({ branchFilter: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-1.5 col-span-1 sm:col-span-2 lg:col-span-2">
          <div className="relative flex-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => update({ dateFrom: e.target.value })}
              className="h-8 pl-7 text-xs"
              title="Event date from"
            />
          </div>
          <span className="text-xs text-slate-400">to</span>
          <div className="relative flex-1">
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => update({ dateTo: e.target.value })}
              className="h-8 text-xs"
              title="Event date to"
            />
          </div>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900 shrink-0 gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
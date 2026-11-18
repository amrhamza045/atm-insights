import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

const PAGE_SIZE = 25;

export default function ClientListPanel({ onOpenClient }) {
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [open, setOpen] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["crm-client-list"],
    queryFn: () => base44.entities.Client.list("-created_date", 1000),
    enabled: open,
  });

  const term = search.trim().toLowerCase();
  const filtered = clients
    .filter((c) => !c.is_merged)
    .filter((c) =>
      !term ||
      (c.name || "").toLowerCase().includes(term) ||
      (c.email || "").toLowerCase().includes(term) ||
      (c.phone || "").includes(term)
    );

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 px-1 font-semibold text-slate-900"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            All clients{open ? ` (${filtered.length})` : ""}
          </Button>
          <div className={`relative w-64 ${open ? "" : "hidden"}`}>
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              className="pl-8 h-9"
              placeholder="Filter list…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisible(PAGE_SIZE); }}
            />
          </div>
        </div>

        {!open ? null : isLoading ? (
          <p className="text-sm text-slate-500">Loading clients…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">No clients match this filter.</p>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {filtered.slice(0, visible).map((c) => (
                <button
                  key={c.id}
                  onClick={() => onOpenClient(c)}
                  className="w-full text-left py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {c.phone || "—"}{c.email ? ` · ${c.email}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {c.client_type === "corporate" ? "Corporate" : "Individual"}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
            {filtered.length > visible && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                Show more ({filtered.length - visible} remaining)
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
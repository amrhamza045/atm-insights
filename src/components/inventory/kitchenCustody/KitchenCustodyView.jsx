import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ChefHat } from "lucide-react";
import EventsPaginationBar from "@/components/catering/EventsPaginationBar";
import useKitchenCustody from "./useKitchenCustody";
import { groupByItem } from "./kitchenCustodyLogic";
import CustodyItemRow from "./CustodyItemRow";
import EventSearchFilter from "./EventSearchFilter";

const PAGE_SIZE = 15;
const VIEWS = [
  { key: "kitchen", label: "In kitchen custody" },
  { key: "reserved", label: "Reserved on shelf" },
];

export default function KitchenCustodyView() {
  const [view, setView] = useState("kitchen");
  const [eventIds, setEventIds] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const topRef = useRef(null);
  const { data, isLoading } = useKitchenCustody(view);

  const events = useMemo(() => {
    const map = {};
    (data?.reservations || []).forEach((r) => {
      map[r.event_id] = { id: r.event_id, name: r.event_name || "Event", date: r.event_date };
    });
    return Object.values(map).sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }, [data]);

  const items = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    const rows = data.reservations.filter((r) =>
      (!eventIds.length || eventIds.includes(r.event_id)) &&
      (!term || String(r.inventory_item_name || "").toLowerCase().includes(term)));
    return groupByItem(rows, view, data.ordersById, data.nameByEmail);
  }, [data, eventIds, search, view]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const reset = (fn) => (v) => { fn(v); setPage(0); };

  return (
    <div className="space-y-3" ref={topRef}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex rounded-lg bg-slate-100 p-1 shrink-0">
          {VIEWS.map((v) => (
            <button key={v.key} onClick={() => { setView(v.key); setEventIds([]); setPage(0); }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view === v.key ? "bg-orange-600 text-white" : "text-slate-600 hover:text-slate-900"}`}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => reset(setSearch)(e.target.value)} placeholder="Search item" className="pl-9 bg-white" />
        </div>
        <EventSearchFilter events={events} selected={eventIds} onChange={reset(setEventIds)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-slate-500">
          <ChefHat className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          {view === "kitchen" ? "Nothing is held in kitchen custody right now." : "No stock is reserved for events right now."}
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.table key={`${view}-${page}`} className="w-full text-sm table-fixed"
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}>
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 px-4 text-left font-medium w-1/4">Item</th>
                    <th className="py-2 px-4 text-left font-medium w-28">Quantity</th>
                    <th className="py-2 px-4 text-left font-medium">Reserved for</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => <CustodyItemRow key={item.id} item={item} view={view} />)}
                </tbody>
              </motion.table>
            </AnimatePresence>
          </Card>
          <EventsPaginationBar
            page={page} totalPages={totalPages} pageSize={PAGE_SIZE}
            currentCount={pageItems.length} totalCount={items.length} itemLabel="items"
            hasPrevPage={page > 0} hasNextPage={page < totalPages - 1}
            onPrevPage={() => setPage((p) => p - 1)} onNextPage={() => setPage((p) => p + 1)}
            onGoToPage={setPage} scrollTargetRef={topRef}
          />
        </>
      )}
    </div>
  );
}
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Search, X } from "lucide-react";

export default function CaptainCustomerCard({ clients, selectedCustomer, onSelect }) {
  const [search, setSearch] = useState("");

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase().trim();
    return clients.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [clients, search]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="w-4 h-4" />
          Customer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {search && (
          <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
            {results.length > 0 ? results.map(customer => (
              <button
                key={customer.id}
                onClick={() => { onSelect(customer); setSearch(""); }}
                className="w-full text-left p-2 hover:bg-slate-50 rounded"
              >
                <p className="font-medium text-sm">{customer.name}</p>
                <p className="text-xs text-slate-500">{customer.phone}</p>
              </button>
            )) : (
              <p className="text-sm text-slate-500 text-center py-3">Customer not found</p>
            )}
          </div>
        )}

        {selectedCustomer && (
          <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-sm">{selectedCustomer.name}</p>
              <p className="text-xs text-slate-500">{selectedCustomer.phone}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
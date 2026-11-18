import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { findClientMatches } from "@/components/clients/findClientMatches";
import DuplicateClientWarning from "@/components/clients/DuplicateClientWarning";
import PhoneField from "@/components/shared/PhoneField";
import { validateCountryPhone } from "@/lib/phoneCountries";

export default function ClientSearchSelect({ value, onSelect }) {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["catering-clients"],
    queryFn: () => base44.entities.Client.list("-created_date", 2000),
  });

  const selected = clients.find((c) => c.id === value) || null;

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    return clients
      .filter((c) =>
        [c.name, c.phone, c.email].some((f) => (f || "").toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [clients, term]);

  // Existing records that already carry this phone/email — warn before a duplicate is born.
  const duplicateMatches = useMemo(
    () => findClientMatches(clients, { phone: newClient.phone, email: newClient.email }),
    [clients, newClient.phone, newClient.email]
  );

  const handleCreate = async () => {
    if (!newClient.name.trim() || !newClient.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    const phoneError = validateCountryPhone(newClient.phone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }
    if (newClient.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClient.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSaving(true);
    try {
      const created = await base44.entities.Client.create({
        name: newClient.name.trim(),
        phone: newClient.phone.trim(),
        email: newClient.email.trim() || undefined,
        client_source: "pos",
        status: "active",
      });
      await queryClient.invalidateQueries({ queryKey: ["catering-clients"] });
      onSelect(created);
      setShowNew(false);
      setNewClient({ name: "", phone: "", email: "" });
      toast.success("Client created");
    } catch (e) {
      toast.error("Could not create client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {selected ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{selected.name}</p>
            <p className="text-xs text-slate-500">{selected.phone || "—"} {selected.email ? `· ${selected.email}` : ""}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge variant="secondary" className="text-xs">
                Credit limit: {Number(selected.catering_credit_limit) > 0 ? formatCurrency(selected.catering_credit_limit, true) : "None set"}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>Change</Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search client by name, phone or email"
              className="pl-8"
            />
          </div>
          {term.trim() && (
            <div className="rounded-lg border border-slate-200 divide-y max-h-56 overflow-y-auto">
              {results.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">No matching client.</p>
              ) : (
                results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { onSelect(c); setTerm(""); }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 flex items-center justify-between gap-2"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900 truncate">{c.name}</span>
                      <span className="block text-xs text-slate-500">{c.phone || "—"}</span>
                    </span>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      Limit {Number(c.catering_credit_limit) > 0 ? formatCurrency(c.catering_credit_limit, true) : "—"}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setShowNew(true)}>
            <UserPlus className="w-4 h-4" /> New client
          </Button>
        </>
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value.replace(/[^A-Za-z\u0600-\u06FF\s'.-]/g, "") })} placeholder="Letters only" /></div>
            <PhoneField
              value={newClient.phone}
              onChange={(phone) => setNewClient({ ...newClient, phone })}
              required
            />
            <div><Label>Email</Label><Input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} placeholder="name@example.com" /></div>
            <DuplicateClientWarning
              matches={duplicateMatches}
              phone={newClient.phone}
              email={newClient.email}
              onUseExisting={(c) => {
                onSelect(c);
                setShowNew(false);
                setNewClient({ name: "", phone: "", email: "" });
                setTerm("");
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="gap-1.5"><Check className="w-4 h-4" /> Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
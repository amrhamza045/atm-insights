import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown, Package, UserPlus, FileText, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import QuickAddCustomerDialog from "./QuickAddCustomerDialog";
import RecordDepositPicker from "./RecordDepositPicker";
import CreateQuotePicker from "./CreateQuotePicker";

// Every option is always shown; the permission is checked on click.
export default function QuickActionsMenu({ onQuoteExisting, onQuoteCreated, onRecordDeposit, joined = false }) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const { permissions } = usePermissions();
  const [customerOpen, setCustomerOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const has = (...keys) => isAdmin || keys.some((k) => permissions?.[k]);

  const guard = (allowed, label, run) => () => {
    if (!allowed) { toast.error(`You need permission to ${label}.`); return; }
    run();
  };

  const actions = [
    { icon: Package, label: "Add Item", ok: has("inventory_edit", "inventory_manage"), need: "create inventory items", run: () => navigate("/InventoryManagement?new=1") },
    { icon: UserPlus, label: "Add Customer", ok: has("clients_edit"), need: "add customers", run: () => setCustomerOpen(true) },
    { icon: FileText, label: "Create Quote", ok: has("catering_edit"), need: "create quotes", run: () => setQuoteOpen(true) },
    { icon: Wallet, label: "Record Deposit", ok: has("catering_finance"), need: "record deposits", run: () => setDepositOpen(true) },
  ];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className={`h-9 w-9 shrink-0 p-0 bg-gold text-white hover:bg-gold hover:brightness-90 brightness-[0.92] ${joined ? "rounded-l-none border-l border-white/40" : ""}`} aria-label="Quick actions">
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {actions.map((a) => (
            <DropdownMenuItem key={a.label} onSelect={guard(a.ok, a.need, a.run)} className={a.ok ? "" : "opacity-60"}>
              <a.icon className="w-4 h-4 mr-2" /> + {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <QuickAddCustomerDialog open={customerOpen} onOpenChange={setCustomerOpen} />
      <CreateQuotePicker open={quoteOpen} onOpenChange={setQuoteOpen} onExisting={onQuoteExisting} onCreated={onQuoteCreated} />
      <RecordDepositPicker open={depositOpen} onOpenChange={setDepositOpen} onPick={onRecordDeposit} />
    </>
  );
}
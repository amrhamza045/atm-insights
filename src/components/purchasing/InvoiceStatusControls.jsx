import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useHasAnyPermission } from "@/components/permissions/PermissionsContext";

// Older invoices have no status — they were posted when created.
export const isDraftInvoice = (invoice) => invoice?.status === "draft";

export function InvoiceStatusBadge({ invoice }) {
  return isDraftInvoice(invoice)
    ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Draft</Badge>
    : <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Posted</Badge>;
}

export { default as PostInvoiceButton } from '@/components/purchasing/supplierAccounts/SupplierInvoicePostButton';
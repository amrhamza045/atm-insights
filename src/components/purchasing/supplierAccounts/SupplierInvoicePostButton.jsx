import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useHasAnyPermission } from '@/components/permissions/PermissionsContext';
import { toast } from 'sonner';
import SupplierInvoicePostForm from '@/components/purchasing/supplierAccounts/SupplierInvoicePostForm';
import { supplierError, refreshSupplierAccounts } from '@/components/purchasing/supplierAccounts/supplierAccountApi';
export default function SupplierInvoicePostButton({invoice, onPosted}) {
  const [open, setOpen] = useState(false), client = useQueryClient();
  const canPost = useHasAnyPermission(['purchase_approve']);
  const post = useMutation({mutationFn: async settlement => {const {data} = await base44.functions.invoke('processPurchaseInvoice', {post_invoice_id: invoice.id, settlement}); if (data.error) throw new Error(data.error); return data;}, onSuccess: () => {refreshSupplierAccounts(client); ['inventoryItems','expiryReports'].forEach(k => client.invalidateQueries({queryKey: [k]})); setOpen(false); toast.success('Invoice posted and supplier balance updated'); onPosted?.();}, onError: () => refreshSupplierAccounts(client)});
  if (invoice?.status !== 'draft' || !canPost) return null;
  return <><Button size="sm" className="mt-2" onClick={() => setOpen(true)}>Post / settle</Button><Dialog open={open} onOpenChange={value => {if (!post.isPending) setOpen(value);}}><DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Post {invoice.invoice_number}</DialogTitle></DialogHeader><SupplierInvoicePostForm invoice={invoice} pending={post.isPending} error={post.error ? supplierError(post.error) : ''} onSubmit={value => post.mutate(value)} /></DialogContent></Dialog></>;
}
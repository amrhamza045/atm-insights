import { base44 } from '@/api/base44Client';
export async function supplierAccountCall(input) {
  const {data} = await base44.functions.invoke('supplierAccounts', input);
  if (data?.error) throw new Error(data.error);
  return data;
}
export const supplierError = error => error.response?.data?.error || error.message;
export function refreshSupplierAccounts(client) {
  ['supplier-accounts','supplierPayments','purchaseInvoices','suppliers','finance-journals','finance-summary'].forEach(key => client.invalidateQueries({queryKey: [key]}));
}
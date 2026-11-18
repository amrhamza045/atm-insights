import { formatCurrency } from '@/components/utils/currencyFormatter';
export default function SupplierReturnPreview({plan}) {
 return <div className="rounded-md border bg-muted p-3 space-y-2"><h5 className="font-semibold">Verified supplier return</h5>
  {plan.items.map(i=><p key={i.line_index} className="text-sm">{i.inventory_item_name}: return {i.quantity} {i.unit}, remove {i.stock_quantity} {i.stock_unit} from stock · Supplier credit {formatCurrency(i.credit)}</p>)}
  <p className="font-medium">Supplier balance reduction: {formatCurrency(plan.credit)} · Stock carrying value: {formatCurrency(plan.stock_cost)}</p>
  <p className="text-xs text-muted-foreground">Any purchase-price / carrying-cost difference uses the configured purchase-return variance account. No cash refund or bank transfer is recorded.</p>
  <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Balanced return journal preview</caption><thead><tr><th className="text-start">GL account</th><th className="text-end">Debit</th><th className="text-end">Credit</th></tr></thead><tbody>{plan.lines.map((l,index)=><tr key={index}><td>{l.account_code} · {l.account_name}</td><td className="text-end">{formatCurrency(l.debit)}</td><td className="text-end">{formatCurrency(l.credit)}</td></tr>)}</tbody></table></div>
 </div>;
}
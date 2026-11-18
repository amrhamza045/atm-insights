import { Link } from 'react-router-dom';
import TransactionRoutingEditor from '@/components/finance/transactions/TransactionRoutingEditor';
import PurchaseAuditRouting from '@/components/finance/transactions/PurchaseAuditRouting';
import FinanceModuleSettings from '@/components/finance/FinanceModuleSettings';
import PaymentMethods from '@/components/finance/paymentMethods/PaymentMethods';

export default function TransactionFutureRouting({ company, detail, can }) {
 const kind=detail.routing.kind;
 return <section className="rounded-lg border p-4 space-y-4">
  <div><h4 className="font-semibold">Permanent automatic routing</h4><p className="text-sm mt-1">{detail.mapping.reason}</p><p className="text-xs text-muted-foreground mt-1">Configuration checked for {detail.mapping.checked_date}. Posting status and historical recovery are separate; a one-time correction does not resolve missing routing.</p></div>
  {kind==='semantic'&&<><TransactionRoutingEditor company={company} detail={detail} can={can}/><details><summary className="cursor-pointer text-sm font-medium">Configure payment-method accounts for future payments</summary><div className="mt-3"><PaymentMethods company={company} can={can}/></div></details></>}
  {kind==='operational'&&<TransactionRoutingEditor company={company} detail={detail} can={can}/>}
  {kind==='purchase'&&<PurchaseAuditRouting company={company} detail={detail} can={can}/>}
  {kind==='module'&&<FinanceModuleSettings company={company} can={can}/>}
  {kind==='inventory'&&<p className="text-sm">Stock costs post automatically when waste is approved or an event is closed. Fix the account in Mapping Accounts › Inventory or Waste reasons, then use Retry in <Link className="text-primary underline" to="/Finance?finance_view=configuration&tab=automatic">Posting issues</Link>.</p>}
  {kind==='unsupported'&&<p className="text-sm">No validated automatic source connection is available. This stays in the exception queue even after a one-time journal; an accountant must review its treatment, and the missing connection needs implementation before recurring posting can be enabled.</p>}
  <Link className="text-sm text-primary underline" to="/Finance?finance_view=configuration&tab=mapping">Review existing rules in Mapping Accounts</Link>
 </section>;
}
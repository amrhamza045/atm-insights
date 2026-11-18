import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PayoutSourceSelect from "@/components/finance/payouts/PayoutSourceSelect";

// One HR payout row: Salary, External Labor, or Employee Advance
export default function PayoutRow({ payout: d, canPay, busy, onConfirm, methods, custodies }) {
  const isAdvance = d._entity === "EmployeeBorrowing";
  const paid = (isAdvance ? d.payout_status : d.status) === "paid";
  
  // Track individual row's selection (if batch is not used)
  const [sourceType, setSourceType] = useState('payment_method');
  const [sourceId, setSourceId] = useState(null);

  const handleSourceChange = (id, type) => {
    setSourceType(type);
    if (id !== undefined) setSourceId(id);
    else setSourceId(null);
  };

  const handleConfirm = () => {
    if (!sourceId) return;
    onConfirm({ items: [d], source_id: sourceId, payout_source_type: sourceType });
  };

  return (
    <div className="py-3 flex flex-wrap items-center gap-3 text-sm">
      <div className="flex-1 min-w-[200px] flex items-center gap-2">
        <span className="font-medium">{d.employee_name}</span>
        <Badge variant="outline" className="text-xs font-normal">
          {isAdvance ? "Advance" : d.employment_type === 'temporary' || d.employment_type === 'freelance' ? "External labor" : "Salary"}
        </Badge>
      </div>
      
      <span className="font-semibold w-[120px]">EGP {(d.amount || 0).toFixed(2)}</span>
      
      <div className="w-[180px]">
        <Badge className={
          paid ? "bg-green-100 text-green-700" : 
          d.approval_status === "approved" ? "bg-blue-100 text-blue-700" : 
          "bg-amber-100 text-amber-700"
        }>
          {paid ? "Paid" : d.approval_status === "approved" ? "Approved · Ready" : d.approval_status === "missing_proposal" ? "No approval queued" : "Awaiting approval"}
        </Badge>
      </div>
      
      {paid ? (
        <span className="text-xs text-muted-foreground w-full sm:w-auto">
          Paid from {d.payout_source_type === 'custody' ? `${d.custody_holder_name} Custody` : d.payment_method_name}
        </span>
      ) : d.approval_status === "approved" && canPay ? (
        <div className="flex items-center gap-2 w-full xl:w-auto">
          <div className="w-[300px]">
            <PayoutSourceSelect type={sourceType} value={sourceId} onChange={handleSourceChange} disabled={busy} methods={methods} custodies={custodies} requiredAmount={d.amount} />
          </div>
          <Button size="sm" className="h-8 shrink-0 bg-green-600 hover:bg-green-700" disabled={busy || !sourceId} onClick={handleConfirm}>
            Confirm paid
          </Button>
        </div>
      ) : !paid ? (
        <span className="text-xs text-muted-foreground italic">Requires Finance approval in Pending review</span>
      ) : null}
    </div>
  );
}
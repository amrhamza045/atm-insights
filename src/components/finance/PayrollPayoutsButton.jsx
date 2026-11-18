import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useHasAnyPermission } from "@/components/permissions/PermissionsContext";
import PayrollPayouts from "@/components/finance/PayrollPayouts";

/** Opens the HR & Payroll payouts workspace in a side panel. */
export default function PayrollPayoutsButton({ company }) {
  const canView = useHasAnyPermission(["finance_edit", "finance_view"]);
  if (!canView || !company) return null;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2"><Wallet className="w-4 h-4" />HR & Payroll payouts</Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-4"><SheetTitle>HR & Payroll Payouts · {company.name}</SheetTitle></SheetHeader>
        <PayrollPayouts company={company} />
      </SheetContent>
    </Sheet>
  );
}
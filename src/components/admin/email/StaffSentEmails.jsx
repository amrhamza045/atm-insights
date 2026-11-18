import { Link } from "react-router-dom";
import { Hand, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STAFF_SENT = [
  { label: "Quotes, invoices & receipts", from: "The Email button on an event's documents", wording: "Catering › Mail", to: "/Catering?tab=mail" },
  { label: "Guest invitations", from: "Catering › Invitations", wording: "Catering › Mail", to: "/Catering?tab=invi222" },
  { label: "Client portal invitation", from: "Catering › Portal Access", to: "/Catering?tab=portal" },
  { label: "Payslips", from: "HR Hub › Payroll", to: "/HRHub?tab=hr-payroll" },
];

export default function StaffSentEmails() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Hand className="w-5 h-5 text-amber-600" />Sent by staff</CardTitle>
        <CardDescription>These go out only when someone sends them, so they have no switch here.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y rounded-lg border p-0">
        {STAFF_SENT.map((email) => (
          <div key={email.label} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">{email.label}</p>
              <p className="text-xs text-slate-500">
                Sent from {email.from}{email.wording ? ` · Wording set in ${email.wording}` : ""}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={email.to}>Open<ArrowUpRight /></Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
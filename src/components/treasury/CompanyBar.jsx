import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

export default function CompanyBar({ companies = [], company, onSelectCompany }) {
  if (!company) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {companies.length > 1 ? (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <Select value={company.id} onValueChange={onSelectCompany}>
            <SelectTrigger className="w-56 h-9 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.currency}){c.is_test ? " · Test" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs">
          <Building2 className="w-3.5 h-3.5" />
          {company.name} · {company.currency}
        </Badge>
      )}
    </div>
  );
}
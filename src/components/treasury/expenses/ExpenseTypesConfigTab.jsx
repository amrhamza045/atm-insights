import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil } from "lucide-react";
import ExpenseTypeDialog from "@/components/treasury/expenses/ExpenseTypeDialog";

export default function ExpenseTypesConfigTab({
  expenseTypes = [],
  expenseAccounts = [],
  canConfigure,
  onSaveType,
  onToggleType,
  busy,
}) {
  const [editing, setEditing] = useState(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Expense Names & GL Account Mappings</h2>
          <p className="text-xs text-muted-foreground">
            Define custom expense types and map each one to its General Ledger posting account. Approved operating disbursements debit the mapped account automatically.
          </p>
        </div>
        {canConfigure && (
          <Button onClick={() => setEditing({})} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Expense Type
          </Button>
        )}
      </div>

      {expenseTypes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No expense types configured yet. Click <strong>Add Expense Type</strong> to create your first expense name and account mapping.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto border rounded-lg bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 border-b text-left">
              <tr>
                <th className="px-3 py-2.5 font-medium">Expense Name</th>
                <th className="px-3 py-2.5 font-medium">Code</th>
                <th className="px-3 py-2.5 font-medium">Group</th>
                <th className="px-3 py-2.5 font-medium">Mapped GL Account</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                {canConfigure && <th className="px-3 py-2.5 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenseTypes.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{t.name}</p>
                    {t.notes && <p className="text-xs text-muted-foreground">{t.notes}</p>}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{t.code}</td>
                  <td className="px-3 py-2.5 capitalize">{t.category_group}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline">
                      {t.account_code} · {t.account_name}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={t.is_active ? "default" : "secondary"}>
                      {t.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  {canConfigure && (
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-3">
                        <Switch
                          checked={Boolean(t.is_active)}
                          disabled={busy}
                          onCheckedChange={(checked) => onToggleType({ id: t.id, is_active: checked })}
                        />
                        <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <ExpenseTypeDialog
          item={editing}
          accounts={expenseAccounts}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(payload) => onSaveType(payload, () => setEditing(null))}
        />
      )}
    </div>
  );
}
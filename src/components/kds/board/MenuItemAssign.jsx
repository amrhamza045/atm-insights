import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

// Assigns an un-batched menu item to one staff member (or clears it).
export default function MenuItemAssign({ event, quoteId, itemKey, itemName, assignment, employees, onChanged }) {
  const change = async (value) => {
    if (value === "none") {
      if (assignment) await base44.entities.KitchenItemAssignment.delete(assignment.id);
    } else {
      const emp = employees.find((e) => e.id === value);
      const data = { event_id: event.id, quote_id: quoteId, item_key: itemKey, item_name: itemName, employee_id: emp.id, employee_name: emp.name };
      if (assignment) await base44.entities.KitchenItemAssignment.update(assignment.id, data);
      else await base44.entities.KitchenItemAssignment.create(data);
    }
    onChanged();
  };

  return (
    <Select value={assignment?.employee_id || "none"} onValueChange={change}>
      <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Unassigned</SelectItem>
        {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
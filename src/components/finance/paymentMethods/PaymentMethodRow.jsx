import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

// One payment method: its cash / bank account, older codes and the default flag.
export default function PaymentMethodRow({ method: m, editable, busy, onToggle, onEdit, onDelete }) {
  return (
    <tr className="border-t align-top">
      <td className="p-3 font-medium">{m.name}{m.is_default && <Badge variant="secondary" className="ml-2">Default</Badge>}</td>
      <td className="p-3">
        <span className="font-mono text-xs">{m.code}</span>
        {(m.legacy_codes || []).length > 0 && <p className="text-xs text-muted-foreground">Also: {m.legacy_codes.join(', ')}</p>}
      </td>
      <td className="p-3">{m.account_code} · {m.account_name}</td>
      <td className="p-3"><Switch aria-label={`Active: ${m.name}`} checked={m.is_active} disabled={!editable || busy} onCheckedChange={(is_active) => onToggle(m, is_active)} /></td>
      <td className="p-3">
        {editable && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onEdit(m)}>Edit</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDelete(m)}>Delete</Button>
          </div>
        )}
      </td>
    </tr>
  );
}
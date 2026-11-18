export default function RoutingConditionChecklist({ label, items, value = [], onChange, disabled }) {
  return <fieldset disabled={disabled} className="min-w-0 space-y-1">
    <legend className="text-sm">{label}</legend>
    <p className="text-xs text-muted-foreground" role="status">{value.length} selected</p>
    <div className="max-h-48 overflow-y-auto rounded-md border border-input bg-background p-2">
      {items.map(item => <label key={item.value} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-primary" checked={value.includes(item.value)} onChange={e => onChange(e.target.checked ? [...value, item.value] : value.filter(id => id !== item.value))} />
        <span>{item.label}</span>
      </label>)}
    </div>
  </fieldset>;
}
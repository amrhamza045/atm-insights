import * as React from "react"

import { cn } from "@/lib/utils"

const baseClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"

// Number fields keep the typed text as a draft, so clearing a "0" stays empty
// while editing even when the parent coerces "" back to 0.
const NumberInput = React.forwardRef(({ value, onChange, ...props }, ref) => {
  const toText = (v) => (v === null || v === undefined ? "" : String(v))
  const [draft, setDraft] = React.useState(toText(value))

  React.useEffect(() => {
    const next = toText(value)
    setDraft((d) => (d !== "" && next !== "" && Number(d) === Number(next)) || (d === "" && Number(next) === 0) ? d : next)
  }, [value, draft])

  return (
    <input
      type="number"
      ref={ref}
      value={draft}
      onChange={(e) => { setDraft(e.target.value); onChange?.(e) }}
      {...props}
    />
  )
})

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  const cls = cn(baseClass, className)
  if (type === "number" && "value" in props) return <NumberInput ref={ref} className={cls} {...props} />
  return <input type={type} className={cls} ref={ref} {...props} />
})
Input.displayName = "Input"

export { Input, NumberInput }
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check } from "lucide-react";

export function MobileSelect({
  value,
  onValueChange,
  trigger,
  children,
  placeholder = "Select an option",
  disabled = false
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        {trigger || <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>}
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    );
  }

  const selectedLabel = children?.props?.children?.find(
    (child) => child?.props?.value === value
  )?.props?.children || placeholder;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <button
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex items-center justify-between text-left">
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {selectedLabel}
          </span>
          <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </button>

      <Drawer.Content>
        <div className="p-4 border-b border-border sticky top-0 bg-background">
          <h3 className="font-semibold text-lg">Select Option</h3>
        </div>
        <div className="space-y-2 p-4 pb-8">
          {children?.props?.children?.map((child) => (
            <button
              key={child.props.value}
              onClick={() => {
                onValueChange(child.props.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${
                value === child.props.value
                  ? "border-amber-500 bg-amber-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="font-medium text-slate-900">{child.props.children}</span>
              {value === child.props.value && (
                <Check className="w-5 h-5 text-amber-600" />
              )}
            </button>
          ))}
        </div>
      </Drawer.Content>
    </Drawer>
  );
}

export default MobileSelect;
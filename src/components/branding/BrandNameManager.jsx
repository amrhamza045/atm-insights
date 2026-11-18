import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store } from "lucide-react";

export default function BrandNameManager({ brandName, onChange }) {
  return (
    <Card className="p-6 border-0 shadow-sm">
      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
        <Store className="w-4 h-4 text-slate-500" />
        Brand Name
      </h3>
      <p className="text-sm text-slate-500 mt-0.5">
        The business display name shown next to the logo in the header and as
        the browser tab title.
      </p>
      <div className="mt-4 space-y-2 max-w-md">
        <Label htmlFor="brand-name" className="text-xs text-slate-500">
          Display name
        </Label>
        <Input
          id="brand-name"
          value={brandName}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Your Brand"
          maxLength={60}
        />
      </div>
    </Card>
  );
}
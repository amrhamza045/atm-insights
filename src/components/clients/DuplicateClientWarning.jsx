import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { matchReason } from "./findClientMatches";

/**
 * Warns (never blocks) that the phone/email being entered already belongs to an
 * existing client, and offers to use that record instead of creating a duplicate.
 */
export default function DuplicateClientWarning({ matches = [], phone, email, onUseExisting }) {
  if (!matches.length) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
      <div className="min-w-0 space-y-2">
        <p className="font-semibold">
          {matches.length === 1 ? "A client with these details already exists" : "Clients with these details already exist"}
        </p>
        <p className="text-xs">
          Creating another record splits this customer's events, quotes and portal access across two profiles. Use the
          existing record unless this is genuinely a different person.
        </p>
        <div className="space-y-1.5">
          {matches.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/70 px-2 py-1.5">
              <span className="min-w-0">
                <span className="block font-medium truncate">{c.name}</span>
                <span className="block text-xs text-amber-700">
                  {c.phone || "—"}{c.email ? ` · ${c.email}` : ""} — {matchReason(c, { phone, email })}
                </span>
              </span>
              {onUseExisting && (
                <Button type="button" size="sm" variant="outline" onClick={() => onUseExisting(c)}>
                  Use this client
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
import React from "react";
import { AlertTriangle } from "lucide-react";

export default function DataGapsNotice({ client }) {
  const gaps = [];
  if (!client.email) gaps.push("No email on file — lead matching and email notifications cannot resolve this client.");
  if (!client.phone) gaps.push("No phone on file.");

  if (gaps.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
        <AlertTriangle className="w-4 h-4" /> Data gaps found (reported only — nothing was changed)
      </p>
      <ul className="mt-1.5 list-disc pl-5 space-y-0.5 text-xs text-amber-800">
        {gaps.map((g) => <li key={g}>{g}</li>)}
      </ul>
    </div>
  );
}
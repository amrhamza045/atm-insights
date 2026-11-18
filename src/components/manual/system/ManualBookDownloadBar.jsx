import React from "react";
import { Library, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import useManualBookDownload from "./useManualBookDownload";

// Slim bar above the User Manual tab: grabs the whole book (Reference + How-To) in one PDF.
export default function ManualBookDownloadBar() {
  const { download, busy } = useManualBookDownload();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50/70 px-4 sm:px-6 py-2.5 print:hidden">
      <p className="text-sm text-amber-900">
        <span className="font-semibold">Complete manual</span> — reference chapters and every how-to guide in one branded PDF book.
      </p>
      <Button size="sm" onClick={() => download("all")} disabled={!!busy} className="gap-1.5 bg-amber-600 hover:bg-amber-700">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Library className="w-4 h-4" />}
        Download complete manual
      </Button>
    </div>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { clearCacheAndReload } from "@/lib/clearCache";

export default function ClearCacheButton() {
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = async () => {
    setIsClearing(true);
    await clearCacheAndReload();
  };

  return (
    <Card className="p-6 border-0 shadow-sm space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900">Clear Cache & Reload</h3>
          <p className="text-sm text-slate-500 mt-1">
            If the app isn't displaying correctly after a system update, use this to clear all
            cached files and load the latest version. This clears the browser cache, removes any
            stored service worker data, and forces a fresh download.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>The page will reload immediately after clicking — make sure no active orders are in progress.</span>
      </div>

      <Button
        onClick={handleClearCache}
        disabled={isClearing}
        className="bg-amber-500 hover:bg-amber-600"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isClearing ? "animate-spin" : ""}`} />
        {isClearing ? "Clearing..." : "Clear Cache & Reload"}
      </Button>
    </Card>
  );
}
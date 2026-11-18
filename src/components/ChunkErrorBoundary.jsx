import React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearCacheAndReload } from "@/lib/clearCache";
import { isModuleScriptError } from "@/lib/lazyWithRetry";

export default class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (!isModuleScriptError(error)) throw error;

    return (
      <div className="min-h-[40vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border bg-card text-card-foreground p-6 shadow-sm text-center space-y-4">
          <h2 className="text-lg font-semibold">Screen update ready</h2>
          <p className="text-sm text-muted-foreground">
            This screen was updated in the background or lost connection while loading. Reload to open the latest version.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
            <Button onClick={() => clearCacheAndReload()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Reload page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
import { useState } from "react";
import { Inbox, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EMAIL_ITEMS } from "./emailCatalog";
import { useEmailActivity } from "./useEmailActivity";
import ActivityRow from "./ActivityRow";

export default function EmailActivityCard({ filterKey, onFilterKey }) {
  const [problemsOnly, setProblemsOnly] = useState(false);
  const activity = useEmailActivity(filterKey, problemsOnly);
  const rows = activity.data?.pages.flatMap((page) => page.items) || [];

  return (
    <Card id="email-activity" className="scroll-mt-24">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recent activity</CardTitle>
        <CardDescription>Every automatic email and test sent from here on, newest first, with who received it.</CardDescription>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Select value={filterKey} onValueChange={onFilterKey}>
            <SelectTrigger className="h-8 w-64 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All emails</SelectItem>
              {EMAIL_ITEMS.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <Switch checked={problemsOnly} onCheckedChange={setProblemsOnly} />Only problems
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activity.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
        ) : !rows.length ? (
          <p className="flex flex-col items-center gap-2 py-8 text-sm text-slate-400">
            <Inbox className="h-6 w-6" />{problemsOnly ? "No problems found." : "Nothing sent yet."}
          </p>
        ) : (
          <div className="divide-y rounded-lg border">{rows.map((log) => <ActivityRow key={log.id} log={log} />)}</div>
        )}
        {activity.hasNextPage && (
          <Button variant="outline" size="sm" className="w-full" disabled={activity.isFetchingNextPage} onClick={() => activity.fetchNextPage()}>
            {activity.isFetchingNextPage && <Loader2 className="animate-spin" />}Load more
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
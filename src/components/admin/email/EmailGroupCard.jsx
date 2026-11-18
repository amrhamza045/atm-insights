import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EmailGroupCard({ group, values, onSet, children }) {
  const Icon = group.icon;
  const keys = group.items.map((item) => item.key);
  const onCount = keys.filter((key) => values[key]).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon className="w-5 h-5 text-amber-600" />{group.title}
            </CardTitle>
            <CardDescription className="mt-1">{group.description}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs text-slate-500">{onCount} of {keys.length} on</span>
            <Button variant="ghost" size="sm" disabled={onCount === keys.length} onClick={() => onSet(keys, true)}>All on</Button>
            <Button variant="ghost" size="sm" disabled={onCount === 0} onClick={() => onSet(keys, false)}>All off</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}
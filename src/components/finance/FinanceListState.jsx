import { Button } from '@/components/ui/button';
import { financeError } from '@/components/finance/financeApi';
export default function FinanceListState({query,emptyMessage='No matching records.'}) {
 return <div className="py-3 text-sm text-muted-foreground" aria-live="polite">{query.isPending?'Loading…':query.error?<p role="alert" className="text-destructive">{financeError(query.error)} <Button variant="outline" onClick={()=>query.refetch()}>Retry</Button></p>:<>{!query.items.length&&<p>{emptyMessage}</p>}{query.hasNextPage&&<Button variant="outline" disabled={query.isFetchingNextPage} onClick={()=>query.fetchNextPage()}>{query.isFetchingNextPage?'Loading…':'Load more'}</Button>}</>}</div>;
}
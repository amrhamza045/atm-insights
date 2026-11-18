import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { financeCall, financeError } from '@/components/finance/financeApi';
import OpeningCutoffCard from '@/components/finance/opening/OpeningCutoffCard';
import OpeningCashForm from '@/components/finance/opening/OpeningCashForm';
import OpeningStockForm from '@/components/finance/opening/OpeningStockForm';
import OpeningAssetForm from '@/components/finance/opening/OpeningAssetForm';
import OpeningSuppliersCard from '@/components/finance/opening/OpeningSuppliersCard';
import OpeningAdvancesCard from '@/components/finance/opening/OpeningAdvancesCard';
import OpeningEntriesTable from '@/components/finance/opening/OpeningEntriesTable';

const NO_ACCESS = <p className="text-sm text-muted-foreground">Posting opening balances needs journal approval permission.</p>;

export default function OpeningBalances({ company, can, branches = [] }) {
  const query = useQuery({
    queryKey: ['finance', 'openings', company.id],
    queryFn: () => financeCall({ action: 'opening_balances', company_id: company.id }),
  });
  if (query.isPending) return <p role="status" className="text-sm">Loading opening balances…</p>;
  if (query.error) return <div role="alert" className="text-sm text-destructive">{financeError(query.error)} <Button variant="outline" size="sm" onClick={() => query.refetch()}>Retry</Button></div>;
  const data = query.data, canPost = can('finance_journal_approve'), props = { company, branches, data };
  return (
    <div className="space-y-5">
      <OpeningCutoffCard data={data} />
      <Tabs defaultValue="cash">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="cash">Cash and bank</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="assets">Fixed assets</TabsTrigger>
          <TabsTrigger value="advances">Customer advances</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>
        <TabsContent value="cash">{canPost ? <OpeningCashForm key={data.cutoff} {...props} /> : NO_ACCESS}</TabsContent>
        <TabsContent value="stock">{canPost ? <OpeningStockForm key={data.cutoff} {...props} /> : NO_ACCESS}</TabsContent>
        <TabsContent value="assets">{canPost ? <OpeningAssetForm key={data.cutoff} {...props} /> : NO_ACCESS}</TabsContent>
        <TabsContent value="advances"><OpeningAdvancesCard {...props} canPost={canPost} /></TabsContent>
        <TabsContent value="suppliers"><OpeningSuppliersCard {...props} canPost={canPost} /></TabsContent>
      </Tabs>
      <OpeningEntriesTable company={company} entries={data.entries} />
    </div>
  );
}
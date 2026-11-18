import { useQuery,useMutation,useQueryClient } from '@tanstack/react-query';
import { financeCall } from '@/components/finance/financeApi';
export default function useHealthReport(company,filters){
 const qc=useQueryClient(),query=useQuery({queryKey:['finance','health',company.id,filters],queryFn:()=>financeCall({action:'health_read',company_id:company.id,...filters})});
 const action=useMutation({mutationFn:args=>financeCall({company_id:company.id,...filters,analysis_id:query.data?.analysis?.id,expected_updated_date:query.data?.analysis?.updated_date,...args}),onSuccess:()=>qc.invalidateQueries({queryKey:['finance','health']})});
 return {query,action,report:query.data?.analysis};
}
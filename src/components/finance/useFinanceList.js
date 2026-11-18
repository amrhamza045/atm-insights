import { useInfiniteQuery } from '@tanstack/react-query';
import { financeCall } from '@/components/finance/financeApi';
export default function useFinanceList(payload,enabled=true) {
 const query=useInfiniteQuery({queryKey:['finance',payload],queryFn:({pageParam})=>financeCall({...payload,cursor:pageParam}),initialPageParam:undefined,getNextPageParam:last=>last.has_more?last.next_cursor:undefined,enabled});
 return {...query,items:query.data?.pages.flatMap(p=>p.items)||[]};
}
import { useEffect } from 'react';
import { useInfiniteQuery,useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBranch } from '@/components/branches/BranchContext';
import { usePermissions,useIsAdmin } from '@/components/permissions/PermissionsContext';
import { canReviewCateringPayment } from '@/components/catering/paymentApprovalAccess';
export default function usePendingCateringPayments(eventId){
 const {selectedBranchId}=useBranch(),{permissions,currentUser}=usePermissions(),isAdmin=useIsAdmin(),cache=useQueryClient();
 const branchId=eventId?'':selectedBranchId,enabled=canReviewCateringPayment(permissions,isAdmin,branchId);
 const query=useInfiniteQuery({queryKey:['catering-payment-approvals',eventId||'',branchId||'',currentUser?.id],enabled,initialPageParam:undefined,queryFn:async({pageParam})=>{const {data}=await base44.functions.invoke('recordCateringPayment',{action:'pending',event_id:eventId,branch_id:branchId,cursor:pageParam});if(data.error)throw new Error(data.error);return data;},getNextPageParam:last=>last.has_more?last.next_cursor:undefined});
 useEffect(()=>{if(!enabled)return;return base44.entities.CateringPayment.subscribe(()=>cache.invalidateQueries({queryKey:['catering-payment-approvals']}));},[cache,enabled]);
 return {...query,enabled,items:query.data?.pages.flatMap(page=>page.items)||[],total:query.data?.pages[0]?.total||0};
}
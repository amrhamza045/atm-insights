import { financeCall } from '@/components/finance/financeApi';
export default async function financePreparedCall(payload,signal){
 let data,last=Infinity;
 for(let batch=0;batch<10;batch++){
  if(signal?.aborted)throw new DOMException('Report cancelled','AbortError');
  data=await financeCall(payload);
  if(data.ready!==false)return data;
  if(data.remaining>=last)throw new Error('Reporting preparation stopped making progress. Refresh to retry.');
  last=data.remaining;
 }
 return data;
}
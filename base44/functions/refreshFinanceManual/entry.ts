import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { refreshFinanceManual } from '../../shared/financeManual.js';

export default async function(req) {
 try {
  const base44=createClientFromRequest(req);
  const user=await base44.auth.me();
  if(!user)return Response.json({error:'Sign in required.'},{status:401});
  if(user.role!=='admin')return Response.json({error:'Administrator access required.'},{status:403});
  return Response.json(await refreshFinanceManual(base44.asServiceRole));
 }catch(error){console.error('Finance manual maintenance failed:',error.message);return Response.json({error:error.message},{status:error.status||500});}
}
import { base44 } from '@/api/base44Client';
export async function financeCall(payload) { const response=await base44.functions.invoke('financeWorkspace',payload);if(response.data?.error)throw new Error(response.data.error);return response.data; }
export const financeError = error => error?.response?.data?.error || error?.message || 'The finance action could not be completed.';
export const financeAmount = (amount,company) => new Intl.NumberFormat('en-US',{minimumFractionDigits:company?.currency_decimals??2,maximumFractionDigits:company?.currency_decimals??2}).format(Number(amount)||0);
import { base44 } from '@/api/base44Client';

export async function companiesCall(payload) {
  const response = await base44.functions.invoke('manageCompanies', payload);
  if (response.data?.error) throw new Error(response.data.error);
  return response.data;
}

export const companiesError = (error) => error?.response?.data?.error || error?.message || 'The change could not be saved.';

export const EDITIONS = [
  { value: 'fnb', label: 'F&B' },
  { value: 'central_kitchen', label: 'Central kitchen' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'pharmacy', label: 'Pharmacy' },
];
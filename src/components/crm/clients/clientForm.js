import { validateCountryPhone } from "@/lib/phoneCountries";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const clientToForm = (c) => ({
  name: c.name || "",
  client_type: c.client_type || "individual",
  phone: c.phone || "",
  email: c.email || "",
  address: c.address || "",
  status: c.status || "active",
  catering_credit_limit: String(c.catering_credit_limit ?? 0),
  notes: c.notes || "",
});

export function validateClientForm(f) {
  if (!f.name.trim()) return "Name is required";
  const phoneError = validateCountryPhone(f.phone);
  if (phoneError) return phoneError;
  if (f.email.trim() && !EMAIL.test(f.email.trim())) return "Please enter a valid email address";
  const limit = Number(f.catering_credit_limit || 0);
  if (!Number.isFinite(limit) || limit < 0) return "The credit limit can't be negative";
  return null;
}

export const formToClient = (f) => ({
  name: f.name.trim(),
  client_type: f.client_type,
  phone: f.phone.trim(),
  email: f.email.trim(),
  address: f.address.trim(),
  status: f.status,
  catering_credit_limit: Number(f.catering_credit_limit || 0),
  notes: f.notes.trim(),
});

// Every list that shows clients: the search picker, the CRM list and the duplicate check.
export function refreshClientLists(queryClient) {
  ["catering-clients", "crm-client-list", "clients"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
}
// Who receives the catering Operations & Kitchen emails: active employees whose
// department names Operations or Kitchen, with an email on file.
const isOpsOrKitchen = (department = '') =>
  ['operations', 'kitchen'].some((name) => department.toLowerCase().includes(name));

/** The event client's email: the client record's, else their portal sign-in. '' when neither. */
export async function clientEmailFor(svc, event) {
  if (!event.client_id) return '';
  const client = await svc.entities.Client.get(event.client_id).catch(() => null);
  if (client?.email?.trim()) return client.email.trim();
  const access = await svc.entities.CateringPortalAccess.filter({ client_id: event.client_id }).catch(() => []);
  return (access.find((a) => a.status !== 'revoked' && a.email?.trim())?.email || '').trim();
}

/** Filters an Employee list down to the Operations & Kitchen email recipients. */
export function opsKitchenStaff(employees) {
  return employees.filter((e) => e.status === 'active' && isOpsOrKitchen(e.department || '') && e.email?.trim());
}
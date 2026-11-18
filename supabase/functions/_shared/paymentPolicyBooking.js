// Booking a catering event. New events are created only here, so every new
// event carries the payment policy that covers its booking window.
import { companyToday, policyFields } from './paymentPolicyEvent.js';

const FIELDS = [
  'branch_id', 'branch_name', 'client_id', 'client_name', 'client_phone', 'event_name', 'event_type',
  'event_date', 'start_time', 'end_time', 'duration_hours', 'location_type', 'venue_name', 'venue_address',
  'venue_setting', 'venue_lat', 'venue_lng', 'theme', 'decoration_requirements', 'service_style', 'dress_code',
  'special_requests', 'onsite_contact_name', 'onsite_contact_phone', 'expected_guests', 'guaranteed_guests',
  'guarantee_cutoff_date', 'notes',
];
const invalid = (message) => Object.assign(new Error(message), { status: 400 });

/** Creates the event (status enquiry) with the policy for its date. A date no active policy covers is refused. */
export async function bookEvent({ svc }, input) {
  const data = Object.fromEntries(FIELDS.filter((k) => input[k] !== undefined && input[k] !== null).map((k) => [k, input[k]]));
  if (!data.branch_id) throw invalid('Catering events must belong to a branch.');
  if (!data.client_id) throw invalid('Select a client for the event.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.event_date || ''))) throw invalid('Event date is required.');
  if (!(Number(data.expected_guests) > 0)) throw invalid('Expected guest count must be greater than zero.');
  const today = await companyToday(svc);
  if (data.event_date < today) throw invalid('Event date cannot be in the past.');
  const fields = await policyFields(svc, data.event_date, today);
  const event = await svc.entities.CateringEvent.create({ ...data, ...fields, status: 'enquiry' });
  return { event };
}
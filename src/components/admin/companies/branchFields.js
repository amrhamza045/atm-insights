export const EMPTY_BRANCH = {
  name: '', branch_code: '', is_active: true, is_default: false, address: '',
  landline: '', hotline: '', whatsapp: '', website: '', location: '',
  latitude: '', longitude: '', radius_meters: 20,
  facebook: '', instagram: '', tiktok: '',
  dine_in_tax_percentage: 14, dine_in_service_percentage: 12,
  delivery_tax_percentage: 14, delivery_service_percentage: 0,
  takeaway_tax_percentage: 14, takeaway_service_percentage: 0,
  restaurant_logo_url: '', receipt_header: '', receipt_footer: '',
  commercial_registration: '', tax_card: '',
};

// [field, label, type]
export const BRANCH_SECTIONS = [
  { title: 'Contact Information', fields: [['landline', 'Landline'], ['hotline', 'Hotline'], ['whatsapp', 'WhatsApp'], ['website', 'Website'], ['location', 'Google Maps URL'], ['radius_meters', 'Attendance radius (m)', 'number'], ['latitude', 'Latitude', 'number'], ['longitude', 'Longitude', 'number']] },
  { title: 'Social Media', fields: [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['tiktok', 'TikTok']] },
  { title: 'Tax & Service Charge (%)', fields: [['dine_in_tax_percentage', 'Dine-in Tax %', 'number'], ['dine_in_service_percentage', 'Dine-in Service %', 'number'], ['delivery_tax_percentage', 'Delivery Tax %', 'number'], ['delivery_service_percentage', 'Delivery Service %', 'number'], ['takeaway_tax_percentage', 'Takeaway Tax %', 'number'], ['takeaway_service_percentage', 'Takeaway Service %', 'number']] },
  { title: 'Receipt & Branding', fields: [['restaurant_logo_url', 'Logo URL'], ['receipt_header', 'Receipt Header'], ['receipt_footer', 'Receipt Footer'], ['commercial_registration', 'Commercial Registration #'], ['tax_card', 'Tax Card #']] },
];

const NUMBER_FIELDS = BRANCH_SECTIONS.flatMap((s) => s.fields).filter((f) => f[2] === 'number').map((f) => f[0]);

// Form values → branch record (blank coordinates stay empty, blank rates become 0).
export function toBranchData(form) {
  const data = {};
  for (const key of Object.keys(EMPTY_BRANCH)) {
    const value = form[key];
    if (!NUMBER_FIELDS.includes(key)) data[key] = value ?? '';
    else if (key === 'latitude' || key === 'longitude') data[key] = value === '' || value == null ? null : Number(value);
    else if (key === 'radius_meters') data[key] = Number(value) || 20;
    else data[key] = Number(value) || 0;
  }
  return data;
}
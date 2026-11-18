// Country dial codes used by the shared phone field. Egypt is the default.
// nsn = number of digits after the dial code, ignoring a leading trunk "0".
// localDigits = how the number is normally written locally (with the leading 0), used in messages.
export const PHONE_COUNTRIES = [
  { code: "EG", name: "Egypt", dial: "+20", nsn: 10, localDigits: 11, example: "01012345678" },
  { code: "SA", name: "Saudi Arabia", dial: "+966", nsn: 9, localDigits: 10, example: "0512345678" },
  { code: "AE", name: "UAE", dial: "+971", nsn: 9, localDigits: 10, example: "0501234567" },
  { code: "KW", name: "Kuwait", dial: "+965", nsn: 8, localDigits: 8, example: "51234567" },
  { code: "QA", name: "Qatar", dial: "+974", nsn: 8, localDigits: 8, example: "33123456" },
  { code: "JO", name: "Jordan", dial: "+962", nsn: 9, localDigits: 10, example: "0791234567" },
  { code: "GB", name: "United Kingdom", dial: "+44", nsn: 10, localDigits: 11, example: "07123456789" },
  { code: "US", name: "United States", dial: "+1", nsn: 10, localDigits: 10, example: "2025550123" },
];

export const DEFAULT_COUNTRY_CODE = "EG";

export const getCountry = (code) =>
  PHONE_COUNTRIES.find((c) => c.code === code) || PHONE_COUNTRIES[0];

/** Splits a stored phone ("+201012345678") into its country and national part. */
export function parsePhone(value) {
  const raw = String(value || "").replace(/[^\d+]/g, "");
  if (raw.startsWith("+")) {
    // Longest dial code first so +1 never shadows +971
    const match = [...PHONE_COUNTRIES]
      .sort((a, b) => b.dial.length - a.dial.length)
      .find((c) => raw.startsWith(c.dial));
    if (match) return { country: match, national: raw.slice(match.dial.length) };
  }
  return { country: getCountry(DEFAULT_COUNTRY_CODE), national: raw.replace(/^\+/, "") };
}

/** Builds the stored value: dial code + national digits with the leading trunk 0 removed. */
export function composePhone(countryCode, national) {
  const country = getCountry(countryCode);
  const digits = String(national || "").replace(/\D/g, "").replace(/^0+/, "");
  return digits ? `${country.dial}${digits}` : "";
}

/**
 * Validates a stored phone value against its country's expected length.
 * Empty is valid — callers decide whether the field is required.
 */
export function validateCountryPhone(value) {
  const { country, national } = parsePhone(value);
  const digits = String(national || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return null;
  if (digits.length !== country.nsn) {
    return `${country.name} numbers must be ${country.localDigits} digits (e.g. ${country.example})`;
  }
  return null;
}
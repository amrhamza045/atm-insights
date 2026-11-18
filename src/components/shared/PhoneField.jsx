import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PHONE_COUNTRIES,
  parsePhone,
  composePhone,
  validateCountryPhone
} from "@/lib/phoneCountries";

/**
 * Country-code + national number entry. Stores the value in international form
 * ("+201012345678") and enforces the country's expected digit length.
 */
export default function PhoneField({ value, onChange, label = "Phone", required = false, id = "phone" }) {
  const parsed = parsePhone(value);
  const [countryCode, setCountryCode] = useState(parsed.country.code);
  const [national, setNational] = useState(parsed.national);

  const error = validateCountryPhone(composePhone(countryCode, national));
  const country = PHONE_COUNTRIES.find(c => c.code === countryCode) || PHONE_COUNTRIES[0];

  const emit = (code, digits) => {
    setCountryCode(code);
    setNational(digits);
    onChange(composePhone(code, digits));
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}{required ? " *" : ""}</Label>
      <div className="flex gap-2">
        <Select value={countryCode} onValueChange={(code) => emit(code, national)}>
          <SelectTrigger className="w-[7.5rem] flex-shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PHONE_COUNTRIES.map(c => (
              <SelectItem key={c.code} value={c.code}>
                {c.dial} {c.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          value={national}
          onChange={(e) => emit(countryCode, e.target.value.replace(/\D/g, "").slice(0, country.nsn + 1))}
          placeholder={country.example}
          className={error ? "border-red-400 focus-visible:ring-red-400" : ""}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
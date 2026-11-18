import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { setTimezoneOffset } from "@/components/utils/timezoneHelper";

export default function TimezoneLoader() {
  const { data: settings } = useQuery({
    queryKey: ["timezoneSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "timezone_settings" });
      return result[0] || null;
    }
  });

  useEffect(() => {
    // Database is the single source of truth.
    // localStorage is only a runtime cache so timezoneHelper can read synchronously.
    // On every page load, we overwrite localStorage with the DB value.
    if (settings?.timezone_offset_minutes != null) {
      setTimezoneOffset(settings.timezone_offset_minutes);
    }
  }, [settings]);

  return null;
}
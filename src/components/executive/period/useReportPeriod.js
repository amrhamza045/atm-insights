import { useLocation, useNavigate } from "react-router-dom";
import { PERIODS, COMPARISONS, DEFAULT_PERIOD, DEFAULT_COMPARE } from "./reportPeriod";

// The dashboard's period and comparison live in the address (?period=&compare=),
// so they survive a refresh and switching reports, and a shared link keeps them.
export default function useReportPeriod() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const pick = (key, list, fallback) => (list.some((o) => o.value === params.get(key)) ? params.get(key) : fallback);

  const update = (key, value, fallback) => {
    const next = new URLSearchParams(location.search);
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    const query = next.toString();
    navigate(`${location.pathname}${query ? `?${query}` : ""}`, { replace: true });
  };

  return {
    period: pick("period", PERIODS, DEFAULT_PERIOD),
    compare: pick("compare", COMPARISONS, DEFAULT_COMPARE),
    setPeriod: (value) => update("period", value, DEFAULT_PERIOD),
    setCompare: (value) => update("compare", value, DEFAULT_COMPARE),
  };
}
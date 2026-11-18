import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { setPath } from "@/lib/pathTrail";

// Reports the path of the page's current location to the navigation bar.
export default function useTrailPath(segments) {
  const location = useLocation();
  const key = JSON.stringify(segments);
  useEffect(() => {
    if (segments.length) setPath(location.pathname + location.search, segments);
  }, [key, location.key]);
}
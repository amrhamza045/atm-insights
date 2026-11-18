import { useEffect, useRef, useState } from "react";

export function usePullToRefresh(onRefresh, enabled = true) {
  const [isPulling, setIsPulling] = useState(false);
  const startYRef = useRef(0);
  const pullDistanceRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e) => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop === 0 && startYRef.current > 0) {
        pullDistanceRef.current = e.touches[0].clientY - startYRef.current;
        if (pullDistanceRef.current > 0) {
          e.preventDefault();
          setIsPulling(true);
        }
      }
    };

    const handleTouchEnd = async () => {
      if (isPulling && pullDistanceRef.current > 60) {
        try {
          await onRefresh();
        } catch (error) {
          console.error("Pull to refresh error:", error);
        }
      }
      setIsPulling(false);
      startYRef.current = 0;
      pullDistanceRef.current = 0;
    };

    document.addEventListener("touchstart", handleTouchStart, false);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, false);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, isPulling, onRefresh]);

  return { isPulling, pullDistance: pullDistanceRef.current };
}
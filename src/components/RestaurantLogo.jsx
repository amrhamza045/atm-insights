import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function RestaurantLogo({ className = "h-10" }) {
  const { data: restaurantInfo } = useQuery({
    queryKey: ["restaurantInfo"],
    queryFn: async () => {
      try {
        const info = await base44.entities.RestaurantInfo.list();
        return info[0] || null;
      } catch {
        return null;
      }
    },
  });

  if (!restaurantInfo?.logo_url) {
    return (
      <div
        role="img"
        aria-label="Restaurant"
        className={`${className} aspect-square rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-semibold`}
      >
        R
      </div>
    );
  }

  return (
    <img
      src={restaurantInfo.logo_url}
      alt={restaurantInfo.brand_name || "Restaurant Logo"}
      className={`${className} w-auto object-contain`}
    />
  );
}
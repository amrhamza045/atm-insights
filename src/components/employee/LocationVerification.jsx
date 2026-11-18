import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

export default function LocationVerification({ restaurantLocation, maxRadius = 20, onLocationVerified, locationLabel = "the restaurant" }) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null);
  const [distance, setDistance] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const verifyLocation = async () => {
    if (!restaurantLocation?.latitude || !restaurantLocation?.longitude) {
      toast.error("Check-in location not configured");
      return;
    }

    setIsVerifying(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;
      setUserLocation({ lat: userLat, lon: userLon });

      const dist = calculateDistance(
        restaurantLocation.latitude,
        restaurantLocation.longitude,
        userLat,
        userLon
      );

      setDistance(dist);

      if (dist <= maxRadius) {
        setLocationStatus("verified");
        onLocationVerified({
          verified: true,
          latitude: userLat,
          longitude: userLon,
          distance: dist
        });
        toast.success(`Location verified (${dist.toFixed(1)}m away)`);
      } else {
        setLocationStatus("failed");
        onLocationVerified({
          verified: false,
          distance: dist
        });
        toast.error(`You are ${dist.toFixed(1)}m away (max: ${maxRadius}m)`);
      }
    } catch (error) {
      toast.error("Could not access your location");
      setLocationStatus("error");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-3">
      {locationStatus === "verified" ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div className="text-sm">
              <p className="font-semibold text-green-700">Location verified</p>
              <p className="text-green-600 text-xs">{distance?.toFixed(1)}m from {locationLabel}</p>
            </div>
          </div>
        </div>
      ) : locationStatus === "failed" ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div className="text-sm">
              <p className="font-semibold text-red-700">Location not verified</p>
              <p className="text-red-600 text-xs">{distance?.toFixed(1)}m from {locationLabel} (max {maxRadius}m)</p>
            </div>
          </div>
        </div>
      ) : (
        <Button 
          onClick={verifyLocation} 
          disabled={isVerifying}
          className="w-full gap-2"
          variant="outline"
        >
          <MapPin className="w-4 h-4" />
          {isVerifying ? "Verifying..." : `Verify I'm at ${locationLabel}`}
        </Button>
      )}
    </div>
  );
}
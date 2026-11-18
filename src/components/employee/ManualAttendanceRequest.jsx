import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MapPin } from "lucide-react";

export default function ManualAttendanceRequest({ blockedReason, onSuccess }) {
  const [note, setNote] = useState("");
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const request = useMutation({
    mutationFn: async () => {
      try {
        const response = await base44.functions.invoke("requestManualAttendance", {
          action: "request",
          note,
          latitude: location?.latitude,
          longitude: location?.longitude,
        });
        return response.data;
      } catch (error) {
        throw new Error(error.response?.data?.error || error.message);
      }
    },
    onSuccess: () => { setNote(""); onSuccess(); },
  });

  const captureLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) return setLocationError("Location is unavailable on this device. You may still submit without it.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setLocation({ latitude: coords.latitude, longitude: coords.longitude }),
      () => setLocationError("Location could not be captured. You may still submit without it."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Request check-in without face verification. HR must confirm your presence before you are signed in.</p>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for HR" maxLength={1000} />
      <Button type="button" variant="outline" onClick={captureLocation} className="gap-2">
        <MapPin className="w-4 h-4" /> {location ? "Location attached" : "Attach location (optional)"}
      </Button>
      {locationError && <p className="text-sm text-amber-700">{locationError}</p>}
      {request.error && <p className="text-sm text-red-600">{request.error.message}</p>}
      {blockedReason && <p className="text-sm text-amber-700">{blockedReason}</p>}
      <Button className="w-full" size="lg" disabled={!!blockedReason || request.isPending} onClick={() => request.mutate()}>
        {request.isPending ? "Submitting..." : "Request Check-in"}
      </Button>
    </div>
  );
}
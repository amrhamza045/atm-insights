import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Map } from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useBranch } from "@/components/branches/BranchContext";

const MapSelector = ({ latitude, longitude, onLocationSelect }) => {
  const MapClick = () => {
    useMapEvents({
      click: (e) => {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
        toast.success("Location selected from map");
      }
    });
    return null;
  };

  const markerIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const lat = latitude ? parseFloat(latitude) : 30.0444;
  const lng = longitude ? parseFloat(longitude) : 31.2357;

  return (
    <MapContainer center={[lat, lng]} zoom={15} style={{ height: "400px", width: "100%" }} className="rounded-lg">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapClick />
      {latitude && longitude && (
        <Marker position={[lat, lng]} icon={markerIcon} />
      )}
    </MapContainer>
  );
};

// Clock-in pin of the branch picked in the header. It is kept on the branch
// itself: the same latitude, longitude and attendance radius as the branch details.
export default function RestaurantLocationSettings() {
  const { selectedBranch } = useBranch();
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("20");
  const [showMap, setShowMap] = useState(false);

  const queryClient = useQueryClient();

  // Show the picked branch's pin, and reload it when the branch changes.
  useEffect(() => {
    setLatitude(selectedBranch?.latitude?.toString() || "");
    setLongitude(selectedBranch?.longitude?.toString() || "");
    setRadius(selectedBranch?.radius_meters?.toString() || "20");
  }, [selectedBranch?.id, selectedBranch?.latitude, selectedBranch?.longitude, selectedBranch?.radius_meters]);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Branch.update(selectedBranch.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceBranchPin"] });
      toast.success(`Location saved for ${selectedBranch.name}`);
    },
    onError: (e) => toast.error(e?.message || "Could not save the location")
  });

  const getCurrentLocation = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });
      setLatitude(position.coords.latitude.toString());
      setLongitude(position.coords.longitude.toString());
      toast.success("Current location retrieved");
    } catch (error) {
      toast.error("Could not get your location");
    }
  };

  const handleSave = () => {
    if (!latitude || !longitude) {
      toast.error("Please enter latitude and longitude");
      return;
    }

    saveMutation.mutate({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius_meters: parseInt(radius) || 20
    });
  };

  if (!selectedBranch) {
    return <Card className="p-8 text-center text-slate-500">Select a branch at the top to set its location.</Card>;
  }

  const hasPin = selectedBranch.latitude != null && selectedBranch.longitude != null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Restaurant Location · {selectedBranch.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Latitude</Label>
            <Input 
              type="number" 
              step="0.000001"
              value={latitude} 
              onChange={(e) => setLatitude(e.target.value)} 
              placeholder="40.7128"
            />
          </div>
          <div>
            <Label>Longitude</Label>
            <Input 
              type="number" 
              step="0.000001"
              value={longitude} 
              onChange={(e) => setLongitude(e.target.value)} 
              placeholder="-74.0060"
            />
          </div>
        </div>

        <div>
          <Label>Allowed Radius (meters)</Label>
          <Input 
            type="number" 
            value={radius} 
            onChange={(e) => setRadius(e.target.value)} 
            placeholder="20"
          />
          <p className="text-xs text-slate-500 mt-1">Employees of {selectedBranch.name} must be within this distance to sign in/out</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={getCurrentLocation} className="flex-1">
            Use Current Location
          </Button>
          <Button variant="outline" onClick={() => setShowMap(!showMap)} className="flex-1 gap-2">
            <Map className="w-4 h-4" />
            {showMap ? "Hide Map" : "Select on Map"}
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="flex-1">
            {saveMutation.isPending ? "Saving..." : "Save Location"}
          </Button>
        </div>

        {showMap && (
          <div className="border rounded-lg overflow-hidden">
            <MapSelector 
              latitude={latitude} 
              longitude={longitude}
              onLocationSelect={(lat, lng) => {
                setLatitude(lat.toString());
                setLongitude(lng.toString());
              }}
            />
            <p className="text-xs text-slate-500 p-3 bg-slate-50">Click on the map to select the branch location</p>
          </div>
        )}

        {hasPin ? (
          <div className="p-3 bg-slate-100 rounded-lg text-sm">
            <p className="text-slate-600">Current Location</p>
            <p className="font-mono text-xs">{selectedBranch.latitude}, {selectedBranch.longitude}</p>
            <p className="text-slate-600 text-xs mt-1">Radius: {selectedBranch.radius_meters || 20}m</p>
          </div>
        ) : (
          <p className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            {selectedBranch.name} has no location yet, so its employees can't clock in by location.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
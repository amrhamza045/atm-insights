import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Phone, MapPin, Loader2, UserPlus, Navigation } from "lucide-react";
import { toast } from "sonner";

export default function ProfileCompletionModal({ client, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    phone: client?.phone || "",
    address: client?.address || "",
    location_lat: client?.location_lat ?? null,
    location_lng: client?.location_lng ?? null,
  });
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Client.update(client.id, {
        phone: formData.phone,
        address: formData.address,
        location_lat: formData.location_lat || undefined,
        location_lng: formData.location_lng || undefined,
        onboarding_completed: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Profile completed! 🎉");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to save your details. Please try again.");
    },
  });

  const captureLocation = () => {
    setIsCapturingLocation(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your device");
      setIsCapturingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          location_lat: position.coords.latitude,
          location_lng: position.coords.longitude,
        }));
        toast.success("Location captured!");
        setIsCapturingLocation(false);
      },
      (error) => {
        toast.error("Could not capture location: " + error.message);
        setIsCapturingLocation(false);
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.phone.trim()) {
      toast.error("Please enter your mobile number");
      return;
    }
    if (!formData.address.trim()) {
      toast.error("Please enter your delivery address");
      return;
    }
    updateMutation.mutate();
  };

  const locationText =
    formData.location_lat != null
      ? `${formData.location_lat.toFixed(6)}, ${formData.location_lng?.toFixed(6)}`
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-100 p-3 rounded-full">
              <UserPlus className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Complete Your Profile</DialogTitle>
              <DialogDescription>
                Help us serve you better — unlock delivery and rewards.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">
              <Phone className="w-3 h-3 inline mr-1" />
              Mobile Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="01XXXXXXXXX"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              <MapPin className="w-3 h-3 inline mr-1" />
              Delivery Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street, building, area..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Location (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={locationText}
                readOnly
                placeholder="No location captured"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={captureLocation}
                disabled={isCapturingLocation}
              >
                {isCapturingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save & Continue"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
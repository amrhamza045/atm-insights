import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import RestaurantLogo from "@/components/RestaurantLogo";
import { usePermissions } from "@/components/permissions/PermissionsContext";

export default function Register() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    location_lat: null,
    location_lng: null
  });

  // If user is already logged in (e.g. via Facebook), pre-fill their details
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null)
  });

  // Pre-fill form from logged-in user (e.g. Google account)
  useEffect(() => {
    if (currentUser && (!formData.full_name || !formData.email)) {
      setFormData(prev => ({
        ...prev,
        full_name: prev.full_name || currentUser.full_name || "",
        email: prev.email || currentUser.email || ""
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Check if user already has a Client record — redirect if so
  const { data: existingClient } = useQuery({
    queryKey: ["existingClient", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const clients = await base44.entities.Client.filter({ email: currentUser.email });
      return clients[0] || null;
    },
    enabled: !!currentUser?.email
  });

  useEffect(() => {
    if (existingClient) {
      navigate("/ReferralTree", { replace: true });
    }
  }, [existingClient, navigate]);

  // Admins and staff accounts don't need a customer profile — skip registration.
  const { permissions } = usePermissions();
  const isStaff = currentUser?.role === "admin" || (permissions?.role && permissions.role !== "view_only");
  useEffect(() => {
    if (isStaff) navigate("/", { replace: true });
  }, [isStaff, navigate]);
  const [selectedLevel, setSelectedLevel] = useState(null);

  const { data: restaurantInfo } = useQuery({
    queryKey: ["restaurantInfo"],
    queryFn: async () => {
      const info = await base44.entities.RestaurantInfo.list();
      return info[0] || null;
    }
  });
  const brandName = restaurantInfo?.brand_name || "";

  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  const captureLocation = () => {
    setIsCapturingLocation(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your device");
      setIsCapturingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          location_lat: position.coords.latitude,
          location_lng: position.coords.longitude
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

  const { data: registrationLevels = [] } = useQuery({
    queryKey: ["registrationLevels"],
    queryFn: () => base44.entities.RegistrationLevel.list("sort_order")
  });

  // Auto-select first active level (Entry level) by default
  useEffect(() => {
    if (registrationLevels.length > 0 && !selectedLevel) {
      const defaultLevel = registrationLevels.find(l => l.is_active) || registrationLevels[0];
      setSelectedLevel(defaultLevel);
    }
  }, [registrationLevels]);

  // Created on the server: it uses this account's email and sets the balances, referral code and
  // referrer (the admin's Default Root Client, when set) itself.
  const createClientMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke("registerClient", {
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address,
        location_lat: formData.location_lat,
        location_lng: formData.location_lng,
        registration_level_id: selectedLevel.id
      }).catch((e) => { throw new Error(e.response?.data?.error || e.message); });

      // Welcome email: built and sent on the server (Admin › Email decides if it goes and who gets a copy)
      await base44.functions.invoke("sendAccountEmail", { type: "welcome", client_id: data.client_id })
        .catch((e) => console.log("Welcome email could not be sent:", e));

      return { referralCode: data.referral_code, referrerId: data.referrer_id };
    },
    onSuccess: (result) => {
      // Meta Pixel conversion — fires only after the Client record was created successfully
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "CompleteRegistration");
      }
      base44.analytics.track({
        eventName: "client_registered",
        properties: {
          client_name: formData.full_name,
          referral_code: result.referralCode,
          referrer_id: result.referrerId,
          registration_level: selectedLevel.level_name
        }
      });
      queryClient.invalidateQueries({ queryKey: ["existingClient"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      toast.success(`Welcome to ${brandName} GenMo! Redirecting...`);
      setTimeout(() => navigate("/MyProfile"), 1500);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to complete registration");
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedLevel) {
      toast.error("Please select a registration level");
      return;
    }

    await createClientMutation.mutateAsync();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <RestaurantLogo className="h-20 w-auto object-contain mx-auto mb-4" />
          <CardTitle className="text-2xl">Complete Your Registration</CardTitle>
          <CardDescription>
            Just a few details to join {brandName} GenMo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            {/* Email auto-filled from Google account — not editable */}
            {formData.email && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                <span className="font-medium">Email: </span>{formData.email}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Your delivery address"
              />
            </div>

            <div className="space-y-2">
              <Label>Location (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.location_lat != null ? `${formData.location_lat.toFixed(6)}, ${formData.location_lng?.toFixed(6)}` : ""}
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
                  {isCapturingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600"
              disabled={createClientMutation.isPending || !selectedLevel}
            >
              {createClientMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Join {brandName} GenMo
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
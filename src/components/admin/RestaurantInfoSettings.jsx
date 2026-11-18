import { useState, useEffect } from "react";
import { brandName } from "@/lib/brandName";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Info, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RestaurantInfoSettings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    website: "",
    email: "",
    phone: "",
    whatsapp: "",
    landline: "",
    hotline: "",
    location: "",
    facebook: "",
    instagram: "",
    tiktok: "",
    address: "",
    partnership_marketing_text: "",
    guest_loyalty_program_text: ""
  });

  const { data: info } = useQuery({
    queryKey: ["restaurantInfo"],
    queryFn: async () => {
      const list = await base44.entities.RestaurantInfo.list();
      return list[0] || null;
    }
  });

  useEffect(() => {
    if (info) {
      setFormData({
        website: info.website || "",
        email: info.email || "",
        phone: info.phone || "",
        whatsapp: info.whatsapp || "",
        landline: info.landline || "",
        hotline: info.hotline || "",
        location: info.location || "",
        facebook: info.facebook || "",
        instagram: info.instagram || "",
        tiktok: info.tiktok || "",
        address: info.address || "",
        partnership_marketing_text: info.partnership_marketing_text || "",
        guest_loyalty_program_text: info.guest_loyalty_program_text || ""
      });
    }
  }, [info]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (info?.id) {
        return await base44.entities.RestaurantInfo.update(info.id, data);
      } else {
        return await base44.entities.RestaurantInfo.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["restaurantInfo"]);
      toast.success("Restaurant information updated successfully!");
    }
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          Restaurant Information
        </CardTitle>
        <CardDescription>
          Manage contact details and social media links displayed to clients
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Website</Label>
            <Input
              placeholder="https://yourwebsite.com"
              value={formData.website}
              onChange={(e) => setFormData({...formData, website: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">WhatsApp Number</Label>
            <Input
              placeholder="+1234567890"
              value={formData.whatsapp}
              onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              placeholder="hello@yourbrand.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Phone Number</Label>
            <Input
              placeholder="+1234567890"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Landline Number</Label>
            <Input
              placeholder="+1234567890"
              value={formData.landline}
              onChange={(e) => setFormData({...formData, landline: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Hotline Number</Label>
            <Input
              placeholder="+1234567890"
              value={formData.hotline}
              onChange={(e) => setFormData({...formData, hotline: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Facebook</Label>
            <Input
              placeholder="https://facebook.com/yourbrand"
              value={formData.facebook}
              onChange={(e) => setFormData({...formData, facebook: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Instagram</Label>
            <Input
              placeholder="https://instagram.com/yourbrand"
              value={formData.instagram}
              onChange={(e) => setFormData({...formData, instagram: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">TikTok</Label>
            <Input
              placeholder="https://tiktok.com/@yourbrand"
              value={formData.tiktok}
              onChange={(e) => setFormData({...formData, tiktok: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Location (Map URL)</Label>
            <Input
              placeholder="https://maps.google.com/..."
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs">Address</Label>
          <Textarea
            placeholder="123 Main Street, City, Country"
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Partnership Program Marketing Text</Label>
          <Textarea
            placeholder="Join our Partner Program and start earning rewards! Refer friends, earn cashback on their purchases, and unlock exclusive benefits..."
            value={formData.partnership_marketing_text}
            onChange={(e) => setFormData({...formData, partnership_marketing_text: e.target.value})}
            rows={6}
          />
          <p className="text-xs text-slate-500">This text will be displayed in the "Be {brandName()} Partner" tab on client profiles</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Guest Loyalty Program Text (Menu Page)</Label>
          <Textarea
            placeholder="Earn rewards with every purchase! Register now to start earning cashback, get exclusive discounts, and enjoy special member benefits."
            value={formData.guest_loyalty_program_text}
            onChange={(e) => setFormData({...formData, guest_loyalty_program_text: e.target.value})}
            rows={4}
          />
          <p className="text-xs text-slate-500">This text will be displayed to unregistered users in the Menu page</p>
        </div>

        <Button 
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />
          Save Restaurant Information
        </Button>
      </CardContent>
    </Card>
  );
}
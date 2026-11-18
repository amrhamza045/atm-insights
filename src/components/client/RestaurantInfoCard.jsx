import { useQuery } from "@tanstack/react-query";
import { brandName } from "@/lib/brandName";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Phone, MapPin, Facebook, Instagram, MessageCircle } from "lucide-react";

export default function RestaurantInfoCard() {
  const { data: info } = useQuery({
    queryKey: ["restaurantInfo"],
    queryFn: async () => {
      const list = await base44.entities.RestaurantInfo.list();
      return list[0] || null;
    }
  });

  if (!info) return null;

  const InfoItem = ({ icon: Icon, label, value, href }) => {
    if (!value) return null;
    
    const content = (
      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
        </div>
      </div>
    );

    if (href) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      );
    }
    return content;
  };

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          Contact {brandName()}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        <InfoItem 
          icon={Globe} 
          label="Website" 
          value={info.website} 
          href={info.website}
        />
        <InfoItem 
          icon={MessageCircle} 
          label="WhatsApp" 
          value={info.whatsapp} 
          href={info.whatsapp ? `https://wa.me/${info.whatsapp.replace(/[^0-9]/g, '')}` : null}
        />
        <InfoItem 
          icon={Phone} 
          label="Landline" 
          value={info.landline}
          href={info.landline ? `tel:${info.landline}` : null}
        />
        <InfoItem 
          icon={Phone} 
          label="Hotline" 
          value={info.hotline}
          href={info.hotline ? `tel:${info.hotline}` : null}
        />
        <InfoItem 
          icon={MapPin} 
          label="Location" 
          value={info.address}
          href={info.location}
        />
        <InfoItem 
          icon={Facebook} 
          label="Facebook" 
          value={info.facebook?.replace('https://facebook.com/', '@')} 
          href={info.facebook}
        />
        <InfoItem 
          icon={Instagram} 
          label="Instagram" 
          value={info.instagram?.replace('https://instagram.com/', '@')} 
          href={info.instagram}
        />
        <InfoItem 
          icon={MessageCircle} 
          label="TikTok" 
          value={info.tiktok?.replace('https://tiktok.com/', '')} 
          href={info.tiktok}
        />
      </CardContent>
    </Card>
  );
}
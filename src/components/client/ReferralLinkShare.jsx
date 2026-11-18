import { useState } from "react";
import { brandName } from "@/lib/brandName";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Share2, Send } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "../../utils";

export default function ReferralLinkShare({ referralCode, clientName }) {
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}${createPageUrl("Register")}?ref=${referralCode}`;

  const shareText = `Join me on ${brandName()} GenMo! Use my referral link to sign up and earn rewards together:\n\n${referralLink}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied!");
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${brandName()} GenMo!`,
          text: shareText,
          url: referralLink,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      handleCopyLink();
      toast.info("Share not supported on this device. Link copied instead!");
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Your Referral Link</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-slate-100 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Share this link with friends</p>
          <p className="text-sm font-mono font-medium text-slate-900 break-all">
            {referralLink}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={handleCopyLink}
            variant={copied ? "default" : "outline"}
            className={copied ? "bg-green-500 hover:bg-green-600" : ""}
          >
            {copied ? (
              <Check className="w-4 h-4 mr-1" />
            ) : (
              <Copy className="w-4 h-4 mr-1" />
            )}
            <span className="text-xs">{copied ? "Copied" : "Copy Link"}</span>
          </Button>

          <Button
            onClick={handleWhatsAppShare}
            variant="outline"
            className="bg-green-50 hover:bg-green-100 border-green-200"
          >
            <Send className="w-4 h-4 mr-1 text-green-600" />
            <span className="text-xs text-green-700">WhatsApp</span>
          </Button>

          <Button
            onClick={handleNativeShare}
            variant="outline"
          >
            <Share2 className="w-4 h-4 mr-1" />
            <span className="text-xs">Share</span>
          </Button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-slate-500">Or share just the code:</span>
          <Button onClick={handleCopyCode} variant="ghost" size="sm" className="text-xs">
            <Copy className="w-3 h-3 mr-1" />
            {referralCode}
          </Button>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Share with friends to earn cashback when they register and make purchases
        </p>
      </CardContent>
    </Card>
  );
}
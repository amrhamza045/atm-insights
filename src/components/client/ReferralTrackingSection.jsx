import { useState, useMemo } from "react";
import { brandName } from "@/lib/brandName";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Share2, Mail, MessageCircle, Users, TrendingUp, PoundSterling } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function ReferralTrackingSection({ client, clients, cashbackTransactions = [] }) {
  const [copiedCode, setCopiedCode] = useState(false);

  // Calculate successful referrals (active clients)
  const successfulReferrals = useMemo(() => 
    clients.filter(c => c.referred_by === client?.id && c.status === "active"),
    [clients, client]
  );

  // Calculate total cashback earned from referrals
  const totalReferralCashback = useMemo(() => {
    return cashbackTransactions
      .filter(t => t.transaction_type === "referral_cashback" && t.referrer_id === client?.id)
      .reduce((sum, t) => sum + (t.cashback_amount || 0), 0);
  }, [cashbackTransactions, client]);

  const handleCopyCode = () => {
    if (client?.referral_code) {
      navigator.clipboard.writeText(client.referral_code);
      setCopiedCode(true);
      toast.success("Referral code copied to clipboard!");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent("Join GenMo Loyalty Program!");
    const body = encodeURIComponent(
      `Hey! I'm inviting you to join GenMo - an amazing loyalty program where you can earn cashback on purchases and referrals.\n\nUse my referral code: ${client?.referral_code}\n\nSign up now and start earning!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `🎉 Join me on GenMo and earn cashback!\n\nUse my referral code: *${client?.referral_code}*\n\nStart earning rewards today! 💰`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareViaTwitter = () => {
    const text = encodeURIComponent(
      `Join GenMo loyalty program with my referral code: ${client?.referral_code} and start earning cashback! 🎉`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const shareViaFacebook = () => {
    const url = encodeURIComponent(window.location.origin);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=Join%20GenMo%20with%20code%20${client?.referral_code}`,
      "_blank"
    );
  };

  if (!client || !client.referral_code) return null;

  return (
    <div className="space-y-6">
      {/* Main Referral Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Share2 className="w-5 h-5" />
            Your Referral Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Referral Code Display */}
          <div className="bg-white rounded-xl p-6 text-center border-2 border-amber-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-2 font-medium">Share this code with friends</p>
            <p className="text-4xl font-bold font-mono tracking-wider text-amber-900 mb-1">
              {client.referral_code}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Earn cashback when they register and make purchases
            </p>
          </div>

          {/* Copy Button */}
          <Button 
            onClick={handleCopyCode}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-md"
            size="lg"
          >
            {copiedCode ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 mr-2" />
                Copy Referral Code
              </>
            )}
          </Button>

          {/* Share Buttons */}
          <div>
            <p className="text-sm text-slate-600 mb-3 font-medium">Share via:</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={shareViaWhatsApp}
                className="flex items-center gap-2 hover:bg-green-50 hover:border-green-300"
              >
                <MessageCircle className="w-4 h-4 text-green-600" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={shareViaEmail}
                className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
              >
                <Mail className="w-4 h-4 text-blue-600" />
                Email
              </Button>
              <Button
                variant="outline"
                onClick={shareViaTwitter}
                className="flex items-center gap-2 hover:bg-sky-50 hover:border-sky-300"
              >
                <svg className="w-4 h-4" fill="#1DA1F2" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                </svg>
                Twitter
              </Button>
              <Button
                variant="outline"
                onClick={shareViaFacebook}
                className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
              >
                <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Successful Referrals
            </CardTitle>
            <Users className="w-4 h-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {successfulReferrals.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active registered clients
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Referral Cashback
            </CardTitle>
            <PoundSterling className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {formatCurrency(totalReferralCashback)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Total earned from referrals
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Conversion Rate
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {successfulReferrals.length > 0 ? "100%" : "0%"}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Registration success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referred Users List */}
      {successfulReferrals.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Referrals ({successfulReferrals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {successfulReferrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {referral.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{referral.name}</p>
                      <p className="text-xs text-slate-500">
                        Joined {new Date(referral.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partnership Program Info */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
        <CardContent className="p-6 space-y-4">
          <h3 className="text-2xl font-bold text-amber-900 mb-4">🤝 GenMo</h3>
          
          <div className="space-y-3 text-slate-700">
            <p className="text-lg font-semibold">مش بس عميل… ده مكسب مع كل طلب</p>
            
            <p>برنامج GenMo معمول عشان تاكل وتنبسط… وفي نفس الوقت تكسب فلوس وكاش باك من طلباتك ومن دايرتك.</p>
            
            <p className="text-xl font-bold text-amber-600">يعني ببساطة: 🍽️ كُل – استمتع – اكسب</p>
          </div>

          <div className="bg-white rounded-lg p-4 space-y-3">
            <div>
              <p className="font-bold text-lg mb-2">🎁 هدية البداية</p>
              <p className="text-sm">أول ما تشترك تاخد <span className="font-bold text-green-600">100 جنيه كاش باك</span> هدية ترحيب يتضافوا فورًا على حسابك.</p>
            </div>

            <div>
              <p className="font-bold text-lg mb-2">🍕 اكسب من طلباتك الشخصية</p>
              <p className="text-sm">أي طلب تعمله من {brandName()} تاخد عليه <span className="font-bold text-green-600">15% كاش باك</span></p>
            </div>

            <div>
              <p className="font-bold text-lg mb-2">🤝 اعزم صحابك وكبّر مكسبك</p>
              <p className="text-sm mb-2">شارك كودك مع صحابك وأهلك وكل ما يطلبوا… إنت تكسب نسبة من طلباتهم.</p>
              <div className="space-y-1 text-xs">
                <p>• من 1 لـ 5 أشخاص → <span className="font-semibold">5% كاش باك</span> 🥈 Bronze</p>
                <p>• من 6 لـ 10 → <span className="font-semibold">7% كاش باك</span> 🥇 Silver <span className="text-green-600">(+500 EGP Bonus Cash)</span></p>
                <p>• من 11 لـ 20 → <span className="font-semibold">10% كاش باك</span> ⭐ Gold <span className="text-green-600">(+1000 EGP Bonus Cash)</span></p>
                <p>• 21+ شخص → <span className="font-semibold">15% كاش باك</span> 👑 Outstanding <span className="text-green-600">(+2000 EGP Bonus Cash)</span></p>
                <p>• 30+ شخص → <span className="font-semibold">15% كاش باك</span> 👑 Superior <span className="text-green-600">(+3000 EGP Bonus Cash)</span></p>
              </div>
              <p className="text-sm mt-2 font-medium">وكل مستوى جديد = بونص كاش زيادة</p>
            </div>

            <div>
              <p className="font-bold text-lg mb-2">🌐 مش بس صحابك… صحاب صحابك كمان!</p>
              <p className="text-sm mb-2">الموضوع مش بيقف عند اللي دعيتهم بس:</p>
              <div className="space-y-1 text-xs">
                <p>• تاخد <span className="font-semibold">2%</span> من الناس اللي هما دعوهم (Level 2)</p>
                <p>• وكمان <span className="font-semibold">1%</span> من اللي بعدهم (Level 3)</p>
              </div>
              <p className="text-sm mt-2">يعني شبكتك كلها بتكسبك… وإنت قاعد مكانك 😉</p>
            </div>

            <div>
              <p className="font-bold text-lg mb-2">💰 الكاش باك بتستلمه إزاي؟</p>
              <p className="text-sm mb-2">أي كاش باك تكسبه بيتقسم:</p>
              <div className="space-y-1 text-xs">
                <p>• <span className="font-semibold">50% فلوس كاش</span> في إيدك</p>
                <p>• <span className="font-semibold">50% رصيد</span> تستخدمه في {brandName()}</p>
                <p className="text-slate-600">(أكل في المطعم – دليفري – تيك أواي)</p>
              </div>
              <p className="text-sm mt-2 font-bold text-amber-700">مكسب حقيقي + أكل ببلاش 😎</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
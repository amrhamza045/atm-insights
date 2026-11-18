import { brandName } from "@/lib/brandName";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Gift, LogIn, Star, Clock, UtensilsCrossed } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";

export default function GuestMenuHero({ restaurantInfo }) {
  return (
    <div className="mb-8 space-y-6">
      {/* Main Hero Banner */}
      <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 text-white">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <UtensilsCrossed className="w-5 h-5" />
                <span className="text-white/80 text-sm font-medium tracking-wide uppercase">{restaurantInfo?.brand_name}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">
                ألذ الأكلات<br />
                <span className="text-amber-200">في قلب القاهرة الجديدة</span>
              </h1>
              <p className="text-white/90 text-sm sm:text-base mb-4 max-w-lg">
                اطلب أونلاين أو كلمنا على الرقم و هنوصلك لغاية باب بيتك في الرحاب و التجمع
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-white text-amber-700 hover:bg-amber-50 font-bold shadow-lg">
                  <a href="tel:01099003309">
                    <Phone className="w-4 h-4 mr-2" />
                    01099003309
                  </a>
                </Button>
                <Button asChild size="lg" className="bg-white text-amber-700 hover:bg-amber-50 font-bold shadow-lg">
                  <a href="tel:0226948272">
                    <Phone className="w-4 h-4 mr-2" />
                    02-26948272
                  </a>
                </Button>
              </div>
            </div>
            <div className="hidden lg:block flex-shrink-0">
              <div className="w-48 h-48 rounded-2xl bg-white/10 backdrop-blur-sm p-4 flex flex-col items-center justify-center text-center border border-white/20">
                <Star className="w-8 h-8 text-amber-300 mb-2 fill-amber-300" />
                <p className="text-2xl font-bold">4.8</p>
                <p className="text-sm text-white/80 mb-3">Google Rating</p>
                <div className="flex gap-1 mb-2">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-3 h-3 fill-amber-300 text-amber-300" />
                  ))}
                </div>
                <p className="text-xs text-white/70">+500 تقييم</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Info Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Delivery Areas */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-green-900 mb-1">مناطق التوصيل</h3>
                <p className="text-sm text-green-700 leading-relaxed">
                  الرحاب، التجمع الأول، التجمع الخامس، القاهرة الجديدة و المناطق المجاورة
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 mb-1">مواعيد العمل</h3>
                <p className="text-sm text-blue-700 leading-relaxed">
                  يومياً من 10 صباحاً حتى 2 بعد منتصف الليل
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loyalty Program */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 sm:col-span-2 lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-purple-900 mb-3">🎁 برنامج {brandName()} GenMo</h3>
                <div className="space-y-2 text-sm text-purple-700 leading-relaxed">
                  <div>
                    <p className="font-semibold text-purple-900">💰 كاش باك على طلباتك</p>
                    <p>كل طلب تقدمه بتكسب نسبة كاش باك</p>
                  </div>
                  <div>
                    <p className="font-semibold text-purple-900">👥 كاش باك من صحابك</p>
                    <p>كود الدعوة = أنت وصحابك تكسبوا</p>
                  </div>
                  <div>
                    <p className="font-semibold text-purple-900">🌳 شبكة تكبر = أرباح أكتر</p>
                    <p>أصحاب أصحابك = دخل إضافي</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm"
                    onClick={() => base44.auth.redirectToLogin()}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <LogIn className="w-3 h-3 mr-1" />
                    سجل دلوقتي
                  </Button>
                  <Button asChild size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                    <a href={createPageUrl("LoyaltyProgramInfo") + "?lang=ar"} target="_blank" rel="noopener noreferrer">
                      اعرف اكتر
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
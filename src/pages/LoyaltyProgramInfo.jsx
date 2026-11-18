import React from "react";
import { brandName } from "@/lib/brandName";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Users, PoundSterling, TrendingUp, Award, Zap, Target, Crown, ChevronRight, Utensils, Network } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/components/LanguageProvider";
import { base44 } from "@/api/base44Client";

export default function LoyaltyProgramInfo() {
  const { t, setLanguage } = useLanguage();

  const { data: discountSettings } = useQuery({
    queryKey: ["globalDiscountSettings"],
    queryFn: async () => {
      const settings = await base44.entities.SystemSettings.filter({ setting_key: "welcome_cashback" });
      return settings[0] || null;
    }
  });

  const payoutPercent = discountSettings?.payout_percent ?? 50;
  const rewardsPercent = discountSettings?.rewards_discounts_percent ?? 50;
  
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    
    if (langParam === 'ar') {
      setLanguage('ar');
    } else {
      // Default to Arabic for this page only if no language preference is set
      const storedLanguage = localStorage.getItem('language');
      if (!storedLanguage) {
        setLanguage('ar');
      }
    }
  }, [setLanguage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/20 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 mb-6">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            🤝 {t('partnerProgram')}
          </h1>
          <p className="text-2xl text-slate-700 mb-4 font-semibold">
            {t('notJustCustomer')}
          </p>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            {t('programDescription')}
          </p>
          <p className="text-2xl font-bold text-amber-600 mb-8">
            {t('eatEnjoyEarn')}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button asChild size="lg" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold px-8">
              <Link to={createPageUrl("Register")}>
                {t('registerNowFreeShort')}
              </Link>
            </Button>
            <Button size="lg" variant="outline" onClick={() => base44.auth.redirectToLogin()}>
              {t('alreadyMember')}
            </Button>
          </div>
        </div>

        {/* Welcome Gift */}
        <Card className="mb-12 border-0 shadow-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-8">
            <div className="flex items-start gap-4 mb-4">
              <Gift className="w-12 h-12 flex-shrink-0" />
              <div>
                <h2 className="text-3xl font-bold mb-3">{t('welcomeGift')}</h2>
                <p className="text-xl leading-relaxed mb-4">
                  {t('whenYouJoin')}
                </p>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center mb-4">
                  <p className="text-5xl font-bold mb-2">{t('egp100Cashback')}</p>
                  <p className="text-lg">{t('welcomeCashbackGift')}</p>
                </div>
                <p className="text-lg text-white/90">
                  {t('addedInstantly')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Orders */}
        <Card className="mb-12 border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <Utensils className="w-12 h-12 text-green-600 flex-shrink-0" />
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('earnFromOrders')}</h2>
                <p className="text-xl text-slate-700 mb-4 leading-relaxed">
                  {t('anyOrderFromBrand')}<br/>
                  <span className="font-bold text-green-600">{t('get15Cashback')}</span>
                </p>
                <p className="text-lg text-slate-600">
                  {t('moreYouEatMore')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Network */}
        <Card className="mb-12 border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <Users className="w-12 h-12 text-violet-600 flex-shrink-0" />
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('inviteFriends')}</h2>
                <p className="text-xl text-slate-700 mb-6 leading-relaxed">
                  {t('shareYourCodeDesc')}
                </p>
                <p className="text-lg font-semibold text-slate-800 mb-4">
                  {t('whatsNice')}
                </p>
              </div>
            </div>

            {/* Tiers Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
                <CardContent className="p-6 text-center">
                  <Badge className="bg-slate-400 text-white mb-3 px-4 py-1 text-sm">{t('bronzeTier')}</Badge>
                  <p className="text-sm text-slate-600 mb-2">{t('people1to5')}</p>
                  <p className="text-3xl font-bold text-slate-900 mb-2">5% {t('cashback')}</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-100">
                <CardContent className="p-6 text-center">
                  <Badge className="bg-amber-500 text-white mb-3 px-4 py-1 text-sm">{t('silverTier')}</Badge>
                  <p className="text-sm text-slate-600 mb-2">{t('people6to10')}</p>
                  <p className="text-3xl font-bold text-amber-900 mb-2">7% {t('cashback')}</p>
                  <p className="text-sm text-green-600 font-semibold">+500 EGP {t('bonusCash')}*</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="p-6 text-center">
                  <Badge className="bg-orange-500 text-white mb-3 px-4 py-1 text-sm">{t('goldTier')}</Badge>
                  <p className="text-sm text-slate-600 mb-2">{t('people11to20')}</p>
                  <p className="text-3xl font-bold text-orange-900 mb-2">10% {t('cashback')}</p>
                  <p className="text-sm text-green-600 font-semibold">+1000 EGP {t('bonusCash')}*</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-400 bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-6 text-center">
                  <Badge className="bg-purple-600 text-white mb-3 px-4 py-1 text-sm">{t('outstandingTier')}</Badge>
                  <p className="text-sm text-slate-600 mb-2">{t('people21plus')}</p>
                  <p className="text-3xl font-bold text-purple-900 mb-2">15% {t('cashback')}</p>
                  <p className="text-sm text-green-600 font-semibold">+2000 EGP {t('bonusCash')}*</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-indigo-400 bg-gradient-to-br from-indigo-50 to-indigo-100">
                <CardContent className="p-6 text-center">
                  <Badge className="bg-indigo-700 text-white mb-3 px-4 py-1 text-sm">{t('superiorTier')}</Badge>
                  <p className="text-sm text-slate-600 mb-2">{t('people30plus')}</p>
                  <p className="text-3xl font-bold text-indigo-900 mb-2">15% {t('cashback')}</p>
                  <p className="text-sm text-green-600 font-semibold">+3000 EGP {t('bonusCash')}*</p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mt-4">
              <p className="text-xs text-amber-900 leading-relaxed">
                <span className="font-bold">* بالعربي:</span> البونص كاش بيتمنح لما توصل للعدد المطلوب من الناس اللي <span className="font-bold">عملوا طلبات وسددوا مشترياتهم</span> - مش مجرد تسجيل.
                <br/>
                <span className="font-bold">* In English:</span> Bonus cash is granted when you reach the required number of people who <span className="font-bold">submitted purchases and made payments</span> - not just registrations.
              </p>
            </div>

            <p className="text-center text-lg text-slate-600 mt-6 font-medium">
              {t('everyNewLevel')}
            </p>
          </CardContent>
        </Card>

        {/* Multi-Level Network */}
        <Card className="mb-12 border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <Network className="w-12 h-12 text-blue-600 flex-shrink-0" />
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">🌐 مش بس صحابك… صحاب صحابك كمان!</h2>
                <p className="text-xl text-slate-700 mb-6 leading-relaxed">
                  الموضوع مش بيقف عند اللي دعيتهم بس:
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="border-0 bg-green-50">
                <CardContent className="p-6">
                  <div>
                    <p className="font-bold text-lg text-slate-900 mb-2">Level 1 - اللي دعيتهم</p>
                    <p className="text-sm text-slate-600 mb-4">الناس اللي استخدموا الكود بتاعك</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-white rounded-lg p-3">
                        <span className="text-sm font-medium">من 1 لـ 5 أشخاص</span>
                        <Badge className="bg-slate-400 text-white">5%</Badge>
                      </div>
                      <div className="flex items-center justify-between bg-white rounded-lg p-3">
                        <span className="text-sm font-medium">من 6 لـ 10 أشخاص</span>
                        <Badge className="bg-amber-500 text-white">7%</Badge>
                      </div>
                      <div className="flex items-center justify-between bg-white rounded-lg p-3">
                        <span className="text-sm font-medium">من 11 لـ 20 شخص</span>
                        <Badge className="bg-orange-500 text-white">10%</Badge>
                      </div>
                      <div className="flex items-center justify-between bg-white rounded-lg p-3">
                        <span className="text-sm font-medium">21+ شخص</span>
                        <Badge className="bg-purple-600 text-white">15%</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-blue-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-lg text-slate-900 mb-1">Level 2 - صحابهم</p>
                      <p className="text-sm text-slate-600">الناس اللي هما دعوهم</p>
                    </div>
                    <Badge className="bg-blue-600 text-white text-lg px-4 py-2">2%</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-purple-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-lg text-slate-900 mb-1">Level 3 - صحابهم برضو</p>
                      <p className="text-sm text-slate-600">الناس اللي بعدهم</p>
                    </div>
                    <Badge className="bg-purple-600 text-white text-lg px-4 py-2">1%</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <p className="text-xl text-center text-slate-700 mt-6 font-semibold">
              يعني شبكتك كلها بتكسبك… وإنت قاعد مكانك 😉
            </p>
          </CardContent>
        </Card>

        {/* Cashback Split */}
        <Card className="mb-12 border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <PoundSterling className="w-12 h-12 text-amber-600 flex-shrink-0" />
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">💰 الكاش باك بتستلمه إزاي؟</h2>
                <p className="text-xl text-slate-700 mb-6 leading-relaxed">
                  {payoutPercent > 0 
                    ? "أي كاش باك تكسبه بيتقسم:"
                    : "كل الكاش باك اللي بتكسبه بيروح ليك رصيد تستخدمه في الأكل"}
                </p>
              </div>
            </div>

            <div className={`grid ${payoutPercent > 0 ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6 mb-6`}>
              {payoutPercent > 0 && (
                <Card className="border-2 border-green-400 bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-8 text-center">
                    <PoundSterling className="w-16 h-16 mx-auto text-green-600 mb-4" />
                    <p className="text-5xl font-bold text-green-900 mb-2">{payoutPercent}%</p>
                    <p className="text-lg font-semibold text-slate-800 mb-2">فلوس كاش في إيدك</p>
                    <p className="text-sm text-slate-600">تقدر تسحبها في أي وقت</p>
                  </CardContent>
                </Card>
              )}

              <Card className="border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50">
                <CardContent className="p-8 text-center">
                  <Utensils className="w-16 h-16 mx-auto text-amber-600 mb-4" />
                  <p className="text-5xl font-bold text-amber-900 mb-2">{rewardsPercent}%</p>
                  <p className="text-lg font-semibold text-slate-800 mb-2">رصيد تستخدمه في {brandName()}</p>
                  <p className="text-sm text-slate-600">أكل في المطعم – دليفري – تيك أواي</p>
                </CardContent>
              </Card>
            </div>

            <p className="text-2xl text-center text-slate-800 font-bold">
              {payoutPercent > 0 ? "مكسب حقيقي + أكل ببلاش 😎" : "كل كسبك أكل ببلاش 😎"}
            </p>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="mb-12 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl text-center">{t('howToStart')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-2xl font-bold mb-4">
                  1
                </div>
                <Target className="w-8 h-8 mx-auto mb-3 text-amber-600" />
                <h3 className="font-bold text-slate-900 mb-2">{t('step1Title')}</h3>
                <p className="text-sm text-slate-600">{t('step1Desc')}</p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-2xl font-bold mb-4">
                  2
                </div>
                <Users className="w-8 h-8 mx-auto mb-3 text-amber-600" />
                <h3 className="font-bold text-slate-900 mb-2">{t('step2Title')}</h3>
                <p className="text-sm text-slate-600">{t('step2Desc')}</p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-2xl font-bold mb-4">
                  3
                </div>
                <TrendingUp className="w-8 h-8 mx-auto mb-3 text-amber-600" />
                <h3 className="font-bold text-slate-900 mb-2">{t('step3Title')}</h3>
                <p className="text-sm text-slate-600">{t('step3Desc')}</p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-2xl font-bold mb-4">
                  4
                </div>
                <Crown className="w-8 h-8 mx-auto mb-3 text-amber-600" />
                <h3 className="font-bold text-slate-900 mb-2">{t('step4Title')}</h3>
                <p className="text-sm text-slate-600">{t('step4Desc')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">{t('readyToEarn')}</h2>
            <p className="text-xl mb-8 text-white/90">
              {t('joinThousands')}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button asChild size="lg" className="bg-white text-amber-600 hover:bg-amber-50 font-bold px-8">
                <Link to={createPageUrl("Register")}>
                  {t('registerNowFree')}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white/10">
                <Link to={createPageUrl("Menu")}>
                  {t('viewMenu')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Utensils, Users, Network, PoundSterling } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function PartnershipProgramInfo() {
  const { t } = useLanguage();

  const { data: discountSettings } = useQuery({
    queryKey: ["globalDiscountSettings"],
    queryFn: async () => {
      const settings = await base44.entities.SystemSettings.filter({ setting_key: "welcome_cashback" });
      return settings[0] || null;
    }
  });

  const payoutPercent = discountSettings?.payout_percent ?? 50;
  const rewardsPercent = discountSettings?.rewards_discounts_percent ?? 50;
  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
        <CardContent className="p-8">
          <h1 className="text-3xl font-bold mb-2">🤝 {t('partnerProgram')}</h1>
          <p className="text-xl mb-2">{t('notJustCustomer')}</p>
          <p className="text-lg mb-4">
            {t('programDescription')}
          </p>
          <p className="text-2xl font-bold">
            {t('eatEnjoyEarn')}
          </p>
        </CardContent>
      </Card>

      {/* Welcome Gift */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Gift className="w-10 h-10 text-amber-600 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold mb-2">{t('welcomeGift')}</h2>
              <p className="text-lg mb-3">{t('whenYouJoin')}</p>
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 text-center mb-3">
                <p className="text-4xl font-bold text-amber-900">{t('egp100Cashback')}</p>
                <p className="text-sm text-amber-700">{t('welcomeCashbackGift')}</p>
              </div>
              <p className="text-slate-600">
                {t('addedInstantly')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Orders */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Utensils className="w-10 h-10 text-green-600 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold mb-3">{t('earnFromOrders')}</h2>
              <p className="text-lg mb-2">
                {t('anyOrderFromBrand')}<br/>
                <span className="font-bold text-green-600">{t('get15Cashback')}</span>
              </p>
              <p className="text-slate-600">
                {t('moreYouEatMore')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Network */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <Users className="w-10 h-10 text-violet-600 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-3">{t('inviteFriends')}</h2>
              <p className="text-lg mb-4">
                {t('shareYourCodeDesc')}
              </p>
              <p className="font-semibold mb-3">
                {t('whatsNice')}
              </p>
            </div>
          </div>

          {/* Tiers */}
          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <Card className="border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
              <CardContent className="p-4">
                <Badge className="bg-slate-400 text-white mb-2">{t('bronzeTier')}</Badge>
                <p className="text-xs text-slate-600 mb-1">{t('people1to5')}</p>
                <p className="text-2xl font-bold text-slate-900">5% {t('cashback')}</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-100">
              <CardContent className="p-4">
                <Badge className="bg-amber-500 text-white mb-2">{t('silverTier')}</Badge>
                <p className="text-xs text-slate-600 mb-1">{t('people6to10')}</p>
                <p className="text-2xl font-bold text-amber-900 mb-1">7% {t('cashback')}</p>
                <p className="text-xs text-green-600 font-semibold">+500 EGP {t('bonusCash')}</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="p-4">
                <Badge className="bg-orange-500 text-white mb-2">{t('goldTier')}</Badge>
                <p className="text-xs text-slate-600 mb-1">{t('people11to20')}</p>
                <p className="text-2xl font-bold text-orange-900 mb-1">10% {t('cashback')}</p>
                <p className="text-xs text-green-600 font-semibold">+1000 EGP {t('bonusCash')}</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-400 bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-4">
                <Badge className="bg-purple-600 text-white mb-2">{t('outstandingTier')}</Badge>
                <p className="text-xs text-slate-600 mb-1">{t('people21plus')}</p>
                <p className="text-2xl font-bold text-purple-900 mb-1">15% {t('cashback')}</p>
                <p className="text-xs text-green-600 font-semibold">+2000 EGP {t('bonusCash')}</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-indigo-400 bg-gradient-to-br from-indigo-50 to-indigo-100 md:col-span-2">
              <CardContent className="p-4 text-center">
                <Badge className="bg-indigo-700 text-white mb-2">{t('superiorTier')}</Badge>
                <p className="text-xs text-slate-600 mb-1">{t('people30plus')}</p>
                <p className="text-2xl font-bold text-indigo-900 mb-1">15% {t('cashback')}</p>
                <p className="text-xs text-green-600 font-semibold">+3000 EGP {t('bonusCash')}</p>
              </CardContent>
            </Card>
          </div>

          <p className="text-center font-medium text-slate-700">
            {t('everyNewLevel')}
          </p>
        </CardContent>
      </Card>

      {/* Multi-Level Network */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <Network className="w-10 h-10 text-blue-600 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold mb-3">{t('multiLevelNetwork')}</h2>
              <p className="text-lg mb-4">{t('notOnlyInvited')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Card className="border-0 bg-green-50">
              <CardContent className="p-4">
                <div>
                  <p className="font-bold text-slate-900 mb-2">{t('level1Direct')}</p>
                  <p className="text-sm text-slate-600 mb-3">{t('peopleUsedYourCode')}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-white rounded p-2">
                      <span className="text-sm">{t('people1to5')}</span>
                      <Badge className="bg-slate-400 text-white">5%</Badge>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded p-2">
                      <span className="text-sm">{t('people6to10')}</span>
                      <Badge className="bg-amber-500 text-white">7%</Badge>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded p-2">
                      <span className="text-sm">{t('people11to20')}</span>
                      <Badge className="bg-orange-500 text-white">10%</Badge>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded p-2">
                      <span className="text-sm">{t('people21plus')}</span>
                      <Badge className="bg-purple-600 text-white">15%</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{t('level2Friends')}</p>
                    <p className="text-sm text-slate-600">{t('peopleTheyInvited')}</p>
                  </div>
                  <Badge className="bg-blue-600 text-white text-lg px-3 py-1">2%</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{t('level3More')}</p>
                    <p className="text-sm text-slate-600">{t('peopleAfterThem')}</p>
                  </div>
                  <Badge className="bg-purple-600 text-white text-lg px-3 py-1">1%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="text-lg text-center text-slate-700 mt-4 font-semibold">
            {t('networkEarnsYou')}
          </p>
        </CardContent>
      </Card>

      {/* Cashback Split */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <PoundSterling className="w-10 h-10 text-amber-600 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold mb-3">{t('howReceiveCashback')}</h2>
              <p className="text-lg mb-4">
                {payoutPercent > 0 ? t('anyCashbackSplit') : t('allCashbackForFood')}
              </p>
            </div>
          </div>

          <div className={`grid ${payoutPercent > 0 ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4 mb-4`}>
            {payoutPercent > 0 && (
              <Card className="border-2 border-green-400 bg-gradient-to-br from-green-50 to-emerald-50">
                <CardContent className="p-6 text-center">
                  <PoundSterling className="w-12 h-12 mx-auto text-green-600 mb-3" />
                  <p className="text-4xl font-bold text-green-900 mb-2">{payoutPercent}%</p>
                  <p className="font-semibold text-slate-800 mb-1">{t('cashInHand')}</p>
                  <p className="text-xs text-slate-600">{t('withdrawAnytime')}</p>
                </CardContent>
              </Card>
            )}

            <Card className="border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50">
              <CardContent className="p-6 text-center">
                <Utensils className="w-12 h-12 mx-auto text-amber-600 mb-3" />
                <p className="text-4xl font-bold text-amber-900 mb-2">{rewardsPercent}%</p>
                <p className="font-semibold text-slate-800 mb-1">{t('creditForBrand')}</p>
                <p className="text-xs text-slate-600">{t('eatDineDelivery')}</p>
              </CardContent>
            </Card>
          </div>

          <p className="text-xl text-center font-bold text-slate-800">
            {payoutPercent > 0 ? t('realProfitFreeMeals') : t('allEarningsFreeFood')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
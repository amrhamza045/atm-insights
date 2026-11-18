import { useState } from "react";
import { brandName } from "@/lib/brandName";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Gift, 
  Users, 
  Receipt, 
  Share2, 
  Sparkles,
  ArrowRight,
  Trophy,
  PoundSterling
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export default function OnboardingFlow({ client, currentTier }) {
  const [currentStep, setCurrentStep] = useState(0);
  const queryClient = useQueryClient();

  const steps = [
    {
      title: `Welcome to ${brandName()} Partner! 🎉`,
      icon: Sparkles,
      description: "Let's get you started with your membership",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-200">
            <h3 className="text-xl font-bold text-amber-900 mb-2">
              Congratulations, {client.name}!
            </h3>
            <p className="text-slate-700 leading-relaxed">
              Your account has been approved and you're now part of our exclusive partner program. 
              You can earn cashback by referring friends and family!
            </p>
          </div>
          
          {client.cashback_earned > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-900">Welcome Bonus!</h4>
              </div>
              <p className="text-green-700">
                You've received <span className="text-xl font-bold">{client.cashback_earned.toFixed(2)} EGP</span> in welcome cashback!
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-lg border border-slate-200 text-center">
              <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Your Tier</p>
              <p className="font-bold text-slate-900">{currentTier?.level_name || 'Bronze'}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 text-center">
              <PoundSterling className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Cashback Rate</p>
              <p className="font-bold text-slate-900">{currentTier?.cashback_percentage || 10}%</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 text-center">
              <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Referrals</p>
              <p className="font-bold text-slate-900">0</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "How Cashback Works",
      icon: PoundSterling,
      description: "Earn rewards from your referral network",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-4 items-start bg-slate-50 p-4 rounded-lg">
              <div className="bg-amber-100 p-2 rounded-lg">
                <Share2 className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">1. Share Your Code</h4>
                <p className="text-sm text-slate-600">
                  Share your unique referral code with friends and family who want to join
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-slate-50 p-4 rounded-lg">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Receipt className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">2. They Make Purchases</h4>
                <p className="text-sm text-slate-600">
                  When your referrals dine at our restaurant and submit receipts, you earn cashback
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-slate-50 p-4 rounded-lg">
              <div className="bg-green-100 p-2 rounded-lg">
                <Gift className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">3. Get Rewarded</h4>
                <p className="text-sm text-slate-600">
                  Earn {currentTier?.cashback_percentage || 10}% cashback on their purchases, which you can redeem for rewards
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-sm text-slate-700">
              <strong>Pro Tip:</strong> The more people you refer, the higher your tier level and cashback rate!
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Your Referral Code",
      icon: Share2,
      description: "Start inviting friends and family",
      content: (
        <div className="space-y-4">
          <p className="text-slate-700">
            Share this code with anyone interested in joining {brandName()} Partner program:
          </p>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border-2 border-dashed border-amber-300">
            <p className="text-sm text-slate-600 mb-2">Your Referral Code</p>
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-amber-200">
              <p className="text-3xl font-bold text-amber-600 tracking-wider">
                {client.referral_code}
              </p>
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(client.referral_code);
                  toast.success("Code copied to clipboard!");
                }}
                className="bg-amber-500 hover:bg-amber-600"
              >
                Copy Code
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">How to Share:</h4>
            <ul className="space-y-2 text-sm text-blue-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Give the code to friends who want to join</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>They'll use it during registration</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>You'll see them in your referral network once approved</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "Submit Your Purchases",
      icon: Receipt,
      description: "Track your restaurant visits",
      content: (
        <div className="space-y-4">
          <p className="text-slate-700">
            Every time you dine at our restaurant, submit your receipt to track your purchases:
          </p>

          <div className="space-y-3">
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <span className="text-lg font-bold text-amber-700">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Take a Photo</h4>
                  <p className="text-sm text-slate-600">
                    Snap a clear photo of your receipt after dining
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <span className="text-lg font-bold text-amber-700">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Submit for Approval</h4>
                  <p className="text-sm text-slate-600">
                    Upload your receipt with the receipt number and amount
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <span className="text-lg font-bold text-amber-700">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Get Verified</h4>
                  <p className="text-sm text-slate-600">
                    Admin will verify and approve your purchase
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-700">
              <strong>Note:</strong> Your purchases help build your membership history and unlock potential benefits!
            </p>
          </div>
        </div>
      )
    },
    {
      title: "You're All Set! 🚀",
      icon: Trophy,
      description: "Start earning and growing your network",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-900">Ready to Go!</h3>
                <p className="text-green-700">You're all set up and ready to start earning</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900">Quick Actions:</h4>
            
            <div className="grid gap-3">
              <div className="bg-white p-4 rounded-lg border border-slate-200 hover:border-amber-300 transition-colors">
                <div className="flex items-center gap-3">
                  <Share2 className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Share Your Code</p>
                    <p className="text-sm text-slate-600">Invite your first referral</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200 hover:border-amber-300 transition-colors">
                <div className="flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Submit a Receipt</p>
                    <p className="text-sm text-slate-600">Track your next purchase</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200 hover:border-amber-300 transition-colors">
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Browse Rewards</p>
                    <p className="text-sm text-slate-600">See what you can redeem</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Client.update(client.id, { onboarding_completed: true });
      
      // Create welcome notification
      await base44.entities.Notification.create({
        client_id: client.id,
        client_email: client.email,
        title: `Welcome to ${brandName()} Partner! 🎉`,
        message: `You've completed the setup! Your referral code is ${client.referral_code}. Start sharing it to earn cashback rewards.`,
        type: "system",
        read: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      toast.success("Welcome aboard! Let's start earning cashback! 🎉");
    }
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboardingMutation.mutate();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-100 p-3 rounded-full">
              <Icon className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
              <CardDescription>{currentStepData.description}</CardDescription>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {currentStepData.content}

          <div className="flex gap-3 mt-6 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex-1"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={completeOnboardingMutation.isPending}
              className="flex-1 bg-amber-500 hover:bg-amber-600"
            >
              {currentStep === steps.length - 1 ? (
                completeOnboardingMutation.isPending ? "Completing..." : "Complete Setup"
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect } from "react";
import { brandName } from "@/lib/brandName";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

const TOUR_STEPS = [
  {
    id: "welcome",
    title: `Welcome to ${brandName()} Partner Program! 🎉`,
    description: "Get started earning cashback and rewards. This quick tour will show you how.",
    target: null,
    position: "center"
  },
  {
    id: "referral-code",
    title: "Your Referral Code",
    description: "Share this code with friends to earn cashback when they make purchases. You'll earn a percentage of their spending!",
    target: "[data-tour='referral-code']",
    position: "bottom"
  },
  {
    id: "stats",
    title: "Track Your Progress",
    description: "Monitor your direct and total network size, earnings, and tier status in real-time.",
    target: "[data-tour='stats']",
    position: "bottom"
  },
  {
    id: "referral-network",
    title: "Referral Network Tree",
    description: "Expand each referral to see who they've referred and their performance. Watch your network grow!",
    target: "[data-tour='referral-network']",
    position: "top"
  },
  {
    id: "rewards",
    title: "Redeem Rewards",
    description: "Use your cashback balance to redeem exclusive rewards, discounts, and more.",
    target: "[data-tour='rewards-tab']",
    position: "bottom"
  },
  {
    id: "analytics",
    title: "Advanced Analytics",
    description: "View detailed analytics about your network's performance, spending patterns, and earnings.",
    target: "[data-tour='analytics-tab']",
    position: "bottom"
  },
  {
    id: "payout",
    title: "Withdraw Your Earnings",
    description: "Request payouts of your available balance through your preferred payment method.",
    target: "[data-tour='payout-tab']",
    position: "bottom"
  },
  {
    id: "complete",
    title: "You're All Set! 🚀",
    description: "You're ready to start earning. Share your referral code with friends and grow your network!",
    target: null,
    position: "center"
  }
];

function Spotlight({ target }) {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (!target) return;

    const element = document.querySelector(target);
    if (!element) return;

    const updatePosition = () => {
      const rect = element.getBoundingClientRect();
      setPosition({
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [target]);

  if (!position) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" />
      {/* Spotlight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed bg-white rounded-xl z-50 border-2 border-amber-400"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
          height: `${position.height}px`
        }}
      />
    </>
  );
}

function Tooltip({ step, onNext, onPrev, onSkip, isFirst, isLast }) {
  const [tooltipPos, setTooltipPos] = useState(null);

  useEffect(() => {
    if (!step.target) {
      setTooltipPos(null);
      return;
    }

    const element = document.querySelector(step.target);
    if (!element) {
      setTooltipPos(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    const tooltip = {
      top: rect.top,
      left: rect.left
    };

    if (step.position === "bottom") {
      tooltip.top += rect.height + 20;
    } else if (step.position === "top") {
      tooltip.top -= 260;
    }

    setTooltipPos(tooltip);
  }, [step]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed z-50 bg-white rounded-xl shadow-2xl max-w-sm border border-slate-200"
      style={
        step.position === "center"
          ? {
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)"
            }
          : {
              top: `${tooltipPos?.top}px`,
              left: `${Math.min(tooltipPos?.left || 0, typeof window !== "undefined" ? window.innerWidth - 420 : 0)}px`
            }
      }
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
          <button
            onClick={onSkip}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-6">{step.description}</p>

        {/* Progress dots */}
        <div className="flex gap-1 mb-4">
          {TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                idx < TOUR_STEPS.length - 1 // Exclude the "complete" step
                  ? idx === TOUR_STEPS.length - 2
                    ? "bg-slate-300" // Last step before complete
                    : ""
                  : ""
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {TOUR_STEPS.indexOf(step) + 1} of {TOUR_STEPS.length - 1}
          </span>
          <div className="flex gap-2">
            {!isFirst && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrev}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            {!isLast ? (
              <Button
                size="sm"
                onClick={onNext}
                className="bg-amber-500 hover:bg-amber-600 gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onNext}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                Get Started
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function GuidedTour({ isVisible, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(prev => Math.min(prev + 1, TOUR_STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {step.target ? (
        <Spotlight target={step.target} />
      ) : (
        <div className="fixed inset-0 bg-black/40 z-40" />
      )}
      <Tooltip
        step={step}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleSkip}
        isFirst={isFirst}
        isLast={isLast}
      />
    </AnimatePresence>
  );
}
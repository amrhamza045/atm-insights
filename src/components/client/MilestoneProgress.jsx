import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, CheckCircle, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function MilestoneProgress({ clientId, referralCount }) {
  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones"],
    queryFn: () => base44.entities.ReferralMilestone.filter({ is_active: true }, "required_referrals")
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ["achievements", clientId],
    queryFn: () => base44.entities.MilestoneAchievement.filter({ client_id: clientId })
  });

  const achievedMilestoneIds = new Set(achievements.map(a => a.milestone_id));

  const getMilestoneStatus = (milestone) => {
    if (achievedMilestoneIds.has(milestone.id)) {
      return "achieved";
    }
    if (referralCount >= milestone.required_referrals) {
      return "ready";
    }
    return "locked";
  };

  const getProgressPercentage = (requiredReferrals) => {
    return Math.min((referralCount / requiredReferrals) * 100, 100);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Referral Milestones
        </CardTitle>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No active milestones at the moment</p>
            <p className="text-sm text-slate-400 mt-1">Check back later for referral bonus opportunities</p>
          </div>
        ) : (
          <div className="space-y-4">
            {milestones.map((milestone, index) => {
              const status = getMilestoneStatus(milestone);
              const progress = getProgressPercentage(milestone.required_referrals);
              const achievement = achievements.find(a => a.milestone_id === milestone.id);

              return (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div className="flex items-start gap-4">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ 
                          backgroundColor: status === "achieved" ? `${milestone.color}20` : "#f1f5f9"
                        }}
                      >
                        {status === "achieved" ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : status === "ready" ? (
                          <Trophy className="w-6 h-6" style={{ color: milestone.color }} />
                        ) : (
                          <Lock className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h4 className="font-semibold text-slate-900">{milestone.name}</h4>
                            <p className="text-sm text-slate-500">{milestone.description}</p>
                          </div>
                          <Badge 
                            className={
                              status === "achieved" 
                                ? "bg-green-100 text-green-700" 
                                : "bg-emerald-100 text-emerald-700"
                            }
                          >
                            £{milestone.bonus_amount}
                          </Badge>
                        </div>
                        
                        {status === "achieved" ? (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">Achieved!</span>
                            {achievement && (
                              <span className="text-slate-400">
                                on {new Date(achievement.created_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                              <div className="flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                <span>
                                  {referralCount} / {milestone.required_referrals} referrals
                                </span>
                              </div>
                              <span className="text-slate-400">{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            {status === "ready" && (
                              <p className="text-xs text-amber-600 mt-2 font-medium">
                                🎉 Contact admin to claim your bonus!
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
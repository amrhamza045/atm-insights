import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Users, PoundSterling } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ReferralNetworkTree({ client, clients, tiers = [] }) {
  const [expanded, setExpanded] = useState(true);

  const directReferrals = useMemo(() => 
    clients.filter(c => c.referred_by === client.id),
    [clients, client.id]
  );

  const getTotalNetwork = (clientId) => {
    let total = 0;
    const direct = clients.filter(c => c.referred_by === clientId);
    total += direct.length;
    direct.forEach(ref => {
      total += getTotalNetwork(ref.id);
    });
    return total;
  };

  const totalNetwork = getTotalNetwork(client.id);

  const getTierColor = (tier) => {
    if (!tier) return "bg-slate-100 text-slate-700";
    const colorMap = {
      bronze: "bg-amber-100 text-amber-700",
      silver: "bg-slate-200 text-slate-700",
      gold: "bg-yellow-100 text-yellow-700",
      platinum: "bg-purple-100 text-purple-700"
    };
    return colorMap[tier.level_name?.toLowerCase()] || "bg-slate-100 text-slate-700";
  };

  const getClientTier = (referralCount) => {
    const sortedTiers = [...tiers].sort((a, b) => b.min_referrals - a.min_referrals);
    return sortedTiers.find(t => referralCount >= t.min_referrals);
  };

  const ReferralNode = ({ nodeClient, level = 0 }) => {
    const [nodeExpanded, setNodeExpanded] = useState(level < 2);
    const nodeReferrals = clients.filter(c => c.referred_by === nodeClient.id);
    const nodeTotal = getTotalNetwork(nodeClient.id);
    const nodeTier = getClientTier(nodeReferrals.length);

    return (
      <div className="space-y-2">
        <div
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
            nodeExpanded ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200 hover:border-amber-300"
          )}
          style={{ marginLeft: `${level * 20}px` }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNodeExpanded(!nodeExpanded);
            }}
            className={cn(
              "flex-shrink-0 p-1 rounded transition-colors",
              nodeReferrals.length > 0 ? "hover:bg-slate-200" : "opacity-0 cursor-default"
            )}
          >
            {nodeReferrals.length > 0 ? (
              nodeExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : null}
          </button>

          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {nodeClient.name?.charAt(0)?.toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-slate-900">{nodeClient.name}</span>
              {nodeTier && (
                <Badge className={cn("text-xs", getTierColor(nodeTier))}>
                  {nodeTier.level_name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              {nodeReferrals.length > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {nodeReferrals.length} direct
                </span>
              )}
              {nodeTotal > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {nodeTotal} total
                </span>
              )}
              <span className="flex items-center gap-1">
                <PoundSterling className="w-3 h-3" />
                £{(nodeClient.cashback_earned || 0).toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {nodeExpanded && nodeReferrals.length > 0 && (
          <div className="space-y-2 border-l-2 border-slate-200 pl-2">
            {nodeReferrals.map(ref => (
              <ReferralNode key={ref.id} nodeClient={ref} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-sm p-0 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 border-b border-amber-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-600" />
            Referral Network
          </h3>
          <Badge variant="outline" className="text-xs">
            {totalNetwork} total referrals
          </Badge>
        </div>
      </div>

      <div className="p-4">
        {directReferrals.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Share your referral code to start building your network</p>
          </div>
        ) : (
          <div className="space-y-2">
            {directReferrals.map(ref => (
              <ReferralNode key={ref.id} nodeClient={ref} level={0} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
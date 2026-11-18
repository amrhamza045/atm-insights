import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, PoundSterling, Calendar, TrendingUp, ChevronDown, ChevronRight, User, ShieldCheck, Phone } from "lucide-react";
import { format } from "date-fns";

export default function PurchaseHistory({ clientId, showAllNetwork = false }) {
  const [expandedClients, setExpandedClients] = useState({});

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases", clientId, showAllNetwork],
    queryFn: async () => {
      if (!clientId) return [];
      
      if (showAllNetwork) {
        // Network purchases are computed on the server and trimmed to what this list shows.
        const res = await base44.functions.invoke("getReferralPurchaseStats", { view: "network", client_id: clientId });
        return res.data?.purchases || [];
      } else {
        // Get purchases made by this client
        return base44.entities.Purchase.filter({ client_id: clientId }, "-created_date");
      }
    },
    enabled: !!clientId
  });

  // Group purchases by client name for network view
  const groupedPurchases = useMemo(() => {
    if (!showAllNetwork) return null;
    
    const groups = {};
    purchases.forEach(purchase => {
      const name = purchase.client_name || "Unknown";
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(purchase);
    });
    return groups;
  }, [purchases, showAllNetwork]);

  const toggleClient = (clientName) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientName]: !prev[clientName]
    }));
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-100 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          {showAllNetwork ? "Network Purchase History" : "Purchase History"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No purchases yet</p>
          </div>
        ) : showAllNetwork && groupedPurchases ? (
          <div className="space-y-2">
            {Object.entries(groupedPurchases).map(([clientName, clientPurchases]) => {
              const isExpanded = expandedClients[clientName];
              const totalAmount = clientPurchases.reduce((sum, p) => sum + p.amount, 0);
              const totalCashback = clientPurchases.reduce((sum, p) => sum + (p.cashback_earned || 0), 0);
              
              return (
                <div key={clientName} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                    onClick={() => toggleClient(clientName)}
                  >
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-amber-700">
                        {clientName?.charAt(0) || "?"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{clientName}</p>
                        {clientPurchases[0]?.client_level > 0 && (
                          <Badge variant="outline" className="text-xs font-semibold text-amber-700 border-amber-300 bg-amber-50">
                            L{clientPurchases[0].client_level}
                          </Badge>
                        )}
                      </div>
                      {clientPurchases[0]?.client_phone && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {clientPurchases[0].client_phone}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-slate-500">{clientPurchases.length} purchases</p>
                        {clientPurchases.some(p => p.submittedBy === "client") && clientPurchases.some(p => p.submittedBy === "admin") && (
                          <Badge variant="outline" className="text-xs">Mixed</Badge>
                        )}
                        {clientPurchases.every(p => p.submittedBy === "client") && (
                          <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">Client</Badge>
                        )}
                        {clientPurchases.every(p => p.submittedBy === "admin") && (
                          <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">Admin</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">£{totalAmount.toFixed(2)}</p>
                      <p className="text-xs text-emerald-600">+£{totalCashback.toFixed(2)} earned</p>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="p-2 space-y-2 bg-white">
                      {clientPurchases.map((purchase) => (
                        <div 
                          key={purchase.id}
                          className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg"
                        >
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <PoundSterling className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-900">
                                  £{purchase.amount.toFixed(2)}
                                </p>
                                {purchase.submittedBy === "admin" ? (
                                  <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">
                                    <ShieldCheck className="w-3 h-3 mr-1" />
                                    Admin
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                                    <User className="w-3 h-3 mr-1" />
                                    Client
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(purchase.created_date), "MMM d, yyyy")}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mb-1 flex items-center gap-2">
                              <span className="font-medium">{purchase.client_name}</span>
                              {purchase.client_level > 0 && (
                                <Badge variant="outline" className="text-xs font-semibold text-amber-700 border-amber-300 bg-amber-50">
                                  L{purchase.client_level}
                                </Badge>
                              )}
                              {purchase.client_phone && (
                                <span className="text-slate-500">• {purchase.client_phone}</span>
                              )}
                            </div>
                            {purchase.cashback_earned > 0 && (
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                <span className="text-xs text-emerald-600 font-medium">
                                  +£{purchase.cashback_earned.toFixed(2)} cashback earned
                                </span>
                                {purchase.cashback_rate && (
                                  <Badge variant="outline" className="text-xs ml-1">
                                    {purchase.cashback_rate}%
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => (
              <div 
                key={purchase.id}
                className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <PoundSterling className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">
                      £{purchase.amount.toFixed(2)}
                    </p>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(purchase.created_date), "MMM d, yyyy")}
                    </span>
                  </div>
                  {purchase.cashback_earned > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs text-emerald-600 font-medium">
                        +£{purchase.cashback_earned.toFixed(2)} cashback earned
                      </span>
                      {purchase.cashback_rate && (
                        <Badge variant="outline" className="text-xs ml-1">
                          {purchase.cashback_rate}%
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
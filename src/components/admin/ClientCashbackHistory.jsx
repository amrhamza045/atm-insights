import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PoundSterling, Search, Gift, Users, TrendingUp, Trophy, Loader2, Wallet } from "lucide-react";
import { format } from "date-fns";

export default function ClientCashbackHistory() {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date")
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ["cashbackTransactions", selectedClientId],
    queryFn: () => base44.entities.CashbackTransaction.filter({ client_id: selectedClientId }, "-created_date"),
    enabled: !!selectedClientId
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const filteredClients = clientSearch.trim()
    ? clients.filter(c => 
        c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone?.toLowerCase().includes(clientSearch.toLowerCase())
      )
    : [];

  const totalCashbackEarned = transactions.reduce((sum, t) => sum + (t.cashback_amount || 0), 0);
  const totalPayoutEarned = transactions.reduce((sum, t) => sum + (t.payout_amount || 0), 0);
  const totalEarned = totalCashbackEarned + totalPayoutEarned;

  const welcomeCashback = transactions
    .filter(t => t.transaction_type === "welcome_cashback")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const referralCashback = transactions
    .filter(t => t.transaction_type === "referral_cashback")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const selfCashback = transactions
    .filter(t => t.transaction_type === "self_cashback")
    .reduce((sum, t) => sum + t.amount, 0);

  const typeConfig = {
    welcome_cashback: { icon: Gift, color: "bg-purple-100 text-purple-700", label: "Welcome Bonus" },
    referral_cashback: { icon: Users, color: "bg-blue-100 text-blue-700", label: "Referral Earnings" },
    self_cashback: { icon: TrendingUp, color: "bg-green-100 text-green-700", label: "Self Purchase" },
    milestone_bonus: { icon: Trophy, color: "bg-amber-100 text-amber-700", label: "Milestone Bonus" }
  };

  return (
    <div className="space-y-6">
      {/* Client Search */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-slate-500" />
            Search Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setSelectedClientId("");
                }}
                className="pl-10"
              />
            </div>

            {clientSearch && filteredClients.length > 0 && !selectedClientId && (
              <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2 bg-white">
                {filteredClients.map(client => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setClientSearch("");
                    }}
                    className="w-full text-left p-3 hover:bg-slate-50 rounded transition-colors"
                  >
                    <p className="font-medium text-sm">{client.name}</p>
                    <p className="text-xs text-slate-500">{client.email} • {client.phone}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Cashback: £{(client.cashback_earned || 0).toFixed(2)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Payout: £{(client.available_payout || 0).toFixed(2)}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedClient && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedClient.name}</p>
                    <p className="text-sm text-slate-500">{selectedClient.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-emerald-100 text-emerald-700">
                        Cashback: £{(selectedClient.cashback_earned || 0).toFixed(2)}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700">
                        Payout: £{(selectedClient.available_payout || 0).toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedClientId("");
                      setClientSearch("");
                    }}
                    className="text-sm text-amber-600 hover:text-amber-700"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History Display */}
      {selectedClientId && (
        <>
          {loadingTransactions ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Total Earned</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          £{totalEarned.toFixed(2)}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <PoundSterling className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Total Cashback</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">
                          £{totalCashbackEarned.toFixed(2)}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Gift className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Total Payout</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">
                          £{totalPayoutEarned.toFixed(2)}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Breakdown */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Earnings Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Gift className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-medium text-slate-700">Welcome Bonus</span>
                      </div>
                      <span className="font-semibold text-purple-600">£{welcomeCashback.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-slate-700">Referral Earnings</span>
                      </div>
                      <span className="font-semibold text-blue-600">£{referralCashback.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-slate-700">Self Purchase Cashback</span>
                      </div>
                      <span className="font-semibold text-green-600">£{selfCashback.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction History */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <PoundSterling className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500">No transactions found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((transaction) => {
                        const config = typeConfig[transaction.transaction_type];
                        const Icon = config?.icon || PoundSterling;
                        
                        return (
                          <div key={transaction.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                            <div className={`w-10 h-10 rounded-lg ${config?.color || 'bg-slate-200'} flex items-center justify-center flex-shrink-0`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {config?.label || transaction.transaction_type}
                                  </p>
                                  <p className="text-sm text-slate-500 mt-1">
                                    {transaction.description || "Cashback earned"}
                                  </p>
                                  {transaction.source_client_name && (
                                    <p className="text-xs text-slate-500 mt-1">
                                      From: {transaction.source_client_name}
                                      {transaction.referral_level && ` (Level ${transaction.referral_level})`}
                                      {transaction.purchase_amount && ` • Purchase: £${transaction.purchase_amount.toFixed(2)}`}
                                    </p>
                                  )}
                                  <p className="text-xs text-slate-400 mt-1">
                                    {format(new Date(transaction.created_date), "MMM d, yyyy 'at' h:mm a")}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-lg text-emerald-600">
                                    +£{transaction.amount.toFixed(2)}
                                  </p>
                                  <div className="flex gap-2 mt-1">
                                    {transaction.cashback_amount > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        £{transaction.cashback_amount.toFixed(2)} cashback
                                      </Badge>
                                    )}
                                    {transaction.payout_amount > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        £{transaction.payout_amount.toFixed(2)} payout
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
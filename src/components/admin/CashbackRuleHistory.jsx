import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function CashbackRuleHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["cashbackRuleHistory"],
    queryFn: () => base44.entities.CashbackRuleHistory.list("-created_date")
  });

  const filteredHistory = searchQuery.trim()
    ? history.filter(h =>
        h.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.rule_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : history;

  const selectedOrder = selectedOrderId
    ? filteredHistory.find(h => h.order_id === selectedOrderId)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Cashback Rule History</h3>
        <p className="text-sm text-slate-500 mt-1">View which cashback rules were applied to each order</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by customer name, order ID, or rule name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* History List */}
        <div className="lg:col-span-2 space-y-3 max-h-[600px] overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-slate-500">No rule history found</p>
            </Card>
          ) : (
            filteredHistory.map((record) => (
              <Card
                key={record.id}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedOrder?.id === record.id
                    ? "border-blue-500 bg-blue-50"
                    : "hover:bg-slate-50"
                }`}
                onClick={() => setSelectedOrderId(record.order_id)}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{record.customer_name}</h4>
                    <Badge variant="outline" className="text-xs capitalize">
                      {record.rule_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">Order #{record.order_id}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 font-medium">{record.rule_name}</span>
                    <span className="text-slate-600">
                      {record.total_cashback_applied?.toFixed(2)} EGP
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(record.created_date).toLocaleDateString()}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Detail View */}
        {selectedOrder ? (
          <Card className="h-fit sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Rule Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Customer</p>
                <p className="font-semibold">{selectedOrder.customer_name}</p>
              </div>

              <div>
                <p className="text-slate-500 text-xs">Order</p>
                <p className="font-semibold">#{selectedOrder.order_id}</p>
              </div>

              <div>
                <p className="text-slate-500 text-xs">Rule Applied</p>
                <p className="font-semibold">{selectedOrder.rule_name}</p>
              </div>

              <div className="border-t pt-3">
                <p className="text-slate-600 text-xs font-medium mb-2">Order Info</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order Total:</span>
                    <span className="font-medium">{selectedOrder.order_total?.toFixed(2)} EGP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order Type:</span>
                    <span className="font-medium capitalize">{selectedOrder.order_type}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-slate-600 text-xs font-medium mb-2">Rates Applied</p>
                <div className="space-y-1 text-xs bg-slate-50 p-2 rounded">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Self Rate:</span>
                    <span className="font-semibold">{selectedOrder.self_cashback_rate}%</span>
                  </div>
                  {selectedOrder.level1_rate > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Level 1:</span>
                      <span className="font-semibold">{selectedOrder.level1_rate}%</span>
                    </div>
                  )}
                  {selectedOrder.level2_rate > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Level 2:</span>
                      <span className="font-semibold">{selectedOrder.level2_rate}%</span>
                    </div>
                  )}
                  {selectedOrder.level3_rate > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Level 3:</span>
                      <span className="font-semibold">{selectedOrder.level3_rate}%</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-slate-600 text-xs font-medium mb-2">Cashback Applied</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-emerald-50 rounded">
                    <span className="text-emerald-700">Total Cashback:</span>
                    <span className="font-bold text-emerald-700">
                      {selectedOrder.total_cashback_applied?.toFixed(2)} EGP
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-blue-50 rounded">
                    <span className="text-blue-700">Total Payout:</span>
                    <span className="font-bold text-blue-700">
                      {selectedOrder.total_payout_applied?.toFixed(2)} EGP
                    </span>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="border-t pt-3">
                  <p className="text-slate-600 text-xs font-medium mb-1">Notes</p>
                  <p className="text-slate-600 text-xs">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="text-xs text-slate-500 pt-2 border-t">
                Applied: {new Date(selectedOrder.applied_date).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-fit p-8 text-center">
            <p className="text-slate-500 text-sm">Select an order to view details</p>
          </Card>
        )}
      </div>
    </div>
  );
}
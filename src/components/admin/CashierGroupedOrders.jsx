import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function CashierGroupedOrders({ orders, clients, onOrderClick }) {
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Group orders by type -> delivery company (for delivery) -> payment method
  const groupedOrders = () => {
    const groups = {
      dine_in: {},
      delivery: {},
      takeaway: {}
    };

    orders.forEach(order => {
      const orderType = order.order_type || 'dine_in';
      
      if (orderType === 'delivery') {
        const company = order.delivery_company_name || order.delivery_person_name || 'Direct';
        if (!groups.delivery[company]) groups.delivery[company] = {};
        
        const paymentMethod = order.payment_method || 'cash';
        if (!groups.delivery[company][paymentMethod]) groups.delivery[company][paymentMethod] = [];
        groups.delivery[company][paymentMethod].push(order);
      } else {
        const paymentMethod = order.payment_method || 'cash';
        if (!groups[orderType][paymentMethod]) groups[orderType][paymentMethod] = [];
        groups[orderType][paymentMethod].push(order);
      }
    });

    return groups;
  };

  const grouped = groupedOrders();

  // Calculate totals
  const calculateTotal = (ordersArray) => {
    return ordersArray.reduce((sum, o) => sum + (o.total || 0), 0);
  };

  const getPaymentMethodColor = (method) => {
    if (method === 'cash') return 'text-green-600';
    if (['visa', 'card', 'stripe'].includes(method)) return 'text-blue-600';
    if (['wallet', 'instapay'].includes(method)) return 'text-purple-600';
    if (method === 'cl') return 'text-amber-600';
    if (method === 'hospitality') return 'text-pink-600';
    return 'text-slate-600';
  };

  const grandTotal = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="space-y-4">
      {/* Grand Total */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-800 font-semibold">TOTAL SALES</p>
              <p className="text-xs text-amber-600">{orders.length} Orders</p>
            </div>
            <p className="text-3xl font-bold text-amber-900">{formatCurrency(grandTotal)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Dine-In */}
      {Object.keys(grouped.dine_in).length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <button
              onClick={() => toggleGroup('dine_in')}
              className="w-full flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-2">
                {expandedGroups['dine_in'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                <h3 className="text-lg font-bold">Dine-In</h3>
                <Badge className="bg-blue-100 text-blue-800">
                  {Object.values(grouped.dine_in).flat().length} orders
                </Badge>
              </div>
              <p className="text-xl font-bold text-blue-900">
                {formatCurrency(calculateTotal(Object.values(grouped.dine_in).flat()))}
              </p>
            </button>

            {expandedGroups['dine_in'] && (
              <div className="space-y-3 ml-7 border-l-2 border-blue-200 pl-4">
                {Object.entries(grouped.dine_in).map(([paymentMethod, methodOrders]) => (
                  <div key={`dine_in_${paymentMethod}`}>
                    <button
                      onClick={() => toggleGroup(`dine_in_${paymentMethod}`)}
                      className="w-full flex items-center justify-between mb-2"
                    >
                      <div className="flex items-center gap-2">
                        {expandedGroups[`dine_in_${paymentMethod}`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <Badge variant="outline" className="uppercase">{paymentMethod}</Badge>
                        <span className="text-sm text-slate-500">{methodOrders.length} orders</span>
                      </div>
                      <p className={`text-lg font-bold ${getPaymentMethodColor(paymentMethod)}`}>
                        {formatCurrency(calculateTotal(methodOrders))}
                      </p>
                    </button>

                    {expandedGroups[`dine_in_${paymentMethod}`] && (
                      <div className="space-y-2 ml-6">
                        {methodOrders.map(order => {
                          const customer = clients?.find(c => c.id === order.customer_id);
                          return (
                          <div key={order.id} className="bg-slate-50 p-3 rounded-lg flex justify-between items-start text-sm cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onOrderClick?.(order)}>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</p>
                                {order.is_returned && (
                                  <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">RETURNED</Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium text-slate-700 mt-1">{order.customer_name || "N/A"}</p>
                              <p className="text-xs text-slate-500">{customer?.phone || "N/A"}</p>
                              <div className="flex gap-2 text-xs text-slate-500 mt-1">
                                <span>{new Date(order.created_date).toLocaleTimeString()}</span>
                                {order.table_number && <span>Table {order.table_number}</span>}
                                <span>{order.items?.length} items</span>
                              </div>
                            </div>
                            <p className={`font-bold ${order.is_returned ? 'text-red-600' : ''}`}>{formatCurrency(order.total)}</p>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delivery */}
      {Object.keys(grouped.delivery).length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <button
              onClick={() => toggleGroup('delivery')}
              className="w-full flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-2">
                {expandedGroups['delivery'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                <h3 className="text-lg font-bold">Delivery</h3>
                <Badge className="bg-green-100 text-green-800">
                  {Object.values(grouped.delivery).flatMap(c => Object.values(c)).flat().length} orders
                </Badge>
              </div>
              <p className="text-xl font-bold text-green-900">
                {formatCurrency(calculateTotal(Object.values(grouped.delivery).flatMap(c => Object.values(c)).flat()))}
              </p>
            </button>

            {expandedGroups['delivery'] && (
              <div className="space-y-3 ml-7 border-l-2 border-green-200 pl-4">
                {Object.entries(grouped.delivery).map(([company, companyOrders]) => (
                  <div key={`delivery_${company}`}>
                    <button
                      onClick={() => toggleGroup(`delivery_${company}`)}
                      className="w-full flex items-center justify-between mb-2"
                    >
                      <div className="flex items-center gap-2">
                        {expandedGroups[`delivery_${company}`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <p className="font-semibold">{company}</p>
                        <span className="text-sm text-slate-500">
                          {Object.values(companyOrders).flat().length} orders
                        </span>
                      </div>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(calculateTotal(Object.values(companyOrders).flat()))}
                      </p>
                    </button>

                    {expandedGroups[`delivery_${company}`] && (
                      <div className="space-y-3 ml-6 border-l-2 border-slate-200 pl-4">
                        {Object.entries(companyOrders).map(([paymentMethod, methodOrders]) => (
                          <div key={`delivery_${company}_${paymentMethod}`}>
                            <button
                              onClick={() => toggleGroup(`delivery_${company}_${paymentMethod}`)}
                              className="w-full flex items-center justify-between mb-2"
                            >
                              <div className="flex items-center gap-2">
                                {expandedGroups[`delivery_${company}_${paymentMethod}`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                <Badge variant="outline" className="uppercase">{paymentMethod}</Badge>
                                <span className="text-sm text-slate-500">{methodOrders.length} orders</span>
                              </div>
                              <p className={`text-lg font-bold ${getPaymentMethodColor(paymentMethod)}`}>
                                {formatCurrency(calculateTotal(methodOrders))}
                              </p>
                            </button>

                            {expandedGroups[`delivery_${company}_${paymentMethod}`] && (
                              <div className="space-y-2 ml-6">
                                {methodOrders.map(order => {
                                  const customer = clients?.find(c => c.id === order.customer_id);
                                  return (
                                  <div key={order.id} className="bg-slate-50 p-3 rounded-lg flex justify-between items-start text-sm cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onOrderClick?.(order)}>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</p>
                                        {order.is_returned && (
                                          <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">RETURNED</Badge>
                                        )}
                                      </div>
                                      <p className="text-sm font-medium text-slate-700 mt-1">{order.customer_name || "N/A"}</p>
                                      <p className="text-xs text-slate-500">{customer?.phone || "N/A"}</p>
                                      <div className="flex gap-2 text-xs text-slate-500 mt-1">
                                        <span>{new Date(order.created_date).toLocaleTimeString()}</span>
                                        <span>{order.items?.length} items</span>
                                      </div>
                                    </div>
                                    <p className={`font-bold ${order.is_returned ? 'text-red-600' : ''}`}>{formatCurrency(order.total)}</p>
                                  </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Takeaway */}
      {Object.keys(grouped.takeaway).length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <button
              onClick={() => toggleGroup('takeaway')}
              className="w-full flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-2">
                {expandedGroups['takeaway'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                <h3 className="text-lg font-bold">Takeaway</h3>
                <Badge className="bg-purple-100 text-purple-800">
                  {Object.values(grouped.takeaway).flat().length} orders
                </Badge>
              </div>
              <p className="text-xl font-bold text-purple-900">
                {formatCurrency(calculateTotal(Object.values(grouped.takeaway).flat()))}
              </p>
            </button>

            {expandedGroups['takeaway'] && (
              <div className="space-y-3 ml-7 border-l-2 border-purple-200 pl-4">
                {Object.entries(grouped.takeaway).map(([paymentMethod, methodOrders]) => (
                  <div key={`takeaway_${paymentMethod}`}>
                    <button
                      onClick={() => toggleGroup(`takeaway_${paymentMethod}`)}
                      className="w-full flex items-center justify-between mb-2"
                    >
                      <div className="flex items-center gap-2">
                        {expandedGroups[`takeaway_${paymentMethod}`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <Badge variant="outline" className="uppercase">{paymentMethod}</Badge>
                        <span className="text-sm text-slate-500">{methodOrders.length} orders</span>
                      </div>
                      <p className={`text-lg font-bold ${getPaymentMethodColor(paymentMethod)}`}>
                        {formatCurrency(calculateTotal(methodOrders))}
                      </p>
                    </button>

                    {expandedGroups[`takeaway_${paymentMethod}`] && (
                      <div className="space-y-2 ml-6">
                        {methodOrders.map(order => {
                          const customer = clients?.find(c => c.id === order.customer_id);
                          return (
                          <div key={order.id} className="bg-slate-50 p-3 rounded-lg flex justify-between items-start text-sm cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onOrderClick?.(order)}>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</p>
                                {order.is_returned && (
                                  <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">RETURNED</Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium text-slate-700 mt-1">{order.customer_name || "N/A"}</p>
                              <p className="text-xs text-slate-500">{customer?.phone || "N/A"}</p>
                              <div className="flex gap-2 text-xs text-slate-500 mt-1">
                                <span>{new Date(order.created_date).toLocaleTimeString()}</span>
                                <span>{order.items?.length} items</span>
                              </div>
                            </div>
                            <p className={`font-bold ${order.is_returned ? 'text-red-600' : ''}`}>{formatCurrency(order.total)}</p>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
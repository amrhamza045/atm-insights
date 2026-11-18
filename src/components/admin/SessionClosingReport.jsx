import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function SessionClosingReport({ session, orders, expenses, visaCredits, deposits, returns, cashSales, cardSales, walletSales, purchases, rechargeBalance, deliveryCompanies = [] }) {
  const reportRef = React.useRef();

  const generatePDF = async () => {
    const element = reportRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let yPosition = 0;
    if (imgHeight > 297) {
      // Multi-page PDF
      let pages = Math.ceil(imgHeight / 297);
      for (let i = 0; i < pages; i++) {
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -yPosition, imgWidth, imgHeight);
        yPosition += 297;
      }
    } else {
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    }
    
    pdf.save(`Session-Report-${session.session_date}.pdf`);
  };

  const totalDeliveryCash = visaCredits.filter(v => v.payment_method === "cash").reduce((sum, v) => sum + (v.amount || 0), 0);
  const totalRefunds = returns.reduce((sum, r) => sum + (r.refund_amount || 0), 0);
  
  // Calculate payment method breakdowns
  const cashOrders = orders.filter(o => o.payment_method === "cash" && !o.is_returned);
  const instapayOrders = orders.filter(o => o.payment_method === "instapay" && !o.is_returned);
  const cardOrders = orders.filter(o => ["visa", "card", "stripe"].includes(o.payment_method) && !o.is_returned);
  const clOrders = orders.filter(o => o.payment_method === "cl" && !o.is_returned);
  const hospitalityOrders = orders.filter(o => o.payment_method === "hospitality" && !o.is_returned);
  const splitCashOrders = orders.filter(o => o.payment_method === "visa_cash" && !o.is_returned);
  const splitInstapayOrders = orders.filter(o => o.payment_method === "visa_instapay" && !o.is_returned);
  
  const cashOrdersTotal = cashOrders.reduce((sum, o) => sum + (o.total || 0), 0) + splitCashOrders.reduce((sum, o) => sum + (o.secondary_amount || 0), 0);
  const instapayOrdersTotal = instapayOrders.reduce((sum, o) => sum + (o.total || 0), 0) + splitInstapayOrders.reduce((sum, o) => sum + (o.secondary_amount || 0), 0);
  const cardOrdersTotal = cardOrders.reduce((sum, o) => sum + (o.total || 0), 0) + splitCashOrders.reduce((sum, o) => sum + (o.visa_amount || 0), 0) + splitInstapayOrders.reduce((sum, o) => sum + (o.visa_amount || 0), 0);
  const clOrdersTotal = clOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const hospitalityOrdersTotal = hospitalityOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  // Total Sales = exactly the sum of the payment rows shown in the report (Cash + Instapay + Card + CL + Hospitality)
  const totalSales = cashOrdersTotal + instapayOrdersTotal + cardOrdersTotal + clOrdersTotal + hospitalityOrdersTotal;
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalDeposits = deposits.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalPurchases = (purchases || []).reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const cashExpenses = expenses.filter(e => e.payment_method === "cash").reduce((sum, e) => sum + (e.amount || 0), 0);
  const cashPurchases = (purchases || []).filter(p => p.payment_method === "cash").reduce((sum, p) => sum + (p.total_amount || 0), 0);
  
  // Sales Cash includes: pure cash orders + split payment cash portions (already calculated in parent)
  const salesCashTotal = cashSales;
  // Instapay Total = pure instapay + split instapay portions  
  const instapayTotal = instapayOrdersTotal;
  // CL Total
  const clTotal = clOrdersTotal;

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button onClick={generatePDF} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>

      <div ref={reportRef} className="bg-white p-8 space-y-6">
        {/* Header */}
        <div className="text-center border-b pb-4">
          <h1 className="text-3xl font-bold">Cashier Session Report</h1>
          <p className="text-slate-600 mt-2">Session Date: {new Date(session.session_date).toLocaleDateString()}</p>
          <p className="text-slate-600">Cashier: {session.cashier_name}</p>
        </div>

        {/* Opening & Closing */}
        <div className="grid grid-cols-2 gap-6">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Session Times</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Opened:</span>
                <span>{new Date(session.opening_time).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Closed:</span>
                <span>{session.closing_time ? new Date(session.closing_time).toLocaleString() : "Open"}</span>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Cash Position</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Opening Cash:</span>
                <span className="font-semibold">{(session.opening_cash || 0).toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Closing Cash:</span>
                <span className="font-semibold">{(session.closing_cash || 0).toFixed(2)} EGP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Summary */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-4">Today's Sales Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between pb-2 border-b">
              <span className="text-slate-600">Total Orders:</span>
              <span className="font-semibold">{orders.filter(o => !o.is_returned).length}</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Cash ({cashOrders.length + splitCashOrders.length} orders):</span>
                <span className="font-semibold text-green-600">{cashOrdersTotal.toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Instapay ({instapayOrders.length + splitInstapayOrders.length} orders):</span>
                <span className="font-semibold text-blue-600">{instapayOrdersTotal.toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Card ({cardOrders.length + splitCashOrders.length + splitInstapayOrders.length} orders):</span>
                <span className="font-semibold text-purple-600">{cardOrdersTotal.toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">CL ({clOrders.length} orders):</span>
                <span className="font-semibold text-amber-600">{clOrdersTotal.toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Hospitality ({hospitalityOrders.length} orders):</span>
                <span className="font-semibold text-indigo-600">{hospitalityOrdersTotal.toFixed(2)} EGP</span>
              </div>
            </div>
            
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span className="text-slate-900">Total Sales:</span>
              <span className="text-slate-900">{totalSales.toFixed(2)} EGP</span>
            </div>
          </div>
        </div>

        {/* Deposits */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-3">All Deposits ({deposits.length})</h3>
          {deposits.length > 0 ? (
            <div className="space-y-2 text-sm">
              {deposits.map((deposit, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-slate-600">{deposit.source}</span>
                  <span className="font-semibold text-green-600">+{deposit.amount?.toFixed(2)} EGP</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total Deposits:</span>
                <span className="text-green-600">+{totalDeposits.toFixed(2)} EGP</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No deposits recorded</p>
          )}
        </div>

        {/* Delivery Orders */}
        {visaCredits.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Delivery Orders ({visaCredits.length})</h3>
            <div className="space-y-1 text-sm">
              {visaCredits.map((credit, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-slate-600">{credit.delivery_company} - {credit.order_reference}</span>
                  <span className={`font-semibold ${credit.payment_method === "cash" ? "text-green-600" : "text-blue-600"}`}>
                    {credit.amount?.toFixed(2)} EGP ({credit.payment_method})
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total Delivery (Cash):</span>
                <span className="text-green-600">+{totalDeliveryCash.toFixed(2)} EGP</span>
              </div>
            </div>
          </div>
        )}

        {/* Expenses */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-3">All Expenses ({expenses.length})</h3>
          {expenses.length > 0 ? (
            <div className="space-y-2 text-sm">
              {expenses.map((exp, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-slate-600">{exp.description} ({exp.category}) - {exp.payment_method}</span>
                  <span className="font-semibold text-red-600">-{exp.amount?.toFixed(2)} EGP</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total Expenses:</span>
                <span className="text-red-600">-{totalExpenses.toFixed(2)} EGP</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No expenses recorded</p>
          )}
        </div>
        
        {/* Purchases */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-3">All Purchases ({(purchases || []).length})</h3>
          {(purchases || []).length > 0 ? (
            <div className="space-y-2 text-sm">
              {(purchases || []).map((purchase, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-slate-600">{purchase.description || purchase.supplier_name} - {purchase.payment_method}</span>
                  <span className="font-semibold text-red-600">-{purchase.total_amount?.toFixed(2)} EGP</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total Purchases:</span>
                <span className="text-red-600">-{totalPurchases.toFixed(2)} EGP</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No purchases recorded</p>
          )}
        </div>

        {/* Returns */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-3">All Refunds ({returns.length})</h3>
          {returns.length > 0 ? (
            <div className="space-y-2 text-sm">
              {returns.map((ret, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-slate-600">{ret.order_reference} - {ret.reason} ({ret.payment_method})</span>
                  <span className="font-semibold text-red-600">-{ret.refund_amount?.toFixed(2)} EGP</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total Refunds:</span>
                <span className="text-red-600">-{totalRefunds.toFixed(2)} EGP</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No refunds recorded</p>
          )}
        </div>

        {/* Sold Items Summary */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Sold Items Summary</h3>
          {(() => {
            const itemsMap = {};
            
            orders.filter(o => !o.is_returned).forEach(order => {
              const pricingType = order.order_type === "delivery" && 
                                  order.delivery_company_id && 
                                  !["self_delivery"].includes(order.delivery_company_id)
                                  ? "Indirect" : "Direct";
              
              const orderType = order.order_type === "dine_in" ? "Dine In" :
                               order.order_type === "takeaway" ? "Takeaway" :
                               order.order_type === "delivery" ? "Delivery" : "Other";
              
              const deliveryCompanyName = order.order_type === "delivery" && order.delivery_company_name 
                                          ? order.delivery_company_name 
                                          : "N/A";
              
              order.items?.forEach(item => {
                const key = `${pricingType}|${orderType}|${deliveryCompanyName}|${item.name}`;
                
                if (!itemsMap[key]) {
                  itemsMap[key] = {
                    pricingType,
                    orderType,
                    deliveryCompany: deliveryCompanyName,
                    itemName: item.name,
                    quantity: 0,
                    totalPrice: 0
                  };
                }
                
                itemsMap[key].quantity += item.quantity;
                itemsMap[key].totalPrice += (item.price + (item.option_price_modifier || 0)) * item.quantity;
              });
            });
            
            const itemsArray = Object.values(itemsMap);
            const directItems = itemsArray.filter(i => i.pricingType === "Direct");
            const indirectItems = itemsArray.filter(i => i.pricingType === "Indirect");
            
            const renderItemsSection = (items, title) => {
              if (items.length === 0) return null;
              
              const dineInItems = items.filter(i => i.orderType === "Dine In");
              const takeawayItems = items.filter(i => i.orderType === "Takeaway");
              const deliveryItems = items.filter(i => i.orderType === "Delivery");
              
              const deliveryByCompany = {};
              deliveryItems.forEach(item => {
                if (!deliveryByCompany[item.deliveryCompany]) {
                  deliveryByCompany[item.deliveryCompany] = [];
                }
                deliveryByCompany[item.deliveryCompany].push(item);
              });
              
              return (
                <div key={title} className="mb-4 border-l-4 border-slate-300 pl-3">
                  <h4 className="font-semibold text-sm text-slate-800 mb-2">{title}</h4>
                  
                  {dineInItems.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-blue-700 mb-1">Dine In:</p>
                      {dineInItems.map((item, idx) => (
                        <p key={idx} className="text-xs text-slate-600 ml-2">
                          • {item.itemName}: {item.quantity} × {(item.totalPrice / item.quantity).toFixed(2)} EGP = {item.totalPrice.toFixed(2)} EGP
                        </p>
                      ))}
                    </div>
                  )}
                  
                  {takeawayItems.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-green-700 mb-1">Takeaway:</p>
                      {takeawayItems.map((item, idx) => (
                        <p key={idx} className="text-xs text-slate-600 ml-2">
                          • {item.itemName}: {item.quantity} × {(item.totalPrice / item.quantity).toFixed(2)} EGP = {item.totalPrice.toFixed(2)} EGP
                        </p>
                      ))}
                    </div>
                  )}
                  
                  {Object.keys(deliveryByCompany).length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-purple-700 mb-1">Delivery:</p>
                      {Object.entries(deliveryByCompany).map(([company, companyItems]) => (
                        <div key={company} className="ml-2 mb-2">
                          <p className="text-xs font-medium text-purple-600">{company}:</p>
                          {companyItems.map((item, idx) => (
                            <p key={idx} className="text-xs text-slate-600 ml-2">
                              • {item.itemName}: {item.quantity} × {(item.totalPrice / item.quantity).toFixed(2)} EGP = {item.totalPrice.toFixed(2)} EGP
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs font-semibold text-slate-800 mt-2">
                    {title} Total: {items.reduce((sum, i) => sum + i.totalPrice, 0).toFixed(2)} EGP
                  </p>
                </div>
              );
            };
            
            return (
              <div className="text-sm space-y-3">
                {itemsArray.length === 0 ? (
                  <p className="text-slate-500">No items sold</p>
                ) : (
                  <>
                    {renderItemsSection(directItems, "Direct Pricing")}
                    {renderItemsSection(indirectItems, "Indirect Pricing")}
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Grand Total Sold:</span>
                      <span className="text-green-600">{itemsArray.reduce((sum, i) => sum + i.totalPrice, 0).toFixed(2)} EGP</span>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>

        {/* Cash Position Details */}
        <div className="bg-slate-50 border-2 border-slate-300 rounded-lg p-5">
          <h3 className="font-bold text-slate-900 mb-4 text-lg">Cash Position Details</h3>
          
          <div className="space-y-3 text-sm">
            {/* Additions */}
            <div className="bg-white rounded-lg p-3">
              <p className="font-semibold text-green-700 mb-2">Cash Additions:</p>
              <div className="space-y-1.5 ml-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Opening Cash:</span>
                  <span className="font-semibold">{(session.opening_cash || 0).toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Sales Cash:</span>
                  <span className="font-semibold text-green-600">+{salesCashTotal.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Instapay:</span>
                  <span className="font-semibold text-green-600">+{instapayTotal.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Sales CL:</span>
                  <span className="font-semibold text-green-600">+{clTotal.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Deposits:</span>
                  <span className="font-semibold text-green-600">+{totalDeposits.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Recharge Cash:</span>
                  <span className="font-semibold text-green-600">+{(rechargeBalance || 0).toFixed(2)} EGP</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span className="text-slate-700">Total Additions:</span>
                  <span className="text-green-600">
                    {((session.opening_cash || 0) + salesCashTotal + instapayTotal + clTotal + totalDeposits + (rechargeBalance || 0)).toFixed(2)} EGP
                  </span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="bg-white rounded-lg p-3">
              <p className="font-semibold text-red-700 mb-2">Cash Deductions:</p>
              <div className="space-y-1.5 ml-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Expenses (Cash):</span>
                  <span className="font-semibold text-red-600">-{cashExpenses.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Purchases (Cash):</span>
                  <span className="font-semibold text-red-600">-{cashPurchases.toFixed(2)} EGP</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span className="text-slate-700">Total Deductions:</span>
                  <span className="text-red-600">
                    -{(cashExpenses + cashPurchases).toFixed(2)} EGP
                  </span>
                </div>
              </div>
            </div>

            {/* Final Calculation */}
            <div className="bg-gradient-to-r from-slate-100 to-slate-50 rounded-lg p-4 border-2 border-slate-300">
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-base">
                  <span className="text-slate-700">Available Cash (Expected):</span>
                  <span className="text-slate-900">
                    {(
                      (session.opening_cash || 0) + 
                      salesCashTotal + 
                      instapayTotal + 
                      clTotal + 
                      totalDeposits + 
                      (rechargeBalance || 0) - 
                      cashExpenses - 
                      cashPurchases
                    ).toFixed(2)} EGP
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base text-green-600">
                  <span>Actual Closing Cash:</span>
                  <span>{(session.closing_cash || 0).toFixed(2)} EGP</span>
                </div>
                <div className={`flex justify-between font-bold text-lg border-t-2 pt-2 ${
                  Math.abs(
                    (session.closing_cash || 0) - 
                    ((session.opening_cash || 0) + salesCashTotal + instapayTotal + clTotal + totalDeposits + (rechargeBalance || 0) - cashExpenses - cashPurchases)
                  ) < 0.01 ? "text-green-600" : "text-red-600"
                }`}>
                  <span>Difference:</span>
                  <span>
                    {(
                      (session.closing_cash || 0) - 
                      ((session.opening_cash || 0) + salesCashTotal + instapayTotal + clTotal + totalDeposits + (rechargeBalance || 0) - cashExpenses - cashPurchases)
                    ) >= 0 ? '+' : ''}{(
                      (session.closing_cash || 0) - 
                      ((session.opening_cash || 0) + salesCashTotal + instapayTotal + clTotal + totalDeposits + (rechargeBalance || 0) - cashExpenses - cashPurchases)
                    ).toFixed(2)} EGP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
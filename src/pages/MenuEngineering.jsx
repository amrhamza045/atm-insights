import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { 
  TrendingUp, 
  TrendingDown, 
  PoundSterling, 
  Target, 
  Package,
  Star,
  HelpCircle,
  Tractor,
  XCircle,
  Calendar,
  BarChart3,
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Cell, PieChart, Pie } from "recharts";
import RestaurantLogo from "@/components/RestaurantLogo";
import { useLanguage } from "@/components/LanguageProvider";
import { useHasAnyPermission } from "@/components/permissions/PermissionsContext";

export default function MenuEngineeringPage() {
  // Tabs closed in Admin › Modules are left out.
  const screenTabs = useScreenTabs("MenuEngineering");
  const firstTab = screenTabs.pick("matrix", ["matrix", "items", "pricing", "categories"]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  // Same groups the menu data rule lets change items.
  const canEditMenu = useHasAnyPermission(["menu_create", "menu_edit", "menu_delete", "inventory_edit", "support_customization", "admin_systems"]);
  const [dateRange, setDateRange] = useState(30);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const queryClient = useQueryClient();

  // Fetch data
  const { data: menuItems = [] } = useQuery({
    queryKey: ["menuItems"],
    queryFn: () => base44.entities.MenuItem.list()
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list()
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["menuCategories"],
    queryFn: () => base44.entities.MenuCategory.list()
  });

  // Calculate date threshold
  const dateThreshold = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - dateRange);
    return date.toISOString();
  }, [dateRange]);

  // Filter orders by date range
  const recentOrders = useMemo(() => {
    return orders.filter(o => o.created_date >= dateThreshold && !o.is_returned);
  }, [orders, dateThreshold]);

  // Calculate menu engineering metrics
  const menuEngineering = useMemo(() => {
    const itemStats = menuItems.map(item => {
      // Calculate quantity sold
      const quantitySold = recentOrders.reduce((sum, order) => {
        const orderItem = order.items?.find(i => i.menu_item_id === item.id);
        return sum + (orderItem?.quantity || 0);
      }, 0);

      // Calculate revenue
      const revenue = recentOrders.reduce((sum, order) => {
        const orderItem = order.items?.find(i => i.menu_item_id === item.id);
        if (!orderItem) return sum;
        const itemPrice = (orderItem.price || 0) + (orderItem.option_price_modifier || 0);
        return sum + (itemPrice * orderItem.quantity);
      }, 0);

      // Calculate contribution margin
      const avgPrice = quantitySold > 0 ? revenue / quantitySold : item.price || 0;
      const foodCost = item.total_cost || 0;
      const contributionMargin = avgPrice - foodCost;
      const foodCostPercentage = avgPrice > 0 ? (foodCost / avgPrice) * 100 : 0;

      // Calculate profitability
      const totalContribution = contributionMargin * quantitySold;

      return {
        ...item,
        quantitySold,
        revenue,
        avgPrice,
        foodCost,
        contributionMargin,
        foodCostPercentage,
        totalContribution
      };
    });

    // Calculate averages for BCG matrix
    const totalQuantity = itemStats.reduce((sum, item) => sum + item.quantitySold, 0);
    const totalContribution = itemStats.reduce((sum, item) => sum + item.totalContribution, 0);
    
    const avgPopularity = totalQuantity / itemStats.length;
    const avgProfitability = totalContribution / itemStats.length;

    // Categorize items (BCG Matrix)
    const categorized = itemStats.map(item => {
      const isPopular = item.quantitySold >= avgPopularity;
      const isProfitable = item.totalContribution >= avgProfitability;

      let category, icon, color, description;
      if (isPopular && isProfitable) {
        category = "Star";
        icon = Star;
        color = "text-yellow-500";
        description = "High popularity, high profit - Keep and promote";
      } else if (!isPopular && isProfitable) {
        category = "Puzzle";
        icon = HelpCircle;
        color = "text-purple-500";
        description = "Low popularity, high profit - Promote or reposition";
      } else if (isPopular && !isProfitable) {
        category = "Plowhorse";
        icon = Tractor;
        color = "text-blue-500";
        description = "High popularity, low profit - Increase price or reduce cost";
      } else {
        category = "Dog";
        icon = XCircle;
        color = "text-red-500";
        description = "Low popularity, low profit - Consider removing";
      }

      return {
        ...item,
        category,
        icon,
        color,
        description,
        isPopular,
        isProfitable
      };
    });

    return {
      items: categorized,
      avgPopularity,
      avgProfitability,
      totalRevenue: itemStats.reduce((sum, item) => sum + item.revenue, 0),
      totalQuantitySold: totalQuantity
    };
  }, [menuItems, recentOrders]);

  // Filter by category
  const filteredItems = useMemo(() => {
    if (categoryFilter === "all") return menuEngineering.items;
    return menuEngineering.items.filter(item => item.category === categoryFilter);
  }, [menuEngineering.items, categoryFilter]);

  // Category performance
  const categoryPerformance = useMemo(() => {
    const categoryMap = {};
    menuEngineering.items.forEach(item => {
      const cat = item.category || "Uncategorized";
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          name: cat,
          revenue: 0,
          quantity: 0,
          avgFoodCost: 0,
          items: []
        };
      }
      categoryMap[cat].revenue += item.revenue;
      categoryMap[cat].quantity += item.quantitySold;
      categoryMap[cat].items.push(item);
    });

    return Object.values(categoryMap).map(cat => ({
      ...cat,
      avgFoodCost: cat.items.reduce((sum, item) => sum + item.foodCostPercentage, 0) / cat.items.length
    }));
  }, [menuEngineering.items]);

  // BCG distribution
  const bcgDistribution = useMemo(() => {
    const dist = { Star: 0, Puzzle: 0, Plowhorse: 0, Dog: 0 };
    menuEngineering.items.forEach(item => {
      dist[item.category] = (dist[item.category] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [menuEngineering.items]);

  // Price recommendation logic
  const getPriceRecommendation = (item) => {
    const targetMargin = item.target_margin_percentage || 30;
    const targetFoodCost = 100 - targetMargin;
    const currentFoodCost = item.foodCostPercentage;
    
    if (currentFoodCost > targetFoodCost) {
      const recommendedPrice = item.foodCost / (targetFoodCost / 100);
      const priceIncrease = recommendedPrice - item.avgPrice;
      return {
        action: "increase",
        currentPrice: item.avgPrice,
        recommendedPrice,
        difference: priceIncrease,
        reason: `Food cost is ${currentFoodCost.toFixed(1)}% (target: ${targetFoodCost.toFixed(1)}%)`
      };
    } else if (item.category === "Puzzle") {
      const recommendedPrice = item.avgPrice * 0.9; // 10% discount to boost popularity
      return {
        action: "decrease",
        currentPrice: item.avgPrice,
        recommendedPrice,
        difference: recommendedPrice - item.avgPrice,
        reason: "Low popularity - consider promotional pricing"
      };
    } else if (item.category === "Dog") {
      return {
        action: "remove",
        reason: "Low performance - consider removing or replacing"
      };
    }
    
    return {
      action: "maintain",
      currentPrice: item.avgPrice,
      reason: "Pricing is optimal"
    };
  };

  // Update mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["menuItems"]);
      setEditDialog(false);
      setSelectedItem(null);
    }
  });

  const handleUpdatePrice = (item, newPrice) => {
    updateItemMutation.mutate({
      id: item.id,
      data: { price: newPrice }
    });
  };

  // Display labels per BCG category (plural, with proper Arabic plurals)
  const CAT_LABELS = {
    Star: { en: "Stars", ar: "النجوم" },
    Puzzle: { en: "Puzzles", ar: "الألغاز" },
    Plowhorse: { en: "Plowhorses", ar: "خيول الجر" },
    Dog: { en: "Dogs", ar: "الكلاب" }
  };
  const catLabel = (cat) => (isRtl ? CAT_LABELS[cat]?.ar : CAT_LABELS[cat]?.en) || cat;

  const COLORS = {
    Star: "#eab308",
    Puzzle: "#a855f7",
    Plowhorse: "#3b82f6",
    Dog: "#ef4444"
  };

  // Custom pie label: staggers small adjacent slices outward so labels never overlap
  const renderPieLabel = ({ cx, cy, midAngle, outerRadius, percent, name, value, index }) => {
    const RADIAN = Math.PI / 180;
    // Small slices get progressively longer leader lines to separate their labels
    const isSmall = percent < 0.08;
    const extra = isSmall ? 18 + (index % 3) * 16 : 12;
    const r = outerRadius + extra;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill={COLORS[name] || "#334155"}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${catLabel(name)}: ${value}`}
      </text>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <RestaurantLogo className="h-10 mb-2" />
            <h1 className="text-3xl font-bold text-slate-900">Menu Engineering</h1>
            <p className="text-slate-600">Analyze and optimize your menu performance</p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange.toString()} onValueChange={(v) => setDateRange(Number(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(menuEngineering.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Items Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{menuEngineering.totalQuantitySold}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Stars</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-500">
                {menuEngineering.items.filter(i => i.category === "Star").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Dogs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">
                {menuEngineering.items.filter(i => i.category === "Dog").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {!firstTab ? <ClosedTabsNotice /> : (
        <Tabs defaultValue={firstTab} className="space-y-4">
          <TabsList>
            {screenTabs.isOpen("matrix") && <TabsTrigger value="matrix">BCG Matrix</TabsTrigger>}
            {screenTabs.isOpen("items") && <TabsTrigger value="items">Item Analysis</TabsTrigger>}
            {screenTabs.isOpen("pricing") && <TabsTrigger value="pricing">Pricing Tools</TabsTrigger>}
            {screenTabs.isOpen("categories") && <TabsTrigger value="categories">Category Performance</TabsTrigger>}
          </TabsList>

          {/* BCG Matrix View */}
          <TabsContent value="matrix" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Menu Portfolio Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={bcgDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={renderPieLabel}
                        outerRadius={85}
                        paddingAngle={2}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {bcgDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Popularity vs Profitability</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="quantitySold" name="Popularity" />
                      <YAxis dataKey="totalContribution" name="Profitability" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter data={menuEngineering.items} fill="#8884d8">
                        {menuEngineering.items.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.category]} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* BCG Categories */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {["Star", "Puzzle", "Plowhorse", "Dog"].map(cat => {
                const items = menuEngineering.items.filter(i => i.category === cat);
                const Icon = items[0]?.icon || Star;
                return (
                  <Card key={cat}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2" dir={isRtl ? "rtl" : "ltr"}>
                        <Icon className={items[0]?.color || "text-slate-500"} />
                        <span data-no-translate>{catLabel(cat)}</span>
                        <span dir="ltr" data-no-translate>({items.length})</span>
                      </CardTitle>
                      <CardDescription>{items[0]?.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {items.slice(0, 3).map(item => (
                          <div key={item.id} className="flex justify-between items-center text-sm" dir={isRtl ? "rtl" : "ltr"}>
                            <span className={`truncate ${isRtl ? "text-right" : "text-left"}`} dir="auto">{item.name}</span>
                            <span className="font-semibold" dir="ltr" data-no-translate>{item.quantitySold}</span>
                          </div>
                        ))}
                        {items.length > 3 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full"
                            onClick={() => setCategoryFilter(cat)}
                          >
                            <span>View all</span>&nbsp;<span dir="ltr" data-no-translate>{items.length}</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Item Analysis */}
          <TabsContent value="items">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Item Performance Analysis</CardTitle>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="Star">Stars</SelectItem>
                      <SelectItem value="Puzzle">Puzzles</SelectItem>
                      <SelectItem value="Plowhorse">Plowhorses</SelectItem>
                      <SelectItem value="Dog">Dogs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Item</th>
                        <th className="text-left p-2">Category</th>
                        <th className="text-right p-2">Qty Sold</th>
                        <th className="text-right p-2">Revenue</th>
                        <th className="text-right p-2">Avg Price</th>
                        <th className="text-right p-2">Food Cost</th>
                        <th className="text-right p-2">Food Cost %</th>
                        <th className="text-right p-2">Margin</th>
                        <th className="text-center p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map(item => {
                        const Icon = item.icon;
                        return (
                          <tr key={item.id} className="border-b hover:bg-slate-50">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${item.color}`} />
                                <span className="font-medium">{item.name}</span>
                              </div>
                            </td>
                            <td className="p-2">
                              <Badge variant="outline">{item.category}</Badge>
                            </td>
                            <td className="text-right p-2">{item.quantitySold}</td>
                            <td className="text-right p-2">{formatCurrency(item.revenue)}</td>
                            <td className="text-right p-2">{formatCurrency(item.avgPrice)}</td>
                            <td className="text-right p-2">{formatCurrency(item.foodCost)}</td>
                            <td className="text-right p-2">
                              <span className={item.foodCostPercentage > 35 ? "text-red-600 font-semibold" : ""}>
                                {item.foodCostPercentage.toFixed(1)}%
                              </span>
                            </td>
                            <td className="text-right p-2">{formatCurrency(item.contributionMargin)}</td>
                            <td className="text-center p-2">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setEditDialog(true);
                                }}
                              >
                                Details
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tools */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI-Powered Pricing Recommendations
                </CardTitle>
                <CardDescription>
                  Based on food cost, popularity, and target margins
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {menuEngineering.items
                    .filter(item => {
                      const rec = getPriceRecommendation(item);
                      return rec.action !== "maintain";
                    })
                    .map(item => {
                      const rec = getPriceRecommendation(item);
                      return (
                        <div key={item.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{item.name}</h3>
                                <Badge variant="outline">{item.category}</Badge>
                              </div>
                              <div className="grid md:grid-cols-3 gap-4 mb-3">
                                <div>
                                  <p className="text-xs text-slate-600">Current Price</p>
                                  <p className="font-semibold">{formatCurrency(rec.currentPrice)}</p>
                                </div>
                                {rec.recommendedPrice && (
                                  <div>
                                    <p className="text-xs text-slate-600">Recommended Price</p>
                                    <p className="font-semibold text-green-600">{formatCurrency(rec.recommendedPrice)}</p>
                                  </div>
                                )}
                                {rec.difference && (
                                  <div>
                                    <p className="text-xs text-slate-600">Change</p>
                                    <p className={`font-semibold ${rec.difference > 0 ? "text-green-600" : "text-red-600"}`}>
                                      {rec.difference > 0 ? "+" : ""}{formatCurrency(rec.difference)}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <AlertTriangle className="w-4 h-4" />
                                <span>{rec.reason}</span>
                              </div>
                            </div>
                            {rec.action !== "remove" && rec.recommendedPrice && (
                              <Button 
                                onClick={() => handleUpdatePrice(item, rec.recommendedPrice)}
                                disabled={updateItemMutation.isPending || !canEditMenu}
                              >
                                Apply
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category Performance */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={categoryPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                    <Bar dataKey="quantity" fill="#10b981" name="Quantity Sold" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        )}

        {/* Item Detail Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedItem?.name} - Performance Details</DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {React.createElement(selectedItem.icon, { className: `w-6 h-6 ${selectedItem.color}` })}
                  <Badge>{selectedItem.category}</Badge>
                  <span className="text-sm text-slate-600">{selectedItem.description}</span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Sales Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Quantity Sold</span>
                        <span className="font-semibold">{selectedItem.quantitySold}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Total Revenue</span>
                        <span className="font-semibold">{formatCurrency(selectedItem.revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Average Price</span>
                        <span className="font-semibold">{formatCurrency(selectedItem.avgPrice)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Cost & Margin</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Food Cost</span>
                        <span className="font-semibold">{formatCurrency(selectedItem.foodCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Food Cost %</span>
                        <span className={`font-semibold ${selectedItem.foodCostPercentage > 35 ? "text-red-600" : "text-green-600"}`}>
                          {selectedItem.foodCostPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Contribution Margin</span>
                        <span className="font-semibold">{formatCurrency(selectedItem.contributionMargin)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Total Contribution</span>
                        <span className="font-semibold">{formatCurrency(selectedItem.totalContribution)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-blue-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Pricing Recommendation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const rec = getPriceRecommendation(selectedItem);
                      return (
                        <div className="space-y-2">
                          <p className="text-sm">{rec.reason}</p>
                          {rec.recommendedPrice && (
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-slate-600">Recommended Price</p>
                                <p className="text-lg font-bold text-green-600">
                                  {formatCurrency(rec.recommendedPrice)}
                                </p>
                              </div>
                              <Button onClick={() => handleUpdatePrice(selectedItem, rec.recommendedPrice)}>
                                Apply Recommendation
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
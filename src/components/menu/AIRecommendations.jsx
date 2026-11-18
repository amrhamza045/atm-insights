import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function AIRecommendations({ client, menuItems, recentOrders, onAddToCart, context = "menu" }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const trackEventMutation = useMutation({
    mutationFn: (eventData) => base44.entities.RecommendationEvent.create(eventData),
  });

  useEffect(() => {
    if (menuItems.length > 0) {
      generateRecommendations();
    }
  }, [client?.id, recentOrders?.length, menuItems.length]);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      // Priority items to recommend
      const priorityNames = ["Peri-Peri Chicken", "Italian Classic Pizza"];
      
      // Find priority items
      const priorityItems = priorityNames
        .map(name => menuItems.find(item => item.name === name))
        .filter(Boolean);
      
      // Get other expensive items
      const otherExpensiveItems = menuItems
        .filter(item => !priorityNames.includes(item.name))
        .sort((a, b) => b.price - a.price)
        .slice(0, 4 - priorityItems.length);
      
      // Combine priority items with expensive items
      const selectedItems = [...priorityItems, ...otherExpensiveItems].slice(0, 4);
      
      const validRecs = selectedItems.map(item => ({
        item_name: item.name,
        reason: "Premium choice",
        type: "premium",
        item
      }));

      setRecommendations(validRecs);

      // Track views
      validRecs.forEach(rec => {
        trackEventMutation.mutate({
          client_id: client?.id || "",
          recommended_item_id: rec.item.id,
          recommended_item_name: rec.item.name,
          recommendation_type: rec.type,
          context,
          event_type: "view"
        });
      });
    } catch (error) {
      console.error("Failed to generate recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (rec) => {
    trackEventMutation.mutate({
      client_id: client?.id || "",
      recommended_item_id: rec.item.id,
      recommended_item_name: rec.item.name,
      recommendation_type: rec.type,
      context,
      event_type: "add_to_cart"
    });
    onAddToCart(rec.item);
  };

  const handleClick = (rec) => {
    trackEventMutation.mutate({
      client_id: client?.id || "",
      recommended_item_id: rec.item.id,
      recommended_item_name: rec.item.name,
      recommendation_type: rec.type,
      context,
      event_type: "click"
    });
  };

  if (loading) {
    return (
      <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            <h3 className="font-semibold text-slate-900">Generating recommendations...</h3>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-slate-900">
            {client ? "Recommended For You" : "Trending Now"}
          </h3>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {recommendations.map((rec, idx) => (
            <Card
              key={idx}
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleClick(rec)}
            >
              {rec.item.image_url && (
                <div className="h-32 overflow-hidden">
                  <img
                    src={rec.item.image_url}
                    alt={rec.item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-semibold text-sm">{rec.item.name}</h4>
                  <Badge className="bg-amber-500 text-xs">{rec.item.price} EGP</Badge>
                </div>
                <p className="text-xs text-slate-600 mb-2">{rec.reason}</p>
                {client && (
                  <Button
                    size="sm"
                    className="w-full bg-amber-500 hover:bg-amber-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(rec);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
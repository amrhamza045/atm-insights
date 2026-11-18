import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus } from "lucide-react";

export default function CheckoutUpsell({ cart, menuItems, client, onAddToCart }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const trackEventMutation = useMutation({
    mutationFn: (eventData) => base44.entities.RecommendationEvent.create(eventData),
  });

  useEffect(() => {
    if (cart.length > 0 && menuItems.length > 0) {
      generateUpsellSuggestions();
    }
  }, [cart.length, menuItems.length]);

  const generateUpsellSuggestions = async () => {
    setLoading(true);
    try {
      const cartItems = cart.map(item => item.name).join(", ");
      const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const prompt = `You are a restaurant upselling assistant. The customer has the following items in their cart:
${cartItems}
Cart Total: ${cartTotal} EGP

Available Menu Items:
${menuItems.map(item => `- ${item.name} (${item.category}) - ${item.price} EGP - ${item.description || "No description"}`).join("\n")}

Suggest 2-3 complementary items that would enhance their meal. Focus on:
- Items that pair well with their current selection
- Drinks if they don't have any
- Desserts or sides
- Popular combos
- Items not already in cart

Provide suggestions as JSON array:
[{"item_name": "exact menu item name", "reason": "why it complements their order", "type": "combo or upsell"}]

Keep reasons brief (max 12 words). Only recommend items from the menu.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_name: { type: "string" },
                  reason: { type: "string" },
                  type: { type: "string" }
                }
              }
            }
          }
        }
      });

      const suggs = result.suggestions || [];
      const cartItemNames = cart.map(i => i.name.toLowerCase());
      const validSuggs = suggs
        .map(sug => {
          const item = menuItems.find(i => 
            i.name.toLowerCase() === sug.item_name.toLowerCase() &&
            !cartItemNames.includes(i.name.toLowerCase())
          );
          return item ? { ...sug, item } : null;
        })
        .filter(Boolean)
        .slice(0, 3);

      setSuggestions(validSuggs);

      // Track views
      validSuggs.forEach(sug => {
        trackEventMutation.mutate({
          client_id: client?.id || "",
          recommended_item_id: sug.item.id,
          recommended_item_name: sug.item.name,
          recommendation_type: sug.type,
          context: "checkout",
          event_type: "view"
        });
      });
    } catch (error) {
      console.error("Failed to generate upsell suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (sug) => {
    trackEventMutation.mutate({
      client_id: client?.id || "",
      recommended_item_id: sug.item.id,
      recommended_item_name: sug.item.name,
      recommendation_type: sug.type,
      context: "checkout",
      event_type: "add_to_cart"
    });
    onAddToCart(sug.item);
  };

  if (loading || suggestions.length === 0) return null;

  return (
    <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-green-600" />
          <h4 className="font-semibold text-sm">Complete Your Meal</h4>
          <Badge variant="outline" className="text-xs">AI Suggested</Badge>
        </div>

        <div className="space-y-2">
          {suggestions.map((sug, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-white p-3 rounded-lg border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{sug.item.name}</p>
                  <Badge className="bg-green-600 text-xs">{sug.item.price} EGP</Badge>
                </div>
                <p className="text-xs text-slate-600 mt-1">{sug.reason}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-3 border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => handleAddToCart(sug)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
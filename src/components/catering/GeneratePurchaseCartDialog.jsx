import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { isCartEligible } from "@/components/purchasing/cart/recommendedCart";

/** Sends the event to the single ordering path: the Recommended Cart in Purchases. */
export default function GeneratePurchaseCartDialog({ event }) {
  const navigate = useNavigate();
  const eligible = isCartEligible(event);

  return (
    <Button
      variant="outline"
      className="gap-1.5"
      onClick={() => navigate(`/PurchasesHub?cart_events=${event.id}`)}
      disabled={!eligible}
      title={eligible ? "Build a recommended purchase cart for this event's missing items" : "Only confirmed events can drive purchasing"}
    >
      <ShoppingCart className="w-4 h-4" /> Order missing items
    </Button>
  );
}
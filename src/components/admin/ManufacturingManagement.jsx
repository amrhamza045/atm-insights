import React, { useState } from "react";
import { Factory, FlaskConical, ClipboardList } from "lucide-react";
import RecipeManager from "@/components/admin/RecipeManager";
import ProductionOrderManager from "@/components/admin/ProductionOrderManager";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";

export default function ManufacturingManagement({ canAccessRecipes, canAccessBatches }) {
  // A view closed in Admin › Modules is left out, like one the user has no permission for.
  const { isOpen } = useScreenTabs("Manufacturing");
  const showRecipes = canAccessRecipes && isOpen("recipes");
  const showBatches = canAccessBatches && isOpen("orders");
  const wantsBatches = new URLSearchParams(window.location.search).has("event_id");
  const initialView = showRecipes && !(wantsBatches && showBatches) ? "recipes" : "orders";
  const [view, setView] = useState(initialView);

  const showToggle = showRecipes && showBatches;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <Factory className="w-5 h-5 text-blue-600" />
          Manufacturing & Production
        </h2>
        <p className="text-sm text-slate-500">
          Define reusable recipes, then use them to manufacture batches that automatically update inventory
        </p>
      </div>

      {/* Segmented toggle navigation (only when user can access both) */}
      {showToggle && (
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100">
          <button
            onClick={() => setView("recipes")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === "recipes"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FlaskConical className={`w-4 h-4 ${view === "recipes" ? "text-slate-900" : "text-slate-400"}`} />
            Recipes
          </button>
          <button
            onClick={() => setView("orders")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === "orders"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ClipboardList className={`w-4 h-4 ${view === "orders" ? "text-slate-900" : "text-slate-400"}`} />
            Production Orders
          </button>
        </div>
      )}

      {view === "recipes" && showRecipes && <RecipeManager />}
      {view === "orders" && showBatches && <ProductionOrderManager />}
      {!showRecipes && !showBatches && <ClosedTabsNotice />}
    </div>
  );
}
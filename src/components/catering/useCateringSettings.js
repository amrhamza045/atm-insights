import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useCateringSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["catering-settings"],
    queryFn: async () => {
      const rows = await base44.entities.CateringSettings.list();
      return rows[0] || null;
    },
  });

  const setLogisticsEnabled = async (value) => {
    if (settings?.id) {
      await base44.entities.CateringSettings.update(settings.id, { logistics_enabled: value });
    } else {
      await base44.entities.CateringSettings.create({ logistics_enabled: value });
    }
    await queryClient.invalidateQueries({ queryKey: ["catering-settings"] });
  };

  // Catering settings need catering_settings_edit to write; the Equipment tab's custody switch goes through the server (catering_view).
  const setCustodyEmailsEnabled = async (value) => {
    await base44.functions.invoke("setCustodyEmails", { enabled: value });
    await queryClient.invalidateQueries({ queryKey: ["catering-settings"] });
  };

  const setPortalVisibility = async (patch) => {
    if (settings?.id) {
      await base44.entities.CateringSettings.update(settings.id, patch);
    } else {
      await base44.entities.CateringSettings.create(patch);
    }
    await queryClient.invalidateQueries({ queryKey: ["catering-settings"] });
  };

  // The extra items limit and additional requisition allowance fields refuse direct writes; the server validates and saves them.
  const setExtraItemsLimit = async (percent, allowance_amount) => {
    const payload = { percent };
    if (allowance_amount !== undefined) payload.allowance_amount = allowance_amount;
    await base44.functions.invoke("setExtraItemsLimit", payload);
    await queryClient.invalidateQueries({ queryKey: ["catering-settings"] });
  };

  // Every portal visibility flag defaults to visible when unset.
  const flag = (key) => (settings ? settings[key] !== false : true);

  return {
    isLoading,
    settings,
    setPortalVisibility,
    portalVisibility: {
      portal_show_line_items: flag("portal_show_line_items"),
      portal_show_quantities: flag("portal_show_quantities"),
      portal_show_line_prices: flag("portal_show_line_prices"),
      portal_show_charge_breakdown: flag("portal_show_charge_breakdown"),
      portal_show_service_costs: flag("portal_show_service_costs"),
      portal_show_payment_history: flag("portal_show_payment_history"),
      portal_show_balance_due: flag("portal_show_balance_due"),
      portal_hide_internal_notes: settings ? settings.portal_hide_internal_notes !== false : true,
      hidden_charge_allocation: settings?.hidden_charge_allocation || "into_subtotal",
      portal_show_per_guest_price: !!settings?.portal_show_per_guest_price,
      portal_hide_discount: !!settings?.portal_hide_discount,
      portal_starting_from_mode: !!settings?.portal_starting_from_mode,
      portal_package_only_mode: !!settings?.portal_package_only_mode,
      portal_round_total_to: settings?.portal_round_total_to || 0,
      portal_label_subtotal: settings?.portal_label_subtotal || "",
      portal_label_service_charge: settings?.portal_label_service_charge || "",
      portal_label_tax: settings?.portal_label_tax || "",
      portal_label_total: settings?.portal_label_total || "",
    },
    hideQuoteRecipeLines: !!settings?.quote_hide_recipe_lines,
    logisticsEnabled: settings ? settings.logistics_enabled !== false : true,
    setLogisticsEnabled,
    custodyEmailsEnabled: settings ? settings.custody_emails_enabled !== false : true,
    setCustodyEmailsEnabled,
    setExtraItemsLimit,
  };
}
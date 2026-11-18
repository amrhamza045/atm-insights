import React, { useState } from "react";
import { Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { useCrmHealthData } from "@/components/crm/useCrmHealthData";
import { scoreAll, distributionOf } from "@/components/crm/rfmEngine";
import { filterClients } from "@/components/crm/segmentEngine";
import ClientKpiRow from "@/components/analytics/clients/ClientKpiRow";
import RegistrationTrendChart from "@/components/analytics/clients/RegistrationTrendChart";
import HealthDistributionChart from "@/components/analytics/clients/HealthDistributionChart";
import SegmentSizeSnapshot from "@/components/analytics/clients/SegmentSizeSnapshot";
import ClientTypeSplitCard from "@/components/analytics/clients/ClientTypeSplitCard";

// Health labels treated as "active" for the headline split. Derived from the
// shared CRM RFM engine — not a second definition.
const ACTIVE_LABELS = ["Champion", "Loyal", "New", "Casual"];

export default function ClientAnalytics() {
  const { permissions, currentUser } = usePermissions();
  const isAdmin = useIsAdmin();
  const [periodDays, setPeriodDays] = useState(30);

  // Analytics-context gate AND client-data gate: sitting in the Analytics menu
  // doesn't make the client base less client data.
  const canSeeAnalytics = isAdmin || permissions?.analytics_view || permissions?.financial_view;
  const canSeeClients = isAdmin || permissions?.clients_view;
  const canAccess = canSeeAnalytics && canSeeClients;

  const { data, isLoading } = useCrmHealthData();

  if (!canAccess) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-slate-600">You don't have access to client analytics.</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <p className="text-sm text-slate-500">Loading client analytics…</p>
      </div>
    );
  }

  // Merged duplicates are archived, not deleted — excluded from all reporting (Phase G).
  const clients = data.clients.filter((c) => !c.is_merged);
  const scored = scoreAll(clients, data.activityMap, data.orderCounts);
  const distribution = distributionOf(scored);

  const active = scored.filter(({ rfm }) => ACTIVE_LABELS.includes(rfm.label)).length;
  const dormant = clients.length - active;
  const lifetimeSpend = clients.reduce((sum, c) => sum + (c.total_spent || 0), 0);
  const newInPeriod = filterClients(
    clients,
    { registered_within_days: periodDays },
    data.activityMap
  ).length;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-700" />
          <h1 className="text-xl font-bold text-slate-900">Client Analytics</h1>
        </div>
        <Select value={String(periodDays)} onValueChange={(v) => setPeriodDays(Number(v))}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">New — last 30 days</SelectItem>
            <SelectItem value="60">New — last 60 days</SelectItem>
            <SelectItem value="90">New — last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-slate-500">
        A management summary of the client base. Every figure is computed live from existing records using the same
        segment and health logic as the CRM — nothing is stored or recalculated separately.
      </p>

      <ClientKpiRow
        total={clients.length}
        newInPeriod={newInPeriod}
        periodDays={periodDays}
        active={active}
        dormant={dormant}
        lifetimeSpend={lifetimeSpend}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RegistrationTrendChart clients={clients} />
        <HealthDistributionChart distribution={distribution} />
        <SegmentSizeSnapshot clients={clients} activityMap={data.activityMap} />
        <ClientTypeSplitCard clients={clients} />
      </div>
    </div>
  );
}
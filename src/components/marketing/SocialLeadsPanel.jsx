import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Instagram, Facebook, Linkedin, MessageCircle, Music2, Search, RefreshCw, Share2 } from "lucide-react";
import { PLATFORM_META, PRIORITY_META, platformOf } from "./socialLeadMeta";
import moment from "moment";
import { toast } from "sonner";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "tiktok", label: "TikTok" },
  { key: "whatsapp", label: "WhatsApp" },
];

const SOCIAL_KEYS = FILTERS.slice(1).map((f) => f.key);

// Contact-form and referral leads carry the legacy default source "whatsapp" without a platform,
// so a lead counts as WhatsApp only when its platform says so.
const socialPlatformOf = (lead) => lead.platform || (lead.source === "whatsapp" ? null : lead.source);

const ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  whatsapp: MessageCircle,
  tiktok: Music2,
};

function PlatformCell({ platform }) {
  const meta = PLATFORM_META[platform] || PLATFORM_META.facebook;
  const Icon = ICONS[platform] || Share2;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${meta.badge}`}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}

export default function SocialLeadsPanel() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await base44.functions.invoke("importSocialLeads", {});
      const created = res?.data?.created || 0;
      toast.success(created > 0 ? `Imported ${created} new lead${created > 1 ? "s" : ""}` : "No new leads found");
      queryClient.invalidateQueries({ queryKey: ["social-leads"] });
    } catch (e) {
      toast.error("Could not import leads right now");
    } finally {
      setImporting(false);
    }
  };

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["social-leads"],
    queryFn: () => base44.entities.Lead.list("-created_date", 300),
  });

  // Live updates as new leads arrive from the platforms
  useEffect(() => {
    const unsubscribe = base44.entities.Lead.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["social-leads"] });
    });
    return unsubscribe;
  }, [queryClient]);

  const socialLeads = useMemo(
    () => leads.filter((l) => SOCIAL_KEYS.includes(socialPlatformOf(l))),
    [leads]
  );

  const counts = useMemo(() => {
    const c = { all: socialLeads.length };
    socialLeads.forEach((l) => { c[platformOf(l)] = (c[platformOf(l)] || 0) + 1; });
    return c;
  }, [socialLeads]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return socialLeads
      .filter((l) => filter === "all" || platformOf(l) === filter)
      .filter((l) => {
        if (!q) return true;
        return [l.lead_number, l.contact_username, l.sender_name, l.company, l.email, l.phone, l.campaign, l.brand_purpose]
          .some((v) => (v || "").toLowerCase().includes(q));
      });
  }, [socialLeads, filter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-amber-500" />
            Social Media Leads
          </h2>
          <p className="text-sm text-slate-500">Leads captured from Facebook, Instagram, LinkedIn, TikTok and WhatsApp — updates live</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="pl-9 w-56 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleImport} disabled={importing} className="gap-1">
            <RefreshCw className={`w-4 h-4 ${importing ? "animate-spin" : ""}`} />
            {importing ? "Importing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Platform filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key ? "bg-slate-900 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label} ({counts[f.key] || 0})
          </button>
        ))}
      </div>

      <Card className="border-0 shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-sm">Loading leads...</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center">
            <Share2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="font-medium text-slate-900 mb-1">No social leads yet</h3>
            <p className="text-sm text-slate-500">
              Leads appear here automatically once a connection in Admin › Systems › Social Media sends them in
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead #</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Brand / Purpose</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-mono text-xs font-semibold text-slate-700">
                    {lead.lead_number || "—"}
                  </TableCell>
                  <TableCell><PlatformCell platform={platformOf(lead)} /></TableCell>
                  <TableCell className="max-w-[220px] truncate text-slate-700">{lead.brand_purpose || "—"}</TableCell>
                  <TableCell>
                    {lead.priority_label ? (
                      <Badge className={PRIORITY_META[lead.priority_label] || PRIORITY_META.Low}>
                        {lead.priority_label}
                        {lead.priority ? ` · ${lead.priority}` : ""}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {lead.contact_username ? `@${lead.contact_username.replace(/^@/, "")}` : lead.sender_name || "—"}
                  </TableCell>
                  <TableCell className="text-slate-700">{lead.company || "—"}</TableCell>
                  <TableCell className="text-slate-600 text-xs">{lead.email || "—"}</TableCell>
                  <TableCell className="text-slate-600 text-xs">{lead.phone || lead.phone_number || "—"}</TableCell>
                  <TableCell className="text-slate-600 text-xs">{lead.campaign || "—"}</TableCell>
                  <TableCell className="text-slate-400 text-xs whitespace-nowrap">
                    {moment(lead.created_date).format("DD MMM YY, h:mm A")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
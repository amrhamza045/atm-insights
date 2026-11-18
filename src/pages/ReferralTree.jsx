import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, PoundSterling, ChevronDown, ChevronRight, Sparkles, Filter } from "lucide-react";
import ReferralGrowthChart from "@/components/tree/ReferralGrowthChart";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function FullTreeNode({ client, clients, level = 0, searchQuery, expandAll }) {
  const [expanded, setExpanded] = useState(expandAll || level < 1);
  
  const children = useMemo(() => 
    clients.filter(c => c.referred_by === client.id),
    [clients, client.id]
  );

  const matchesSearch = useMemo(() => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return client.name?.toLowerCase().includes(query) ||
           client.email?.toLowerCase().includes(query);
  }, [client, searchQuery]);

  const hasMatchingDescendant = useMemo(() => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase();
    const checkDescendants = (parentId) => {
      const directChildren = clients.filter(c => c.referred_by === parentId);
      return directChildren.some(child => 
        child.name?.toLowerCase().includes(query) ||
        child.email?.toLowerCase().includes(query) ||
        checkDescendants(child.id)
      );
    };
    return checkDescendants(client.id);
  }, [clients, client.id, searchQuery]);

  const shouldShow = matchesSearch || hasMatchingDescendant;
  const shouldExpand = searchQuery ? (hasMatchingDescendant || expandAll) : expanded;

  const totalDescendants = useMemo(() => {
    const countDescendants = (parentId) => {
      const directChildren = clients.filter(c => c.referred_by === parentId);
      return directChildren.reduce((sum, child) => 
        sum + 1 + countDescendants(child.id), 0
      );
    };
    return countDescendants(client.id);
  }, [clients, client.id]);

  const hasChildren = children.length > 0;
  
  if (!shouldShow) return null;

  const statusColors = {
    active: "bg-emerald-500",
    inactive: "bg-slate-400",
    pending: "bg-amber-500"
  };

  return (
    <div className="relative">
      {level > 0 && (
        <>
          <div className="absolute left-0 top-0 w-8 h-7 border-l-2 border-b-2 border-slate-200 rounded-bl-xl -translate-x-8" />
        </>
      )}
      
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(level * 0.03, 0.3) }}
        className={cn(
          "flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 cursor-pointer group",
          "bg-white border-2",
          matchesSearch && searchQuery 
            ? "border-amber-300 shadow-lg shadow-amber-100" 
            : "border-slate-100 hover:border-slate-200 hover:shadow-md"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {hasChildren ? (
          <button
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            {shouldExpand ? (
              <ChevronDown className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-600" />
            )}
          </button>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          </div>
        )}
        
        <div className="relative">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg",
            level === 0 
              ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-200/50" 
              : level === 1
                ? "bg-gradient-to-br from-violet-400 to-purple-500 shadow-violet-200/50"
                : "bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-200/50"
          )}>
            {client.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className={cn(
            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
            statusColors[client.status || "pending"]
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">{client.name}</span>
            {level === 0 && (
              <Badge className="bg-amber-100 text-amber-700 text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Origin
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-500 mt-1.5">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-violet-500" />
              <span className="font-medium text-slate-700">{children.length}</span> directs
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-medium text-slate-700">{totalDescendants}</span> total
            </span>
            <span className="flex items-center gap-1.5">
              <PoundSterling className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-medium text-slate-700">{(client.cashback_earned || 0).toFixed(2)}</span> earned
            </span>
            <span className="flex items-center gap-1.5">
              <PoundSterling className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-medium text-slate-700">{(client.total_spent || 0).toFixed(2)}</span> spent
            </span>
          </div>
        </div>

        <div className="text-right text-sm text-slate-400">
          Level {level}
        </div>
      </motion.div>
      
      <AnimatePresence>
        {shouldExpand && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-16 mt-3 space-y-3 relative"
          >
            <div className="absolute left-0 top-0 bottom-6 w-0.5 bg-slate-200 -translate-x-8" />
            {children.map(child => (
              <FullTreeNode
                key={child.id}
                client={child}
                clients={clients}
                level={level + 1}
                searchQuery={searchQuery}
                expandAll={expandAll}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ReferralTreePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandAll, setExpandAll] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date"),
  });

  const filteredClients = useMemo(() => {
    if (statusFilter === "all") return clients;
    return clients.filter(c => c.status === statusFilter);
  }, [clients, statusFilter]);

  const rootClients = useMemo(() => 
    filteredClients.filter(c => !c.referred_by || c.referred_by === "none"),
    [filteredClients]
  );

  // Stats
  const maxDepth = useMemo(() => {
    const getDepth = (clientId, depth = 0) => {
      const children = clients.filter(c => c.referred_by === clientId);
      if (children.length === 0) return depth;
      return Math.max(...children.map(c => getDepth(c.id, depth + 1)));
    };
    return Math.max(...rootClients.map(c => getDepth(c.id, 0)), 0);
  }, [clients, rootClients]);

  const avgReferrals = clients.length > 0 
    ? (clients.filter(c => c.referred_by && c.referred_by !== "none").length / 
       Math.max(clients.filter(c => !c.referred_by || c.referred_by === "none").length, 1)).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Full Referral Tree</h1>
          <p className="text-slate-500 mt-1">Visualize your entire client referral network</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-sm text-slate-500">Total Clients</p>
            <p className="text-2xl font-bold text-slate-900">{clients.length}</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-sm text-slate-500">Root Clients</p>
            <p className="text-2xl font-bold text-slate-900">{rootClients.length}</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-sm text-slate-500">Max Depth</p>
            <p className="text-2xl font-bold text-slate-900">{maxDepth} levels</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-sm text-slate-500">Avg Referrals</p>
            <p className="text-2xl font-bold text-slate-900">{avgReferrals}</p>
          </Card>
        </div>

        {/* Monthly Referral Growth Chart */}
        <div className="mb-8">
          <ReferralGrowthChart clients={clients} />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-white">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => setExpandAll(!expandAll)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              expandAll 
                ? "bg-amber-100 text-amber-700" 
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {expandAll ? "Collapse All" : "Expand All"}
          </button>
        </div>

        {/* Tree */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : rootClients.length === 0 ? (
          <Card className="p-12 text-center bg-white border-0 shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">No Clients Yet</h3>
            <p className="text-sm text-slate-500">Add your first client to start building your referral tree</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {rootClients.map(client => (
              <FullTreeNode
                key={client.id}
                client={client}
                clients={filteredClients}
                level={0}
                searchQuery={searchQuery}
                expandAll={expandAll}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
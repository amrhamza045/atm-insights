import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MODULES_QUERY_KEY, fetchModuleSettings } from "@/hooks/useModuleAccess";
import { useBranchCompanies, groupBranches } from "@/components/branches/branchCompanies";
import { setBranchScope } from "@/components/branches/branchScope";

const BranchContext = createContext(null);

const STORAGE_KEY = "verakit360_selected_branch_id";
const COMPANY_KEY = "verakit360_selected_company_id";

export function BranchProvider({ children }) {
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || null;
  });
  // Set when a whole company is picked; selectedBranchId then stays on one of its
  // branches so screens that work on a single branch keep working.
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => localStorage.getItem(COMPANY_KEY) || null);

  const { data: allBranches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  // Branch lock from the user's permission copy (same fields RLS reads).
  const { data: lock, isLoading: lockLoading } = useQuery({
    queryKey: ["branchLock"],
    queryFn: async () => {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return null;
      const f = (k) => user[k] ?? user.data?.[k];
      if (user.role === "admin" || f("perm_is_central_admin")) return null;
      return f("perm_has_branch") === true ? f("perm_branch_id") || "" : null;
    },
  });

  // Multi-branch mode is a module switch; when closed, everyone works on the default branch.
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: MODULES_QUERY_KEY,
    queryFn: fetchModuleSettings,
    staleTime: 60_000,
  });
  const multiBranch = !(settings?.disabled_modules || []).includes("multi_branch");

  const isLoading = branchesLoading || lockLoading || settingsLoading;
  const singleBranch = allBranches.find((b) => b.is_default) || allBranches[0];
  const branches = !multiBranch
    ? (singleBranch ? [singleBranch] : [])
    : lock == null ? allBranches : allBranches.filter((b) => b.id === lock);

  // Auto-select the default branch on first load
   // Always ensure a default branch is selected for internal users
   useEffect(() => {
     if (!isLoading && branches.length > 0) {
       const stored = localStorage.getItem(STORAGE_KEY);
       const match = branches.find((b) => b.id === stored);
       if (match) {
         // already have it
       } else {
         const defaultBranch = lock != null ? branches[0] : (branches.find((b) => b.is_default) || branches[0]);
         if (defaultBranch) {
           setSelectedBranchId(defaultBranch.id);
           localStorage.setItem(STORAGE_KEY, defaultBranch.id);
         }
       }
     }
   }, [branches, isLoading, lock]);

  const { companies, isLoading: companiesLoading } = useBranchCompanies(!isLoading && branches.length > 1);
  const groups = groupBranches(branches, companies);

  const selectBranch = useCallback((branchId) => {
    if (lock != null && branchId !== lock) return;
    setSelectedBranchId(branchId);
    localStorage.setItem(STORAGE_KEY, branchId);
    setSelectedCompanyId(null);
    localStorage.removeItem(COMPANY_KEY);
  }, [lock]);

  const selectCompany = useCallback((companyId) => {
    const group = groups.find((g) => g.company?.id === companyId);
    if (!group) return;
    const working = group.branches.find((b) => b.id === selectedBranchId)
      || group.branches.find((b) => b.is_default) || group.branches[0];
    setSelectedBranchId(working.id);
    localStorage.setItem(STORAGE_KEY, working.id);
    setSelectedCompanyId(companyId);
    localStorage.setItem(COMPANY_KEY, companyId);
  }, [groups, selectedBranchId]);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || null;
  // Company mode holds only while the working branch still belongs to that company.
  const companyGroup = groups.find((g) => g.company?.id === selectedCompanyId && g.branches.some((b) => b.id === selectedBranchId)) || null;

  const selectedBranchIds = companyGroup ? companyGroup.branches.map((b) => b.id) : selectedBranchId ? [selectedBranchId] : [];
  // Company that owns the working branch (the picked company in company mode).
  const activeCompany = groups.find((g) => g.company && g.branches.some((b) => b.id === selectedBranchId))?.company || null;
  // Analytics follow the picker in multi-branch mode; the report data layer reads this at fetch time.
  const reportScope = multiBranch ? selectedBranchIds : [];
  setBranchScope(reportScope);

  const value = {
    branches,
    groups,
    selectedBranch,
    selectedBranchId,
    selectedCompany: companyGroup?.company || null,
    selectedBranchIds,
    activeCompany,
    reportScopeKey: reportScope.join(",") || "all",
    // Selection settled: branches, companies and a valid working branch are known.
    scopeReady: !isLoading && !companiesLoading && (!multiBranch || !!selectedBranch || branches.length === 0),
    selectBranch,
    selectCompany,
    isLoading,
    multiBranch,
  };

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    // Fallback for components rendered outside provider
    return { branches: [], groups: [], selectedBranch: null, selectedBranchId: null, selectedCompany: null, selectedBranchIds: [], activeCompany: null, reportScopeKey: "all", scopeReady: true, selectBranch: () => {}, selectCompany: () => {}, isLoading: true };
  }
  return ctx;
}

export function useBranchFilter() {
  const { selectedBranchId } = useBranch();
  if (!selectedBranchId) return {};
  return { branch_id: selectedBranchId };
}
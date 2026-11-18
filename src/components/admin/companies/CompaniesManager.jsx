import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, Plus } from "lucide-react";
import { companiesCall, companiesError } from "./companiesApi";
import CompanyCard from "./CompanyCard";
import UnassignedBranches from "./UnassignedBranches";
import CompanyFormDialog from "./CompanyFormDialog";
import BranchFormDialog from "./BranchFormDialog";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";

export default function CompaniesManager() {
  const qc = useQueryClient();
  const [companyDialog, setCompanyDialog] = useState(null);
  const [branchDialog, setBranchDialog] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { data, isLoading, error } = useQuery({ queryKey: ["companies-admin"], queryFn: () => companiesCall({ action: "list" }) });
  const act = useMutation({
    mutationFn: companiesCall,
    onSuccess: () => {
      ["companies-admin", "branches", "finance", "branchCompanies"].forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
      toast.success("Changes saved");
    },
    onError: (e) => toast.error(companiesError(e)),
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  if (error) return <p role="alert" className="text-sm text-red-600">{companiesError(error)}</p>;

  const { companies, branches, storage } = data;
  const owned = new Set(companies.flatMap((c) => c.branch_ids));
  const branchHandlers = {
    edit: (branch, companyId) => setBranchDialog({ branch, companyId }),
    toggle: (b) => act.mutate({ action: "save_branch", branch_id: b.id, data: { is_active: b.is_active === false } }),
    remove: (b) => setConfirm({ title: "Delete branch", message: `Delete "${b.name}" and its storage places? A branch that already has sales, events, stock, staff or accounting entries can't be deleted; turn it off instead.`, payload: { action: "delete_branch", branch_id: b.id } }),
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Companies & Branches</h2>
          <p className="text-sm text-slate-500">Create companies and the branches each one owns. Finance uses these same companies.</p>
        </div>
        <Button onClick={() => setCompanyDialog({ company: null })}><Plus className="w-4 h-4" />Add Company</Button>
      </div>

      {companies.length === 0 && (
        <Card className="p-12 text-center border-0 shadow-sm">
          <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="font-medium text-slate-900">No companies yet</h3>
          <p className="text-sm text-slate-500 mt-1">Add your first company, then add its branches.</p>
        </Card>
      )}

      {companies.map((c) => (
        <CompanyCard key={c.id} company={c} busy={act.isPending} storage={storage}
          branches={branches.filter((b) => c.branch_ids.includes(b.id))}
          onEdit={() => setCompanyDialog({ company: c })}
          onToggle={() => act.mutate({ action: "update_company", company_id: c.id, data: { is_active: !c.is_active } })}
          onDelete={() => setConfirm({ title: "Delete company", message: `Delete "${c.name}"? Its branches are kept and moved to "Branches without a company". A company with accounting records can't be deleted; turn it off instead.`, payload: { action: "delete_company", company_id: c.id } })}
          onAddBranch={() => setBranchDialog({ branch: null, companyId: c.id })}
          branchHandlers={branchHandlers} />
      ))}

      <UnassignedBranches branches={branches.filter((b) => !owned.has(b.id))} storage={storage} busy={act.isPending} branchHandlers={branchHandlers} />

      {companyDialog && <CompanyFormDialog company={companyDialog.company} act={act} onClose={() => setCompanyDialog(null)} />}
      {branchDialog && <BranchFormDialog {...branchDialog} companies={companies} act={act} onClose={() => setBranchDialog(null)} />}
      {confirm && <ConfirmDeleteDialog confirm={confirm} act={act} onClose={() => setConfirm(null)} />}
    </div>
  );
}
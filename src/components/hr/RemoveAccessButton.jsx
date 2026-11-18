import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { removeEmployeeAccess } from "@/components/hr/assignEmployeeRole";

/** HR "Remove access": sign-in account deleted, ex-employee (previous role kept), HR record terminated. */
export default function RemoveAccessButton({ employee }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => removeEmployeeAccess({ employeeId: employee.id, queryClient }),
    onSuccess: (res) => toast.success(res?.account_deleted
      ? `Access removed and sign-in account deleted for ${employee.name}`
      : `Access removed for ${employee.name}`),
    onError: (e) => toast.error(e.message),
    onSettled: () => setOpen(false),
  });

  return (
    <>
      <Button size="sm" variant="ghost" title="Remove access" onClick={() => setOpen(true)} disabled={mutation.isPending}>
        <UserX className="w-3 h-3 text-red-500" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove access</AlertDialogTitle>
            <AlertDialogDescription>
              Remove all staff access for <strong>{employee.name}</strong>? Their sign-in account is deleted, their role is
              saved as their previous role, they are marked as an ex-employee and their HR record is set to terminated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => mutation.mutate()}>
              Remove access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
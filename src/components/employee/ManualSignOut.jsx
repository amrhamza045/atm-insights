import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ManualSignOut() {
  const queryClient = useQueryClient();
  const signOut = useMutation({
    mutationFn: async () => {
      try {
        return (await base44.functions.invoke("attendanceClock", { action: "manual_sign_out" })).data;
      } catch (e) {
        throw new Error(e.response?.data?.error || e.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todayAttendance"] });
      toast.success("Signed out successfully");
    },
  });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Sign out without face or location verification.</p>
      {signOut.error && <p role="alert" className="text-sm text-destructive">{signOut.error.message}</p>}
      <Button className="w-full" size="lg" disabled={signOut.isPending} onClick={() => signOut.mutate()}>
        {signOut.isPending ? "Signing Out..." : "Sign Out"}
      </Button>
    </div>
  );
}
import { Card } from "@/components/ui/card";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import MeetingsManager from "@/components/hr/meetings/MeetingsManager";

export default function OperationalMeetings() {
  const { currentUser, permissions } = usePermissions();
  const isAdmin = useIsAdmin();
  const allowed = isAdmin || permissions?.hr_view_all === true || permissions?.hr_edit === true;

  if (!currentUser) return <div className="p-8 text-center text-slate-500">Loading…</div>;
  if (!allowed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600">You need HR view or HR edit permission to open operational meetings.</p>
        </Card>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><MeetingsManager /></div>
    </div>
  );
}
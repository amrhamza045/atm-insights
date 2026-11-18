import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import EmployeeDetailsTab from "./EmployeeDetailsTab";
import EmployeeHistoryTab from "./EmployeeHistoryTab";
import LifetimeRecordTab from "@/components/hr/lifetime/LifetimeRecordTab";
import DisciplineHistorySection from "@/components/hr/discipline/DisciplineHistorySection";

export default function EmployeeProfileDialog({ employee, role, onClose }) {
  return (
    <Dialog open={!!employee} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Employee profile</DialogTitle>
        </DialogHeader>
        {employee && (
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="month">Month Performance</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="lifetime">Lifetime Record</TabsTrigger>
            </TabsList>
            <TabsContent value="lifetime" className="mt-4">
              <LifetimeRecordTab employee={employee} onClose={onClose} />
            </TabsContent>
            <TabsContent value="month" className="mt-4">
              <EmployeeHistoryTab employee={employee} mode="month" />
            </TabsContent>
            <TabsContent value="details" className="mt-4">
              <EmployeeDetailsTab employee={employee} role={role} />
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <div className="space-y-4">
                <DisciplineHistorySection employee={employee} onClose={onClose} />
                <EmployeeHistoryTab employee={employee} mode="all" />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
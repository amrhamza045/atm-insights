import { useState, useEffect } from "react";
import { monthEndDate } from "@/components/utils/timezoneHelper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { excludeSystemAccounts } from "@/components/hr/systemAccount";
import { withEmployeePrivate } from "@/components/hr/employeePrivate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PoundSterling, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function SalaryCalculator() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [editingDeductions, setEditingDeductions] = useState("");
  const [editingBonus, setEditingBonus] = useState("");

  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.filter({ status: "active" }).then(excludeSystemAccounts).then(withEmployeePrivate)
  });

  const { data: salaryRecords = [] } = useQuery({
    queryKey: ["salaryRecords", selectedMonth],
    queryFn: async () => {
      const month = `${selectedMonth}-01`;
      return base44.entities.SalaryRecord.filter({ month });
    }
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["attendanceRecords", selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = monthEndDate(year, month);
      return base44.entities.Attendance.filter({
        attendance_date: { $gte: startDate, $lte: endDate }
      });
    }
  });

  const calculateSalaryMutation = useMutation({
    mutationFn: async (employeeId) => {
      const employee = employees.find(e => e.id === employeeId);
      if (!employee) throw new Error("Employee not found");

      // Get attendance for the month
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = monthEndDate(year, month);
      
      const employeeAttendance = attendanceRecords.filter(
        a => a.employee_id === employeeId && a.attendance_date >= startDate && a.attendance_date <= endDate
      );

      // Prefer approved records with calculated earnings
      const approvedRecords = employeeAttendance.filter(a => a.review_status === "approved");
      const useApproved = approvedRecords.length > 0 && approvedRecords.some(a => a.calculated_earnings != null);
      const calcRecords = useApproved ? approvedRecords : employeeAttendance;

      const totalHours = calcRecords.reduce((sum, a) => sum + (a.hours_worked || 0), 0);
      const overtimeHours = useApproved ? calcRecords.reduce((sum, a) => sum + (a.overtime_hours || 0), 0) : 0;
      const overtimeEarnings = useApproved ? calcRecords.reduce((sum, a) => sum + (a.overtime_earnings || 0), 0) : 0;
      const attendanceDeductions = useApproved ? calcRecords.reduce((sum, a) => sum + (a.deduction_amount || 0), 0) : 0;

      let baseSalary = 0;
      let hourlyEarnings = 0;

      if (employee.salary_type === "fixed" || employee.salary_type === "both") {
        baseSalary = employee.fixed_salary || 0;
      }

      if (useApproved) {
        hourlyEarnings = calcRecords.reduce((sum, a) => sum + (a.regular_earnings || 0), 0);
      } else if (employee.salary_type === "hourly" || employee.salary_type === "both") {
        hourlyEarnings = totalHours * (employee.hourly_rate || 0);
      }

      const grossSalary = useApproved
        ? baseSalary + hourlyEarnings + overtimeEarnings - attendanceDeductions
        : baseSalary + hourlyEarnings;
      const netSalary = grossSalary; // Will be updated with deductions later

      const existingRecord = salaryRecords.find(r => r.employee_id === employeeId);
      const month_str = `${year}-${month}-01`;

      if (existingRecord?.id) {
        return base44.entities.SalaryRecord.update(existingRecord.id, {
          base_salary: baseSalary,
          hourly_earnings: hourlyEarnings,
          total_hours: totalHours,
          overtime_hours: overtimeHours,
          overtime_earnings: overtimeEarnings,
          gross_salary: grossSalary,
          net_salary: netSalary
        });
      } else {
        return base44.entities.SalaryRecord.create({
          employee_id: employeeId,
          employee_name: employee.name,
          month: month_str,
          base_salary: baseSalary,
          hourly_earnings: hourlyEarnings,
          total_hours: totalHours,
          overtime_hours: overtimeHours,
          overtime_earnings: overtimeEarnings,
          gross_salary: grossSalary,
          net_salary: netSalary,
          payment_status: "pending"
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salaryRecords"] });
      toast.success("Salary calculated");
    }
  });

  const updateSalaryMutation = useMutation({
    mutationFn: ({ recordId, data }) => base44.entities.SalaryRecord.update(recordId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salaryRecords"] });
      toast.success("Salary updated");
      setShowDetailsDialog(false);
    }
  });

  const handleCalculateAll = async () => {
    for (const emp of employees) {
      await calculateSalaryMutation.mutateAsync(emp.id);
    }
  };

  const getSalaryRecord = (employeeId) => {
    return salaryRecords.find(r => r.employee_id === employeeId);
  };

  const handleOpenDetails = (employee) => {
    const record = getSalaryRecord(employee.id);
    if (record) {
      setSelectedEmployee({ ...employee, record });
      setEditingDeductions((record.deductions || 0).toString());
      setEditingBonus((record.bonus || 0).toString());
      setShowDetailsDialog(true);
    }
  };

  const handleSaveDetails = () => {
    if (selectedEmployee?.record?.id) {
      const deductions = parseFloat(editingDeductions) || 0;
      const bonus = parseFloat(editingBonus) || 0;
      const netSalary = (selectedEmployee.record.gross_salary || 0) + bonus - deductions;

      updateSalaryMutation.mutate({
        recordId: selectedEmployee.record.id,
        data: { deductions, bonus, net_salary: netSalary }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <PoundSterling className="w-5 h-5" />
          Salary Management
        </h3>
        <Button onClick={handleCalculateAll} className="gap-2">
          <Calendar className="w-4 h-4" />
          Calculate All ({selectedMonth})
        </Button>
      </div>

      <div className="flex gap-2">
        <Input 
          type="month" 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map(emp => {
          const record = getSalaryRecord(emp.id);
          return (
            <Card key={emp.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{emp.name}</h4>
                    <p className="text-xs text-slate-500">{emp.position}</p>
                  </div>
                  <Badge variant={record ? "default" : "outline"}>
                    {record?.payment_status || "pending"}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  {record ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Hours:</span>
                        <span className="font-medium">{record.total_hours?.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Base:</span>
                        <span className="font-medium">EGP {record.base_salary?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Hourly:</span>
                        <span className="font-medium">EGP {record.hourly_earnings?.toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Net:</span>
                        <span className="text-green-600">EGP {record.net_salary?.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-400 text-xs py-2">Not calculated</p>
                  )}
                </div>

                <div className="flex gap-2">
                  {record && (
                    <Button size="sm" variant="outline" onClick={() => handleOpenDetails(emp)} className="flex-1">
                      Details
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    onClick={() => calculateSalaryMutation.mutate(emp.id)}
                    disabled={calculateSalaryMutation.isPending}
                    className="flex-1"
                  >
                    {record ? "Recalc" : "Calc"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Salary Details Dialog */}
      {selectedEmployee && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedEmployee.name} - {selectedMonth}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Hours Worked:</span>
                  <span className="font-medium">{selectedEmployee.record.total_hours?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Salary:</span>
                  <span className="font-medium">EGP {selectedEmployee.record.base_salary?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hourly Earnings:</span>
                  <span className="font-medium">EGP {selectedEmployee.record.hourly_earnings?.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Gross:</span>
                  <span>EGP {selectedEmployee.record.gross_salary?.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <Label>Bonus</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={editingBonus}
                  onChange={(e) => setEditingBonus(e.target.value)}
                />
              </div>

              <div>
                <Label>Deductions</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={editingDeductions}
                  onChange={(e) => setEditingDeductions(e.target.value)}
                />
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm">
                  <span className="text-slate-600">Net Salary:</span>
                  <p className="text-2xl font-bold text-green-600">
                    EGP {(
                      (selectedEmployee.record.gross_salary || 0) + 
                      (parseFloat(editingBonus) || 0) - 
                      (parseFloat(editingDeductions) || 0)
                    ).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveDetails} disabled={updateSalaryMutation.isPending}>
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
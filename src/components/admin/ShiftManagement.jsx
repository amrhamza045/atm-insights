import { useState } from "react";
import { companyToday } from "@/components/utils/timezoneHelper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { excludeSystemAccounts } from "@/components/hr/systemAccount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calendar, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const WEEKENDS = ["saturday", "sunday"];

export default function ShiftManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(companyToday());
  const [editingShift, setEditingShift] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: "",
    shift_date: "",
    start_time: "",
    end_time: "",
    notes: "",
    is_repeating: false,
    repeat_days: [],
    repeat_start_date: "",
    repeat_end_date: "",
    weekends_off: []
  });

  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", selectedBranchId, "shifts"],
    queryFn: async () => {
      const allEmployees = await base44.entities.Employee.filter({ ...(!selectedBranchId ? {} : { branch_id: selectedBranchId }) }, "-created_date", 100);
      return excludeSystemAccounts(allEmployees.filter(e => e.status === "active"));
    },
    staleTime: 60000
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts", selectedDate, selectedBranchId],
    queryFn: () => base44.entities.Shift.filter({ shift_date: selectedDate, ...(selectedBranchId ? { branch_id: selectedBranchId } : {}) })
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data) => {
      const startTime = new Date(`2000-01-01T${data.start_time}`);
      const endTime = new Date(`2000-01-01T${data.end_time}`);
      const expectedHours = (endTime - startTime) / (1000 * 60 * 60);

      return base44.entities.Shift.create({
        ...data,
        expected_hours: expectedHours,
        status: "scheduled",
        branch_id: selectedBranchId,
        branch_name: selectedBranch?.name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift created");
      handleClose();
    }
  });

  const updateShiftMutation = useMutation({
    mutationFn: async (data) => {
      const startTime = new Date(`2000-01-01T${data.start_time}`);
      const endTime = new Date(`2000-01-01T${data.end_time}`);
      const expectedHours = (endTime - startTime) / (1000 * 60 * 60);

      return base44.entities.Shift.update(data.id, {
        ...data,
        expected_hours: expectedHours
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift updated");
      handleClose();
    }
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift deleted");
    }
  });

  const handleOpen = (shift = null) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        employee_id: shift.employee_id || "",
        shift_date: shift.shift_date || "",
        start_time: shift.start_time || "",
        end_time: shift.end_time || "",
        notes: shift.notes || "",
        is_repeating: shift.is_repeating || false,
        repeat_days: Array.isArray(shift.repeat_days) ? shift.repeat_days : [],
        repeat_start_date: shift.repeat_start_date || "",
        repeat_end_date: shift.repeat_end_date || "",
        weekends_off: Array.isArray(shift.weekends_off) ? shift.weekends_off : []
      });
    } else {
      setEditingShift(null);
      setFormData({
        employee_id: "",
        shift_date: selectedDate,
        start_time: "",
        end_time: "",
        notes: "",
        is_repeating: false,
        repeat_days: [],
        repeat_start_date: "",
        repeat_end_date: "",
        weekends_off: []
      });
    }
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingShift(null);
  };

  const handleSave = () => {
    if (!formData.employee_id || !formData.start_time || !formData.end_time) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.is_repeating && formData.repeat_days.length === 0) {
      toast.error("Select at least one day for repeating shift");
      return;
    }

    const employee = employees.find(e => e.id === formData.employee_id);
    const data = {
      ...formData,
      employee_name: employee?.name
    };

    if (editingShift?.id) {
      updateShiftMutation.mutate({ ...data, id: editingShift.id });
    } else {
      createShiftMutation.mutate(data);
    }
  };

  const groupedShifts = {};
  shifts.forEach(shift => {
    if (!groupedShifts[shift.employee_id]) {
      groupedShifts[shift.employee_id] = [];
    }
    groupedShifts[shift.employee_id].push(shift);
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Shift Schedule
          </h3>
          <p className="text-sm text-slate-500">{selectedDate}</p>
        </div>
        <div className="flex gap-2">
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={handleOpen} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Shift
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(groupedShifts).length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-500">No shifts scheduled for this date</p>
          </Card>
        ) : (
          Object.entries(groupedShifts).map(([empId, empShifts]) => {
            const emp = employees.find(e => e.id === empId);
            return (
              <div key={empId}>
                <h4 className="font-semibold mb-2 text-sm">{emp?.name}</h4>
                <div className="space-y-2">
                  {empShifts.map(shift => (
                    <Card key={shift.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{shift.start_time} - {shift.end_time}</p>
                          <p className="text-xs text-slate-500">{shift.expected_hours?.toFixed(1)} hours</p>
                          {shift.is_repeating && (
                            <p className="text-xs text-blue-600 mt-1">
                              Repeats: {shift.repeat_days.join(", ")}
                            </p>
                          )}
                          {shift.notes && <p className="text-xs text-slate-600 mt-1">{shift.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={shift.status === "scheduled" ? "outline" : "default"}>
                            {shift.status}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleOpen(shift)}
                          >
                            <Edit2 className="w-3 h-3 text-blue-500" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => deleteShiftMutation.mutate(shift.id)}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingShift ? "Edit Shift" : "Add Shift"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              {employees.length === 0 ? (
                <div className="w-full px-3 py-2 border rounded-lg text-sm text-slate-500 bg-slate-50">
                  No active employees found
                </div>
              ) : (
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Select employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input 
                  type="time" 
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input 
                  type="time" 
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="repeating"
                  checked={formData.is_repeating}
                  onChange={(e) => setFormData({ ...formData, is_repeating: e.target.checked, shift_date: "" })}
                  className="w-4 h-4 rounded"
                />
                <Label htmlFor="repeating" className="m-0">Repeating Shift Pattern</Label>
              </div>

              {!formData.is_repeating && (
                <div>
                  <Label>Shift Date</Label>
                  <Input 
                    type="date"
                    value={formData.shift_date}
                    onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
                  />
                </div>
              )}

              {formData.is_repeating && (
                <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
                  <div>
                    <Label className="mb-2 block">Repeat On Days</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {DAYS.map(day => (
                        <label key={day} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.repeat_days.includes(day)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, repeat_days: [...formData.repeat_days, day] });
                              } else {
                                setFormData({ ...formData, repeat_days: formData.repeat_days.filter(d => d !== day) });
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm capitalize">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Weekends Off</Label>
                    <div className="flex gap-4">
                      {WEEKENDS.map(day => (
                        <label key={day} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.weekends_off.includes(day)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, weekends_off: [...formData.weekends_off, day] });
                              } else {
                                setFormData({ ...formData, weekends_off: formData.weekends_off.filter(d => d !== day) });
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm capitalize">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input 
                        type="date"
                        value={formData.repeat_start_date}
                        onChange={(e) => setFormData({ ...formData, repeat_start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input 
                        type="date"
                        value={formData.repeat_end_date}
                        onChange={(e) => setFormData({ ...formData, repeat_end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Notes</Label>
              <Input 
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={handleSave} 
                disabled={createShiftMutation.isPending || updateShiftMutation.isPending}
              >
                {editingShift ? "Update Shift" : "Create Shift"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const REACH_KEY = ["emailRecipientReach"];
const CHEF_KEY = ["emailHeadChefStatus"];

/** Live staff lists for Admin › Email (approvers, Operations & Kitchen, all employees, Head Chef) plus test sends. */
export function useEmailRecipients() {
  const queryClient = useQueryClient();
  const reach = useQuery({
    queryKey: REACH_KEY,
    queryFn: async () => (await base44.functions.invoke("emailSettingsAdmin", { action: "status" })).data,
  });
  const chef = useQuery({
    queryKey: CHEF_KEY,
    queryFn: async () => (await base44.functions.invoke("notifyHeadChefEventConfirmed", { mode: "status" })).data,
  });
  const employees = useMemo(() => reach.data?.employees || [], [reach.data]);
  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  // Empty id = no fixed Head Chef; the brief goes to the one employee holding the Chef permission.
  const setHeadChef = async (employeeId) => {
    await base44.functions.invoke("emailSettingsAdmin", { action: "set_head_chef", employee_id: employeeId });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: CHEF_KEY }),
      queryClient.invalidateQueries({ queryKey: ["catering-settings"] }),
    ]);
  };

  // target "me" or "added" (the saved added people). Returns { sent, failures }.
  const sendTest = async (key, target) => {
    const res = await base44.functions.invoke("emailSettingsAdmin", { action: "send_test", key, target });
    await queryClient.invalidateQueries({ queryKey: ["emailActivity"] });
    return res.data;
  };

  return {
    reach: reach.data, chef: chef.data, employees, employeeById,
    isLoading: reach.isLoading || chef.isLoading, setHeadChef, sendTest,
  };
}
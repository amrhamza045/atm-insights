import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, Clock, Gift, ShoppingCart, AlertCircle, Settings as SettingsIcon, CalendarDays } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import moment from "moment";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

const iconMap = {
  milestone: Gift,
  registration: CheckCircle,
  redemption: Gift,
  promotion: AlertCircle,
  system: SettingsIcon,
  order: ShoppingCart,
  catering_assignment: CalendarDays,
  default: Bell
};

import { useIsAdmin, usePermissions } from "@/components/permissions/PermissionsContext";

export default function NotificationDropdown({ currentUser, client }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const { permissions } = usePermissions();
  // Each pending-action list follows the permission that handles it.
  const can = (key) => isAdmin || permissions?.[key] === true;
  const QUEUE_KEYS = ["registrations_approve", "payouts_approve", "level_upgrade_approve", "cashier_edit", "catering_edit"];
  const seesQueues = QUEUE_KEYS.some(can);

  // Fetch notifications for client
  const { data: clientNotifications = [] } = useQuery({
    queryKey: ["notifications", client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      return await base44.entities.Notification.filter({ client_id: client.id }, "-created_date", 50);
    },
    enabled: !!client?.id && !seesQueues
  });

  // Staff notifications: join current user → Employee by email (same pattern as the Layout)
  const { data: employee } = useQuery({
    queryKey: ["notif-employee", currentUser?.email],
    queryFn: async () => {
      const rows = await base44.entities.Employee.filter({ email: currentUser.email });
      return rows[0] || null;
    },
    enabled: !!currentUser?.email
  });

  const { data: employeeNotifications = [] } = useQuery({
    queryKey: ["employee-notifications", employee?.id],
    queryFn: () => base44.entities.Notification.filter({ recipient_type: "employee", employee_id: employee.id }, "-created_date", 50),
    enabled: !!employee?.id
  });

  // Notifications addressed to the user account (requisition notifications).
  const { data: userNotifications = [] } = useQuery({
    queryKey: ["user-notifications", currentUser?.id],
    queryFn: () => base44.entities.Notification.filter({ recipient_type: "user", user_id: currentUser.id }, "-created_date", 50),
    enabled: !!currentUser?.id
  });

  useEffect(() => {
    if (!currentUser?.id) return;
    return base44.entities.Notification.subscribe((event) => {
      if (event.data?.recipient_type === "user" && event.data?.user_id === currentUser.id) {
        queryClient.invalidateQueries({ queryKey: ["user-notifications", currentUser.id] });
      }
    });
  }, [currentUser?.id, queryClient]);

  useEffect(() => {
    if (!employee?.id) return;
    return base44.entities.Notification.subscribe((event) => {
      if (event.data?.recipient_type === "employee" && event.data?.employee_id === employee.id) {
        queryClient.invalidateQueries({ queryKey: ["employee-notifications", employee.id] });
      }
    });
  }, [employee?.id, queryClient]);

  // Fetch admin notifications (pending approvals, etc.)
  const { data: registrationRequests = [] } = useQuery({
    queryKey: ["registrationRequests"],
    queryFn: () => base44.entities.RegistrationRequest.filter({ status: "pending_admin" }),
    enabled: can("registrations_approve")
  });

  const { data: payoutRequests = [] } = useQuery({
    queryKey: ["payouts"],
    queryFn: () => base44.entities.Payout.filter({ status: "pending" }),
    enabled: can("payouts_approve")
  });

  const { data: levelUpgradeRequests = [] } = useQuery({
    queryKey: ["levelUpgradeRequests"],
    queryFn: () => base44.entities.LevelUpgradeRequest.filter({ status: "pending_admin" }),
    enabled: can("level_upgrade_approve")
  });

  const { data: pendingOrders = [] } = useQuery({
    queryKey: ["pendingOrders"],
    queryFn: () => base44.entities.Order.filter({ status: "pending" }),
    enabled: can("cashier_edit")
  });

  const { data: cateringDecisions = [] } = useQuery({
    queryKey: ["cateringApprovalAlerts"],
    queryFn: async () => {
      const [accepted, rejected] = await Promise.all([
        base44.entities.CateringQuote.filter({ status: "accepted", staff_acknowledged: false }, "-customer_decision_date", 25),
        base44.entities.CateringQuote.filter({ status: "rejected", staff_acknowledged: false }, "-customer_decision_date", 25),
      ]);
      return [...accepted, ...rejected].filter((q) => q.customer_decision_date);
    },
    enabled: can("catering_edit")
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.update(notificationId, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["employee-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    }
  });

  const handleNotificationClick = (notification) => {
    if (!seesQueues && !notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const handleAdminNotificationClick = (notification) => {
    // Where each admin notification opens. Payouts are approved in the
    // Approvals Center; orders live in Cashier › Orders.
    const typeToPath = {
      registration: createPageUrl("Admin") + "#registrations",
      upgrade: createPageUrl("Admin") + "#registrations",
      payout: "/Approvals",
      order: "/Cashier",
      catering_approval: "/Catering",
    };

    const path = typeToPath[notification.type];
    if (path) navigate(path);
  };

  // Calculate admin notification count
  const adminNotificationCount = seesQueues 
    ? registrationRequests.length + payoutRequests.length + levelUpgradeRequests.length + pendingOrders.length + cateringDecisions.length
    : 0;

  // Calculate client unread count
  const unreadCount = !seesQueues 
    ? clientNotifications.filter(n => !n.read).length 
    : 0;

  const employeeUnreadCount = [...employeeNotifications, ...userNotifications].filter(n => !n.read).length;
  const totalNotifications = (seesQueues ? adminNotificationCount : unreadCount) + employeeUnreadCount;

  // Build admin notification list
  const adminNotifications = seesQueues ? [
    ...registrationRequests.map(r => ({
      id: `reg-${r.id}`,
      title: "New Registration Request",
      message: `${r.full_name} is waiting for approval`,
      created_date: r.created_date,
      icon: "registration",
      type: "registration"
    })),
    ...payoutRequests.map(p => ({
      id: `payout-${p.id}`,
      title: "Payout Request",
      message: `${p.client_name} requested ${p.amount} EGP payout`,
      created_date: p.created_date,
      icon: "system",
      type: "payout"
    })),
    ...levelUpgradeRequests.map(l => ({
      id: `upgrade-${l.id}`,
      title: "Level Upgrade Request",
      message: `${l.client_name} wants to upgrade to ${l.new_level_name}`,
      created_date: l.created_date,
      icon: "promotion",
      type: "upgrade"
    })),
    ...cateringDecisions.map(q => ({
      id: `catering-${q.id}`,
      title: q.status === "accepted" ? "Catering booking approved" : "Catering quote rejected",
      message: `${q.client_name || "Customer"} ${q.status} "${q.event_name}" — ${q.customer_decision_total || q.total} EGP`,
      created_date: q.customer_decision_date,
      icon: q.status === "accepted" ? "registration" : "promotion",
      type: "catering_approval"
    })),
    ...pendingOrders.map(o => ({
      id: `order-${o.id}`,
      title: "New Order",
      message: `Order #${o.id.slice(0, 8)} for ${o.total} EGP`,
      created_date: o.created_date,
      icon: "order",
      type: "order"
    }))
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)) : [];

  const notifications = [...(seesQueues ? adminNotifications : clientNotifications), ...employeeNotifications, ...userNotifications]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  if (totalNotifications === 0 && !seesQueues) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative gap-1 px-2 sm:px-3">
          <Bell className="w-4 h-4" />
          {totalNotifications > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500">
              {totalNotifications > 9 ? "9+" : totalNotifications}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="p-4 border-b">
          <h3 className="font-semibold">
            {seesQueues ? "Pending Actions" : "Notifications"}
          </h3>
          <p className="text-xs text-slate-500">
            {totalNotifications} {seesQueues ? "items need your attention" : "unread"}
          </p>
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = iconMap[notification.icon] || iconMap.default;
                const isUnread = !notification.read;
                return (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (notification.recipient_type === "user") {
                        if (!notification.read) markAsReadMutation.mutate(notification.id);
                        if (notification.link_url) navigate(notification.link_url);
                      } else if (notification.recipient_type === "employee") {
                        if (!notification.read) markAsReadMutation.mutate(notification.id);
                        navigate(notification.entity_type === "attendance" ? "/EmployeeAttendance" : "/MyCustody");
                      } else if (seesQueues) {
                        handleAdminNotificationClick(notification);
                      } else {
                        handleNotificationClick(notification);
                      }
                    }}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                      isUnread ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isUnread ? "bg-blue-100" : "bg-slate-100"
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          isUnread ? "text-blue-600" : "text-slate-600"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 mb-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {moment(notification.created_date).fromNow()}
                        </p>
                      </div>
                      {isUnread && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
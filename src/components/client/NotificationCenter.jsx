import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Trophy, Gift, CheckCircle, Megaphone, Info, Check, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { usePullToRefresh } from "@/components/hooks/usePullToRefresh";

const notificationIcons = {
  milestone: Trophy,
  registration: CheckCircle,
  redemption: Gift,
  promotion: Megaphone,
  system: Info
};

const notificationColors = {
  milestone: "bg-amber-100 text-amber-700",
  registration: "bg-green-100 text-green-700",
  redemption: "bg-violet-100 text-violet-700",
  promotion: "bg-blue-100 text-blue-700",
  system: "bg-slate-100 text-slate-700"
};

export default function NotificationCenter({ clientId, compact = false }) {
  const [showAll, setShowAll] = useState(false);
  const [hiddenNotifications, setHiddenNotifications] = useState(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["notifications", clientId] });
      toast.success("Notifications refreshed!");
    } finally {
      setIsRefreshing(false);
    }
  };

  usePullToRefresh(handleRefresh, !compact);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", clientId],
    queryFn: () => base44.entities.Notification.filter({ client_id: clientId }, "-created_date"),
    enabled: !!clientId
  });

  // Auto-hide notifications after specified time
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.auto_hide_after && !hiddenNotifications.has(notification.id)) {
        const timer = setTimeout(() => {
          setHiddenNotifications(prev => new Set(prev).add(notification.id));
        }, notification.auto_hide_after);
        return () => clearTimeout(timer);
      }
    });
  }, [notifications, hiddenNotifications]);

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications", clientId] });
      const previousNotifications = queryClient.getQueryData(["notifications", clientId]);
      queryClient.setQueryData(["notifications", clientId], (old) =>
        old?.map(n => (n.id === id ? { ...n, read: true } : n)) || []
      );
      return { previousNotifications };
    },
    onError: (error, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", clientId], context.previousNotifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", clientId] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n => base44.entities.Notification.update(n.id, { read: true }))
      );
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications", clientId] });
      const previousNotifications = queryClient.getQueryData(["notifications", clientId]);
      queryClient.setQueryData(["notifications", clientId], (old) =>
        old?.map(n => ({ ...n, read: true })) || []
      );
      return { previousNotifications };
    },
    onError: (error, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", clientId], context.previousNotifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", clientId] });
      toast.success("All notifications marked as read");
    }
  });

  const visibleNotifications = notifications.filter(n => !hiddenNotifications.has(n.id));
  const unreadCount = visibleNotifications.filter(n => !n.read).length;
  const displayNotifications = showAll ? visibleNotifications : visibleNotifications.slice(0, 5);

  const handleMarkAsRead = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  if (compact) {
    return (
      <div className="relative">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
         <div className="flex items-center justify-between">
           <CardTitle className="flex items-center gap-2">
             <Bell className="w-5 h-5" />
             Notifications
             {unreadCount > 0 && (
               <Badge className="bg-red-500 text-white">{unreadCount} new</Badge>
             )}
           </CardTitle>
           <div className="flex gap-2">
             <Button
               variant="ghost"
               size="icon"
               onClick={handleRefresh}
               disabled={isRefreshing}
               className="h-8 w-8"
             >
               <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
             </Button>
             {unreadCount > 0 && (
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => markAllAsReadMutation.mutate()}
                 disabled={markAllAsReadMutation.isPending}
               >
                 <Check className="w-4 h-4 mr-2" />
                 Mark all read
               </Button>
             )}
           </div>
         </div>
       </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No notifications yet</p>
            <p className="text-sm text-slate-400 mt-1">You'll see updates about your account here</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {displayNotifications.map((notification, index) => {
                const Icon = notificationIcons[notification.type] || Info;
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleMarkAsRead(notification)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      notification.read
                        ? "bg-slate-50 border-slate-200"
                        : "bg-white border-amber-200 shadow-sm hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${notificationColors[notification.type]}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-medium ${notification.read ? "text-slate-600" : "text-slate-900"}`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${notification.read ? "text-slate-500" : "text-slate-600"}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(notification.created_date).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {visibleNotifications.length > 5 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? "Show Less" : `Show ${visibleNotifications.length - 5} More`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
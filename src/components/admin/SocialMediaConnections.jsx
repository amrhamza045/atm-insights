import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { SOCIAL_PLATFORMS } from "@/components/admin/social/socialPlatformMeta";
import SocialConnectionCard from "@/components/admin/social/SocialConnectionCard";

const notify = ({ status, message }) =>
  status === "connected" ? toast.success(message) : status === "error" ? toast.error(message) : toast.info(message);

export default function SocialMediaConnections() {
  const queryClient = useQueryClient();

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["social-connections"],
    queryFn: () => base44.entities.SocialMediaConnection.list(),
  });

  // Which required secrets are saved: yes / no only, the values never leave the server.
  const { data: savedSecrets } = useQuery({
    queryKey: ["social-secrets"],
    queryFn: async () => (await base44.functions.invoke("checkSocialConnection", { action: "secrets" })).data.secrets,
  });

  const save = (platform, data) => {
    const existing = connections.find((c) => c.platform === platform);
    return existing
      ? base44.entities.SocialMediaConnection.update(existing.id, data)
      : base44.entities.SocialMediaConnection.create({ platform, ...data });
  };
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["social-connections"] });

  const saveMutation = useMutation({
    mutationFn: ({ platform, data }) => save(platform, data),
    onSuccess: () => {
      refresh();
      toast.success("Connection settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  // Saves the card first, so the check runs against what is on screen.
  const checkMutation = useMutation({
    mutationFn: async ({ platform, data }) => {
      await save(platform, data);
      return (await base44.functions.invoke("checkSocialConnection", { action: "check", platform })).data;
    },
    onSuccess: (result) => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ["social-secrets"] });
      notify(result);
    },
    onError: (e) => {
      refresh();
      toast.error(e.response?.data?.error || e.message);
    },
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading connections...</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {SOCIAL_PLATFORMS.map((meta) => (
        <SocialConnectionCard
          key={meta.key}
          meta={meta}
          record={connections.find((c) => c.platform === meta.key)}
          savedSecrets={savedSecrets}
          isSaving={saveMutation.isPending}
          isChecking={checkMutation.isPending && checkMutation.variables?.platform === meta.key}
          onSave={(data) => saveMutation.mutate({ platform: meta.key, data })}
          onCheck={(data) => checkMutation.mutate({ platform: meta.key, data })}
        />
      ))}
    </div>
  );
}
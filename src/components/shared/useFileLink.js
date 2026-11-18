import { useQuery } from "@tanstack/react-query";
import { resolveFileLink } from "@/lib/privateFiles";

/** Resolves a stored file reference into a viewable link (for <img src>). */
export default function useFileLink(ref) {
  const { data } = useQuery({
    queryKey: ["fileLink", ref],
    queryFn: () => resolveFileLink(ref, 3600),
    enabled: !!ref,
    staleTime: 30 * 60 * 1000,
  });
  return data || "";
}
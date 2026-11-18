import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export const PROBLEM_STATUSES = ["partial", "failed", "no_recipients"];

/** Per email over the last 30 days (tests excluded): { sends, last, sent, failed }. */
export function useEmailStats() {
  return useQuery({
    queryKey: ["emailActivity", "stats"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { rows } = await base44.entities.EmailSendLog.aggregate({
        query: { is_test: false, created_date: { $gte: since } },
        groupBy: "email_key",
        max: ["created_date"],
        sum: ["sent_count", "failed_count"],
      });
      return Object.fromEntries(rows.map((r) => [r.email_key, {
        sends: r.count, last: r.max_created_date, sent: r.sum_sent_count || 0, failed: r.sum_failed_count || 0,
      }]));
    },
  });
}

/** Recent sends, newest first, one page at a time. key "all" = every email. */
export function useEmailActivity(key, problemsOnly) {
  return useInfiniteQuery({
    queryKey: ["emailActivity", "list", key, problemsOnly],
    initialPageParam: null,
    queryFn: ({ pageParam }) => base44.entities.EmailSendLog.filter(
      { ...(key !== "all" ? { email_key: key } : {}), ...(problemsOnly ? { status: { $in: PROBLEM_STATUSES } } : {}) },
      { sort: "-created_date", limit: 15, ...(pageParam ? { cursor: pageParam } : {}) },
    ),
    getNextPageParam: (page) => (page.has_more ? page.next_cursor : undefined),
  });
}
import { QueryClient } from "@tanstack/react-query";

// One report cache per header selection, so two companies' numbers never mix and
// switching back to a company shows its reports straight away.
const clients = new Map();

export function reportQueryClient(scopeKey) {
  if (!clients.has(scopeKey)) {
    clients.set(scopeKey, new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } }));
  }
  return clients.get(scopeKey);
}
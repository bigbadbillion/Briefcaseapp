import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { getAIInsights } from "@/lib/aiService";
import { useHoldings } from "@/hooks/useHoldings";

function buildHoldingsCacheKey(
  holdings: Array<{ id: string; updatedAt: string }>
): string {
  return holdings
    .map((h) => `${h.id}:${h.updatedAt}`)
    .sort()
    .join("|");
}

export function useAIInsights() {
  const { token, user } = useAuth();
  const { isPremium } = useSubscription();
  const { data: holdings = [] } = useHoldings();

  const holdingsKey = buildHoldingsCacheKey(holdings);

  return useQuery({
    queryKey: ["/api/ai/insights", user?.id, holdingsKey],
    queryFn: async () => {
      if (!token) {
        throw new Error("Not authenticated");
      }
      return getAIInsights(token);
    },
    enabled: isPremium && !!token && !!user?.id && holdings.length > 0,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useInvalidateAIInsights() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["/api/ai/insights"] });
  };
}

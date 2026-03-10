import { useQuery } from "@tanstack/react-query";
import { COINGECKO_ID_MAP } from "@/lib/coingecko-ids";

export function usePrices(symbols: string[]) {
  const symbolKey = symbols.sort().join(",");

  return useQuery({
    queryKey: ["prices", symbolKey],
    queryFn: async () => {
      const ids = symbols
        .map((symbol) => COINGECKO_ID_MAP[symbol])
        .filter((id) => id !== undefined);

      if (ids.length === 0) {
        return { prices: {}, lastUpdated: new Date().toISOString() };
      }

      const response = await fetch(`/api/prices?ids=${ids.join(",")}`);
      if (!response.ok) throw new Error("Failed to fetch prices");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    enabled: symbols.length > 0,
  });
}

export function usePrice(symbol: string) {
  const { data, ...rest } = usePrices([symbol]);
  return { data: data?.prices[symbol], ...rest };
}

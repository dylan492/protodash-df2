"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface EquityPrice {
  usd: number;
  usd_24h_change?: number;
}

interface EquityPriceData {
  prices: Record<string, EquityPrice>;
  timestamp: number;
}

const CACHE_KEY = "equity_prices_cache";
const CACHE_DURATION = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

export function useEquityPrices(symbols: string[]) {
  const [cachedData, setCachedData] = useState<EquityPriceData | null>(null);

  // Load cached data on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached) as EquityPriceData;
        const age = Date.now() - data.timestamp;
        
        if (age < CACHE_DURATION) {
          console.log(`[Equity Prices] Using cached data (${Math.round(age / 1000 / 60)} minutes old)`);
          setCachedData(data);
        } else {
          console.log(`[Equity Prices] Cache expired (${Math.round(age / 1000 / 60 / 60)} hours old)`);
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      console.error("[Equity Prices] Error loading cache:", error);
    }
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["equity-prices", symbols.join(",")],
    queryFn: async () => {
      // If we have valid cached data, return it immediately
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        console.log("[Equity Prices] Returning cached data");
        return cachedData;
      }

      console.log("[Equity Prices] Fetching fresh data from API");
      
      if (symbols.length === 0) {
        return { prices: {}, timestamp: Date.now() };
      }

      const response = await fetch(`/api/equity-prices?symbols=${symbols.join(",")}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch equity prices");
      }

      const result = await response.json();
      const dataWithTimestamp: EquityPriceData = {
        prices: result.prices || {},
        timestamp: Date.now(),
      };

      // Save to localStorage
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(dataWithTimestamp));
        console.log("[Equity Prices] Cached fresh data");
      } catch (error) {
        console.error("[Equity Prices] Error saving cache:", error);
      }

      return dataWithTimestamp;
    },
    enabled: symbols.length > 0,
    staleTime: CACHE_DURATION, // Consider data fresh for 5 hours
    gcTime: CACHE_DURATION, // Keep in cache for 5 hours
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component mount if we have data
    refetchInterval: false, // Disable automatic refetching
  });

  return {
    data: data || cachedData,
    isLoading: isLoading && !cachedData,
    error,
  };
}
import type { QueryKey, QueryOptions } from "./types.js";

/**
 * Serializes a query key to a string for consistent lookups.
 * Handles object key order normalization.
 */
export function serializeQueryKey(queryKey: QueryKey): string {
  return JSON.stringify(
    queryKey.map((key) => {
      if (typeof key === "object" && key !== null && !Array.isArray(key)) {
        // Normalize object keys by sorting them
        const sorted: Record<string, unknown> = {};
        const keys = Object.keys(key).sort();
        for (const k of keys) {
          sorted[k] = (key as Record<string, unknown>)[k];
        }
        return sorted;
      }
      return key;
    }),
  );
}

/**
 * Checks if a query key matches another (supports partial matching).
 * For partial matching, the target key should be a prefix of the query key.
 */
export function matchesQueryKey(queryKey: QueryKey, targetKey: QueryKey): boolean {
  if (targetKey.length === 0) {
    return true; // Empty key matches all
  }

  if (queryKey.length < targetKey.length) {
    return false;
  }

  for (let i = 0; i < targetKey.length; i++) {
    const queryItem = queryKey[i];
    const targetItem = targetKey[i];

    if (typeof targetItem === "object" && targetItem !== null && !Array.isArray(targetItem)) {
      // Deep equality check for objects
      if (typeof queryItem !== "object" || queryItem === null || Array.isArray(queryItem)) {
        return false;
      }
      if (!deepEqual(queryItem as Record<string, unknown>, targetItem as Record<string, unknown>)) {
        return false;
      }
    } else if (queryItem !== targetItem) {
      return false;
    }
  }

  return true;
}

/**
 * Deep equality check for objects (used in query key matching).
 */
function deepEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!(key in b)) {
      return false;
    }
    if (a[key] !== b[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Gets default query options with all required fields filled in.
 */
export function getDefaultQueryOptions<TData, TError>(
  options: QueryOptions<TData, TError>,
  defaultOptions?: Partial<Omit<QueryOptions<TData, TError>, "queryKey" | "queryFn">>,
): Required<QueryOptions<TData, TError>> {
  const defaults = {
    staleTime: 0,
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    retry: 3,
    throwError: false,
    ...defaultOptions,
  };

  return {
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    staleTime: options.staleTime ?? defaults.staleTime,
    cacheTime: options.cacheTime ?? defaults.cacheTime,
    refetchOnMount: options.refetchOnMount ?? defaults.refetchOnMount,
    retry: options.retry ?? defaults.retry,
    throwError: options.throwError ?? defaults.throwError,
  };
}

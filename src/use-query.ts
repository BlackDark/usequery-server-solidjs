import { createSignal, createEffect, onCleanup, untrack } from "solid-js";
import type { QueryOptions, QueryResult, QueryState } from "./types.js";
import { useQueryClient } from "./query-context.js";

/**
 * useQuery hook for fetching and managing query state.
 */
export function useQuery<TData = unknown, TError = Error>(
  options: QueryOptions<TData, TError>,
): QueryResult<TData, TError> {
  const client = useQueryClient();
  const cache = client.getCache();
  const defaultOptions = client.getDefaultOptions()?.queries;

  // Create reactive signals for query state
  const [state, setState] = createSignal<QueryState<TData, TError>>({
    data: undefined,
    error: null,
    isLoading: false,
    isFetching: false,
    isSuccess: false,
    isError: false,
    status: "pending",
    dataUpdatedAt: null,
    errorUpdatedAt: null,
  });

  // Function to update state from cache entry
  const updateFromCache = () => {
    const entry = cache.get<TData, TError>(options.queryKey);
    if (entry) {
      setState({ ...entry.state });
    }
  };

  // Initial state update
  updateFromCache();

  // Subscribe to cache updates
  let unsubscribe: (() => void) | null = null;
  createEffect(() => {
    // Re-subscribe when query key changes
    const key = options.queryKey;
    unsubscribe?.();
    unsubscribe = cache.subscribe(key, () => {
      updateFromCache();
    });
  });

  // Cleanup subscription
  onCleanup(() => {
    unsubscribe?.();
  });

  // Fetch query on mount or when options change
  createEffect(async () => {
    const entry = cache.get<TData, TError>(options.queryKey);
    const refetchOnMount = options.refetchOnMount ?? defaultOptions?.refetchOnMount ?? true;
    const shouldFetch =
      !entry || cache.isStale(entry) || refetchOnMount || entry.state.status === "pending";

    if (shouldFetch) {
      try {
        await client.fetchQuery(options.queryKey, options.queryFn, options);
        updateFromCache();
      } catch (error) {
        // Only re-throw if throwError is true
        const throwError = options.throwError ?? defaultOptions?.throwError ?? false;
        if (throwError) {
          throw error;
        }
        // Otherwise, error is in state
        updateFromCache();
      }
    } else {
      updateFromCache();
    }
  });

  // Check for Suspense - throw promise if loading (must be synchronous)
  const entry = cache.get<TData, TError>(options.queryKey);
  if (entry?.state.isLoading && entry.promise) {
    throw entry.promise as Promise<TData>;
  }

  // Create reactive getters
  const data = () => untrack(() => state().data);
  const error = () => untrack(() => state().error);
  const isLoading = () => untrack(() => state().isLoading);
  const isFetching = () => untrack(() => state().isFetching);
  const isSuccess = () => untrack(() => state().isSuccess);
  const isError = () => untrack(() => state().isError);
  const status = () => untrack(() => state().status);
  const dataUpdatedAt = () => untrack(() => state().dataUpdatedAt);
  const errorUpdatedAt = () => untrack(() => state().errorUpdatedAt);

  // Refetch function
  const refetch = async () => {
    try {
      await client.fetchQuery(options.queryKey, options.queryFn, options);
      updateFromCache();
    } catch (error) {
      const throwError = options.throwError ?? defaultOptions?.throwError ?? false;
      if (throwError) {
        throw error;
      }
      updateFromCache();
    }
  };

  // Invalidate function
  const invalidate = () => {
    client.invalidateQueries(options.queryKey);
    updateFromCache();
  };

  return {
    data,
    error,
    isLoading,
    isFetching,
    isSuccess,
    isError,
    status,
    dataUpdatedAt,
    errorUpdatedAt,
    refetch,
    invalidate,
  };
}

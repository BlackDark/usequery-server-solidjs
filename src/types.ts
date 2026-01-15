export type QueryKey = readonly unknown[];

export type QueryStatus = "pending" | "loading" | "success" | "error";

export interface QueryState<TData = unknown, TError = unknown> {
  data: TData | undefined;
  error: TError | null;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  status: QueryStatus;
  dataUpdatedAt: number | null;
  errorUpdatedAt: number | null;
}

export interface QueryOptions<TData = unknown, _TError = unknown> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  staleTime?: number; // Time before data is considered stale (ms)
  cacheTime?: number; // Time before cache is garbage collected (ms)
  refetchOnMount?: boolean;
  retry?: number | boolean; // Retry attempts on error
  throwError?: boolean; // Default: false - catch errors instead of throwing
}

export interface QueryClientOptions {
  defaultOptions?: {
    queries?: Partial<Omit<QueryOptions, "queryKey" | "queryFn">>;
  };
}

export interface QueryCacheEntry<TData = unknown, TError = Error> {
  queryKey: QueryKey;
  state: QueryState<TData, TError>;
  queryFn: () => Promise<TData>;
  options: Required<QueryOptions<TData, TError>>;
  promise: Promise<TData> | null;
  subscribers: Set<() => void>;
  createdAt: number;
  lastAccessedAt: number;
}

export interface QueryResult<TData = unknown, TError = Error> {
  data: () => TData | undefined;
  error: () => TError | null;
  isLoading: () => boolean;
  isFetching: () => boolean;
  isSuccess: () => boolean;
  isError: () => boolean;
  status: () => QueryStatus;
  dataUpdatedAt: () => number | null;
  errorUpdatedAt: () => number | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
}

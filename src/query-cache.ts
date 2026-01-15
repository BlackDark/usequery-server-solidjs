import type { QueryCacheEntry, QueryKey, QueryOptions, QueryState } from "./types.js";
import { serializeQueryKey, getDefaultQueryOptions, matchesQueryKey } from "./utils.js";

export class QueryCache {
  private cache = new Map<string, QueryCacheEntry<unknown, unknown>>();
  private gcInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start garbage collection interval
    this.startGarbageCollection();
  }

  /**
   * Gets a query from the cache by key.
   */
  get<TData, TError>(queryKey: QueryKey): QueryCacheEntry<TData, TError> | undefined {
    const key = serializeQueryKey(queryKey);
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccessedAt = Date.now();
    }
    return entry as QueryCacheEntry<TData, TError> | undefined;
  }

  /**
   * Finds all entries matching a query key pattern.
   */
  findAll(queryKey: QueryKey): QueryCacheEntry<unknown, unknown>[] {
    const entries: QueryCacheEntry<unknown, unknown>[] = [];
    for (const entry of this.cache.values()) {
      if (matchesQueryKey(entry.queryKey, queryKey)) {
        entries.push(entry);
      }
    }
    return entries;
  }

  /**
   * Gets or creates a query entry in the cache.
   */
  getOrCreate<TData, TError = Error>(
    queryKey: QueryKey,
    queryFn: () => Promise<TData>,
    options: QueryOptions<TData, TError>,
    defaultOptions?: Partial<Omit<QueryOptions<TData, TError>, "queryKey" | "queryFn">>,
  ): QueryCacheEntry<TData, TError> {
    const key = serializeQueryKey(queryKey);
    let entry = this.cache.get(key) as QueryCacheEntry<TData, TError> | undefined;

    if (!entry) {
      const fullOptions = getDefaultQueryOptions<TData, TError>(options, defaultOptions);
      entry = {
        queryKey,
        state: this.createInitialState<TData, TError>(),
        queryFn,
        options: fullOptions,
        promise: null,
        subscribers: new Set(),
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      };
      this.cache.set(key, entry as QueryCacheEntry<unknown, unknown>);
    } else {
      // Update last accessed time
      entry.lastAccessedAt = Date.now();
      // Update options if provided (for dynamic options)
      if (options) {
        const fullOptions = getDefaultQueryOptions<TData, TError>(options, defaultOptions);
        entry.options = fullOptions as Required<QueryOptions<TData, TError>>;
      }
    }

    return entry;
  }

  /**
   * Sets query data directly in the cache.
   */
  setData<TData>(queryKey: QueryKey, data: TData): void {
    const key = serializeQueryKey(queryKey);
    const entry = this.cache.get(key);
    if (entry) {
      entry.state = {
        ...entry.state,
        data,
        isSuccess: true,
        isError: false,
        isLoading: false,
        isFetching: false,
        status: "success",
        error: null,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: null,
      };
      this.notifySubscribers(entry);
    }
  }

  /**
   * Marks queries as stale (invalidates them).
   */
  invalidate(queryKey: QueryKey): void {
    const keysToInvalidate: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (matchesQueryKey(entry.queryKey, queryKey)) {
        keysToInvalidate.push(key);
      }
    }

    for (const key of keysToInvalidate) {
      const entry = this.cache.get(key);
      if (entry) {
        // Mark as stale by setting dataUpdatedAt to null
        entry.state.dataUpdatedAt = null;
        this.notifySubscribers(entry);
      }
    }
  }

  /**
   * Removes a query from the cache.
   */
  remove(queryKey: QueryKey): void {
    const key = serializeQueryKey(queryKey);
    this.cache.delete(key);
  }

  /**
   * Clears all queries from the cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Subscribes to query updates.
   */
  subscribe(queryKey: QueryKey, callback: () => void): () => void {
    const key = serializeQueryKey(queryKey);
    const entry = this.cache.get(key);
    if (entry) {
      entry.subscribers.add(callback);
      return () => {
        entry.subscribers.delete(callback);
      };
    }
    return () => {}; // No-op unsubscribe if entry doesn't exist
  }

  /**
   * Notifies all subscribers of a query entry.
   */
  notifySubscribers<TData, TError>(entry: QueryCacheEntry<TData, TError>): void {
    for (const callback of entry.subscribers) {
      callback();
    }
  }

  /**
   * Checks if a query is stale.
   */
  isStale<TData, TError>(entry: QueryCacheEntry<TData, TError>): boolean {
    if (!entry.state.dataUpdatedAt) {
      return true;
    }
    const now = Date.now();
    return now - entry.state.dataUpdatedAt > entry.options.staleTime;
  }

  /**
   * Checks if a query should be garbage collected.
   */
  shouldGarbageCollect<TData, TError>(entry: QueryCacheEntry<TData, TError>): boolean {
    if (entry.subscribers.size > 0) {
      return false; // Don't GC if there are active subscribers
    }
    const now = Date.now();
    return now - entry.lastAccessedAt > entry.options.cacheTime;
  }

  /**
   * Starts the garbage collection interval.
   */
  private startGarbageCollection(): void {
    // Run GC every 30 seconds
    this.gcInterval = setInterval(() => {
      this.garbageCollect();
    }, 30000);
  }

  /**
   * Stops the garbage collection interval.
   */
  stopGarbageCollection(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
  }

  /**
   * Garbage collects unused queries.
   */
  private garbageCollect(): void {
    const keysToRemove: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (this.shouldGarbageCollect(entry)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      this.cache.delete(key);
    }
  }

  /**
   * Creates initial query state.
   */
  private createInitialState<TData, TError>(): QueryState<TData, TError> {
    return {
      data: undefined,
      error: null,
      isLoading: false,
      isFetching: false,
      isSuccess: false,
      isError: false,
      status: "pending",
      dataUpdatedAt: null,
      errorUpdatedAt: null,
    };
  }
}

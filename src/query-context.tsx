import { createContext, useContext, type JSX } from "solid-js";
import type { QueryClient } from "./query-client.js";

const QueryClientContext = createContext<QueryClient>();

export interface QueryProviderProps {
  client: QueryClient;
  children: JSX.Element;
}

/**
 * QueryProvider component that provides QueryClient to all children.
 */
export function QueryProvider(props: QueryProviderProps): JSX.Element {
  return (
    <QueryClientContext.Provider value={props.client}>{props.children}</QueryClientContext.Provider>
  );
}

/**
 * Hook to access the QueryClient from context.
 */
export function useQueryClient(): QueryClient {
  const client = useContext(QueryClientContext);
  if (!client) {
    throw new Error("useQueryClient must be used within a QueryProvider");
  }
  return client;
}

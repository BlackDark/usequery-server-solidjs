# usequery-server-solidjs

A server-side query management library for SolidJS, inspired by TanStack Query, with automatic caching, invalidation, and state synchronization across the application.

Possible Usecases: OpenTUI, server only things, CLI applications.

## Features

- 🔄 **Automatic Caching** - Queries are cached and shared across components
- 🔁 **Automatic Invalidation** - Configurable stale time and cache time
- ⚡ **Reactive** - Built on SolidJS signals for optimal reactivity
- 🎯 **TypeScript** - Full type safety out of the box
- 🛡️ **Error Handling** - Errors are caught by default (configurable)
- 🔀 **Suspense Support** - Integrates with SolidJS Suspense boundaries
- 🚀 **Server-First** - Designed for server-side rendering and Node.js

## Installation

```bash
npm install usequery-server-solidjs
# or
bun add usequery-server-solidjs
```

## Quick Start

```tsx
import { QueryProvider, createQueryClient, useQuery } from "usequery-server-solidjs";
import { Component } from "solid-js";

// Create a query client
const queryClient = createQueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      cacheTime: 30000,
    },
  },
});

// Wrap your app with QueryProvider
function App() {
  return (
    <QueryProvider client={queryClient}>
      <UserProfile userId="123" />
    </QueryProvider>
  );
}

// Use queries in your components
function UserProfile(props: { userId: string }) {
  const query = useQuery({
    queryKey: ["user", props.userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${props.userId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (query.isLoading()) return <div>Loading...</div>;
  if (query.isError()) return <div>Error: {query.error()?.message}</div>;
  return <div>{query.data()?.name}</div>;
}
```

## API Reference

### `createQueryClient(options?)`

Creates a new QueryClient instance.

```tsx
const client = createQueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      cacheTime: 30000,
      retry: 3,
      throwError: false,
    },
  },
});
```

### `QueryProvider`

Context provider that makes QueryClient available to all children.

```tsx
<QueryProvider client={queryClient}>
  {children}
</QueryProvider>
```

### `useQuery(options)`

Hook for fetching and managing query state.

**Options:**
- `queryKey` - Array-based key to identify the query
- `queryFn` - Function that returns a Promise
- `staleTime?` - Time before data is considered stale (ms, default: 0)
- `cacheTime?` - Time before cache is garbage collected (ms, default: 5min)
- `refetchOnMount?` - Refetch when component mounts (default: true)
- `retry?` - Number of retry attempts or boolean (default: 3)
- `throwError?` - Throw errors instead of catching (default: false)

**Returns:**
- `data()` - The query data (reactive)
- `error()` - The error if any (reactive)
- `isLoading()` - True while initial fetch is in progress
- `isFetching()` - True while any fetch is in progress
- `isSuccess()` - True if query succeeded
- `isError()` - True if query failed
- `status()` - Current status: "pending" | "loading" | "success" | "error"
- `refetch()` - Function to manually refetch
- `invalidate()` - Function to mark query as stale

### `useQueryClient()`

Hook to access the QueryClient instance.

```tsx
const client = useQueryClient();
client.invalidateQueries(["users"]);
```

## Examples

### Basic Setup with QueryProvider

```tsx
// app.tsx
import { QueryProvider, createQueryClient } from "usequery-server-solidjs";
import { Component } from "solid-js";

const queryClient = createQueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      cacheTime: 30000,
    },
  },
});

function App() {
  return (
    <QueryProvider client={queryClient}>
      <UserProfile userId="123" />
    </QueryProvider>
  );
}
```

### Basic Query Usage

```tsx
// UserProfile.tsx
import { useQuery } from "usequery-server-solidjs";
import { Component, Show } from "solid-js";

interface User {
  id: string;
  name: string;
  email: string;
}

const UserProfile: Component<{ userId: string }> = (props) => {
  const query = useQuery<User, Error>({
    queryKey: ["user", props.userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${props.userId}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json() as Promise<User>;
    },
    staleTime: 10000,
  });

  return (
    <div>
      <Show when={query.isLoading()}>
        <div>Loading user...</div>
      </Show>

      <Show when={query.isError()}>
        <div>Error: {query.error()?.message}</div>
      </Show>

      <Show when={query.isSuccess()}>
        <h1>{query.data()?.name}</h1>
        <p>{query.data()?.email}</p>
      </Show>
    </div>
  );
};
```

### With Suspense

```tsx
// UserProfileWithSuspense.tsx
import { useQuery } from "usequery-server-solidjs";
import { Component, Suspense, Show } from "solid-js";

const UserProfile: Component<{ userId: string }> = (props) => {
  const query = useQuery({
    queryKey: ["user", props.userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${props.userId}`);
      return res.json();
    },
  });

  // Suspense will handle loading state
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Show when={query.isError()}>
        <div>Error: {query.error()?.message}</div>
      </Show>
      <Show when={query.isSuccess()}>
        <h1>{query.data()?.name}</h1>
      </Show>
    </Suspense>
  );
};
```

### Manual Refetch and Invalidation

```tsx
// PostsList.tsx
import { useQuery } from "usequery-server-solidjs";
import { Component, For, Show } from "solid-js";

interface Post {
  id: string;
  title: string;
  content: string;
}

const PostsList: Component = () => {
  const query = useQuery<Post[]>({
    queryKey: ["posts"],
    queryFn: async () => {
      const res = await fetch("/api/posts");
      return res.json();
    },
  });

  return (
    <div>
      <button onClick={() => query.refetch()}>Refresh Posts</button>

      <button onClick={() => query.invalidate()}>Invalidate Cache</button>

      <Show when={query.isLoading()}>
        <div>Loading posts...</div>
      </Show>

      <Show when={query.isError()}>
        <div>Error: {query.error()?.message}</div>
      </Show>

      <Show when={query.isSuccess()}>
        <For each={query.data()}>
          {(post) => (
            <article>
              <h2>{post.title}</h2>
              <p>{post.content}</p>
            </article>
          )}
        </For>
      </Show>
    </div>
  );
};
```

### Error Handling (Default - Caught)

```tsx
// ErrorHandlingExample.tsx
import { useQuery } from "usequery-server-solidjs";
import { Component, Show } from "solid-js";

const ErrorExample: Component = () => {
  // Default: throwError is false, errors are caught
  const query = useQuery({
    queryKey: ["failing-query"],
    queryFn: async () => {
      throw new Error("Something went wrong");
    },
    // throwError: false (default)
  });

  // Error is accessible via query.error, not thrown
  return (
    <Show when={query.isError()}>
      <div class="error">
        <p>Error occurred: {query.error()?.message}</p>
        <button onClick={() => query.refetch()}>Retry</button>
      </div>
    </Show>
  );
};
```

### Error Handling (With throwError)

```tsx
// ErrorThrowingExample.tsx
import { useQuery } from "usequery-server-solidjs";
import { ErrorBoundary } from "solid-js";

const ThrowingErrorExample = () => {
  const query = useQuery({
    queryKey: ["throwing-query"],
    queryFn: async () => {
      throw new Error("This will be thrown");
    },
    throwError: true, // Errors will be thrown
  });

  // If error occurs, ErrorBoundary will catch it
  return <div>{query.data()}</div>;
};

// Usage with ErrorBoundary
function App() {
  return (
    <ErrorBoundary fallback={(err) => <div>Caught: {err.message}</div>}>
      <ThrowingErrorExample />
    </ErrorBoundary>
  );
}
```

### Query Invalidation from QueryClient

```tsx
// UserActions.tsx
import { useQueryClient } from "usequery-server-solidjs";
import { Component } from "solid-js";

const UserActions: Component<{ userId: string }> = (props) => {
  const queryClient = useQueryClient();

  const handleUpdateUser = async () => {
    // Update user via API
    await fetch(`/api/users/${props.userId}`, { method: "PUT" });

    // Invalidate all user queries
    queryClient.invalidateQueries(["user"]);

    // Or invalidate specific user
    queryClient.invalidateQueries(["user", props.userId]);
  };

  return <button onClick={handleUpdateUser}>Update User</button>;
};
```

### Multiple Components Sharing Query

```tsx
// Component1.tsx
const Component1: Component = () => {
  const query = useQuery({
    queryKey: ["shared-data"],
    queryFn: () => fetch("/api/data").then((r) => r.json()),
  });
  return <div>Component 1: {query.data()}</div>;
};

// Component2.tsx
const Component2: Component = () => {
  // Same query key = shared cache and state
  const query = useQuery({
    queryKey: ["shared-data"],
    queryFn: () => fetch("/api/data").then((r) => r.json()),
  });
  return <div>Component 2: {query.data()}</div>;
};

// Both components share the same query instance
// Refetching in one updates both
```

### Server-Side Usage (SolidStart)

```tsx
// routes/users/[id].tsx (SolidStart route)
import {
  QueryProvider,
  createQueryClient,
  useQuery,
} from "usequery-server-solidjs";
import { Component } from "solid-js";

export default function UserPage() {
  // Create isolated client per request
  const queryClient = createQueryClient();

  return (
    <QueryProvider client={queryClient}>
      <UserContent />
    </QueryProvider>
  );
}

function UserContent() {
  const query = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      // Server-side fetch
      return fetch("/api/user").then((r) => r.json());
    },
  });

  return <div>{query.data()?.name}</div>;
}
```

## Error Handling Guide

By default, `usequery-server-solidjs` catches all errors and stores them in the query state. This prevents errors from crashing your application and allows you to handle them gracefully.

### Default Behavior (Errors Caught)

```tsx
const query = useQuery({
  queryKey: ["data"],
  queryFn: async () => {
    throw new Error("Something went wrong");
  },
  // throwError: false (default)
});

// Error is in state, not thrown
if (query.isError()) {
  console.log(query.error()?.message); // "Something went wrong"
}
```

### Throwing Errors (Optional)

If you want errors to be thrown (e.g., for ErrorBoundary), set `throwError: true`:

```tsx
const query = useQuery({
  queryKey: ["data"],
  queryFn: async () => {
    throw new Error("This will be thrown");
  },
  throwError: true,
});

// Error will be thrown and can be caught by ErrorBoundary
```

## Advanced Patterns

### Query Key Patterns

Query keys are arrays that can contain any serializable values:

```tsx
// Simple key
["users"]

// With parameters
["users", userId]

// With object parameters (order doesn't matter)
["posts", { page: 1, limit: 10 }]
["posts", { limit: 10, page: 1 }] // Same as above

// Nested keys
["users", userId, "posts"]
```

### Partial Invalidation

You can invalidate multiple queries by using a partial key:

```tsx
// Invalidate all user queries
client.invalidateQueries(["users"]);

// Invalidate all posts for a specific user
client.invalidateQueries(["users", userId, "posts"]);
```

### Manual Cache Updates

```tsx
const client = useQueryClient();

// Set data directly
client.setQueryData(["user", "1"], { id: "1", name: "Updated" });

// Get cached data
const user = client.getQueryData(["user", "1"]);
```

## TypeScript

Full TypeScript support with type inference:

```tsx
interface User {
  id: string;
  name: string;
}

const query = useQuery<User, Error>({
  queryKey: ["user", "1"],
  queryFn: async (): Promise<User> => {
    return fetch("/api/user/1").then((r) => r.json());
  },
});

// query.data() is typed as User | undefined
// query.error() is typed as Error | null
```

## Key Differences from TanStack Query

1. **SolidJS signals** instead of React hooks
2. **Server-first** design (no browser-specific optimizations)
3. **Default error catching** (configurable via `throwError`)
4. **Simplified API** - focus on core query features
5. **Context-based** instead of singleton QueryClient

## License

MIT

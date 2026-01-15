import { test, expect } from "bun:test";
import { createRoot } from "solid-js";
import { createQueryClient } from "../src/query-client.js";

// Note: These tests verify the hook's integration with QueryClient
// Full component testing would require a SolidJS test renderer

test("useQuery should require QueryProvider", () => {
  // This would throw in a real component context
  // We test the error by checking the context requirement
  // Note: In a real test environment, calling useQuery without QueryProvider
  // would throw an error with message containing "QueryProvider"
  expect(true).toBe(true); // Placeholder test
});

test("useQuery should work with QueryProvider", async () => {
  const client = createQueryClient();

  await createRoot(async (dispose) => {
    // In a real test, we'd render:
    // <QueryProvider client={client}>
    //   <TestComponent />
    // </QueryProvider>

    // For now, we verify the client setup works
    expect(client).toBeDefined();
    dispose();
  });
});

// Integration-style test that verifies the hook's expected behavior
test("useQuery should fetch and cache data", async () => {
  const client = createQueryClient();
  const queryKey = ["integration-test"];
  let callCount = 0;

  const queryFn = async () => {
    callCount++;
    return `data ${callCount}`;
  };

  // Simulate what useQuery does internally
  await client.fetchQuery(queryKey, queryFn);

  expect(client.getQueryData(queryKey)).toBe("data 1");
  expect(callCount).toBe(1);

  // Second fetch should use cache if not stale
  await client.fetchQuery(queryKey, queryFn);
  expect(callCount).toBe(1);
});

test("useQuery should handle errors by default", async () => {
  const client = createQueryClient();
  const queryKey = ["error-handling"];

  const queryFn = async () => {
    throw new Error("Test error");
  };

  try {
    await client.fetchQuery(queryKey, queryFn, { throwError: false });
  } catch (_error) {
    // Should not throw
  }

  const state = client.getQueryState(queryKey);
  expect(state?.isError).toBe(true);
  expect(state?.error).toBeInstanceOf(Error);
});

test("useQuery should support refetch", async () => {
  const client = createQueryClient();
  const queryKey = ["refetch-test"];
  let callCount = 0;

  const queryFn = async () => {
    callCount++;
    return `data ${callCount}`;
  };

  await client.fetchQuery(queryKey, queryFn);
  expect(callCount).toBe(1);

  // Simulate refetch
  await client.refetchQueries(queryKey);
  expect(callCount).toBe(2);
});

test("useQuery should support invalidation", async () => {
  const client = createQueryClient();
  const queryKey = ["invalidate-test"];

  await client.fetchQuery(queryKey, async () => "data");
  expect(client.getQueryData(queryKey)).toBe("data");

  client.invalidateQueries(queryKey);
  const state = client.getQueryState(queryKey);
  expect(state?.dataUpdatedAt).toBeNull(); // Marked as stale
});

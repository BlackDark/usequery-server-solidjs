import { test, expect } from "bun:test";
import { createQueryClient } from "../src/query-client.js";

test("end-to-end: fetch, cache, invalidate, refetch", async () => {
  const client = createQueryClient();
  const queryKey = ["e2e-test"];
  let callCount = 0;

  const queryFn = async () => {
    callCount++;
    return { id: callCount, data: `result ${callCount}` };
  };

  // 1. Initial fetch
  const result1 = await client.fetchQuery(queryKey, queryFn);
  expect(result1).toEqual({ id: 1, data: "result 1" });
  expect(callCount).toBe(1);
  expect(client.getQueryData(queryKey)).toEqual({ id: 1, data: "result 1" });

  // 2. Second fetch should use cache (not stale)
  const result2 = await client.fetchQuery(queryKey, queryFn, {
    staleTime: 1000,
  });
  expect(result2).toEqual({ id: 1, data: "result 1" });
  expect(callCount).toBe(1); // Still 1

  // 3. Wait for stale
  await new Promise((resolve) => setTimeout(resolve, 1100));

  // 4. Fetch again should refetch
  const result3 = await client.fetchQuery(queryKey, queryFn, {
    staleTime: 1000,
  });
  expect(result3).toEqual({ id: 2, data: "result 2" });
  expect(callCount).toBe(2);

  // 5. Invalidate
  client.invalidateQueries(queryKey);
  const state = client.getQueryState(queryKey);
  expect(state?.dataUpdatedAt).toBeNull();

  // 6. Refetch after invalidation
  await client.refetchQueries(queryKey);
  expect(callCount).toBe(3);
  expect(client.getQueryData(queryKey)).toEqual({
    id: 3,
    data: "result 3",
  });
});

test("end-to-end: multiple queries with shared prefix", async () => {
  const client = createQueryClient();

  await client.fetchQuery(["users", "1"], async () => "user1");
  await client.fetchQuery(["users", "2"], async () => "user2");
  await client.fetchQuery(["posts", "1"], async () => "post1");

  expect(client.getQueryData(["users", "1"])).toBe("user1");
  expect(client.getQueryData(["users", "2"])).toBe("user2");
  expect(client.getQueryData(["posts", "1"])).toBe("post1");

  // Invalidate all user queries
  client.invalidateQueries(["users"]);

  expect(client.getQueryState(["users", "1"])?.dataUpdatedAt).toBeNull();
  expect(client.getQueryState(["users", "2"])?.dataUpdatedAt).toBeNull();
  expect(client.getQueryState(["posts", "1"])?.dataUpdatedAt).not.toBeNull();
});

test("end-to-end: error handling with retry", async () => {
  const client = createQueryClient();
  const queryKey = ["error-retry"];
  let attemptCount = 0;

  const queryFn = async () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error(`Attempt ${attemptCount} failed`);
    }
    return "success";
  };

  const result = await client.fetchQuery(queryKey, queryFn, {
    retry: 3,
    throwError: false,
  });

  expect(result).toBe("success");
  expect(attemptCount).toBe(3);

  const state = client.getQueryState(queryKey);
  expect(state?.isSuccess).toBe(true);
  expect(state?.data).toBe("success");
});

test("end-to-end: error handling without retry", async () => {
  const client = createQueryClient();
  const queryKey = ["error-no-retry"];

  const queryFn = async () => {
    throw new Error("Always fails");
  };

  try {
    await client.fetchQuery(queryKey, queryFn, {
      retry: false,
      throwError: false,
    });
  } catch (_error) {
    // Should not throw
  }

  const state = client.getQueryState(queryKey);
  expect(state?.isError).toBe(true);
  expect(state?.error).toBeInstanceOf(Error);
  expect((state?.error as Error).message).toBe("Always fails");
});

test("end-to-end: default options inheritance", async () => {
  const client = createQueryClient({
    defaultOptions: {
      queries: {
        staleTime: 500,
        retry: 2,
      },
    },
  });

  const queryKey = ["defaults-test"];
  let callCount = 0;

  const queryFn = async () => {
    callCount++;
    return "data";
  };

  // First fetch
  await client.fetchQuery(queryKey, queryFn);
  expect(callCount).toBe(1);

  // Second fetch immediately should use cache (staleTime: 500)
  await client.fetchQuery(queryKey, queryFn);
  expect(callCount).toBe(1);

  // Wait for stale
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Should refetch now
  await client.fetchQuery(queryKey, queryFn);
  expect(callCount).toBe(2);
});

test("end-to-end: query key serialization with objects", async () => {
  const client = createQueryClient();

  const key1 = ["test", { id: 1, name: "test" }];
  const key2 = ["test", { name: "test", id: 1 }]; // Different order

  await client.fetchQuery(key1, async () => "data1");

  // Should find the same cached data
  const data = client.getQueryData(key2);
  expect(data).toBe("data1");
});

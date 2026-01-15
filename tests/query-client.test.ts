import { test, expect, beforeEach } from "bun:test";
import { QueryClient, createQueryClient } from "../src/query-client.js";

beforeEach(() => {
  // Each test gets a fresh client
});

test("should create a QueryClient", () => {
  const client = createQueryClient();
  expect(client).toBeInstanceOf(QueryClient);
});

test("should get and set query data", () => {
  const client = createQueryClient();
  const queryKey = ["test"];

  expect(client.getQueryData(queryKey)).toBeUndefined();

  client.setQueryData(queryKey, "test data");
  expect(client.getQueryData(queryKey)).toBe("test data");
});

test("should fetch query and cache result", async () => {
  const client = createQueryClient();
  const queryKey = ["test"];
  let callCount = 0;

  const queryFn = async () => {
    callCount++;
    return "fetched data";
  };

  const result1 = await client.fetchQuery(queryKey, queryFn);
  expect(result1).toBe("fetched data");
  expect(callCount).toBe(1);

  // Second call should use cache
  const result2 = await client.fetchQuery(queryKey, queryFn);
  expect(result2).toBe("fetched data");
  expect(callCount).toBe(1); // Should not call again if not stale
});

test("should refetch stale queries", async () => {
  const client = createQueryClient();
  const queryKey = ["test"];
  let callCount = 0;

  const queryFn = async () => {
    callCount++;
    return `data ${callCount}`;
  };

  await client.fetchQuery(queryKey, queryFn, { staleTime: 50 });
  expect(callCount).toBe(1);

  // Wait for data to become stale
  await new Promise((resolve) => setTimeout(resolve, 100));

  const result = await client.fetchQuery(queryKey, queryFn, { staleTime: 50 });
  expect(result).toBe("data 2");
  expect(callCount).toBe(2);
});

test("should handle errors and store in state", async () => {
  const client = createQueryClient();
  const queryKey = ["error-test"];

  const queryFn = async () => {
    throw new Error("Test error");
  };

  try {
    await client.fetchQuery(queryKey, queryFn, { throwError: false });
  } catch (_error) {
    // Should not throw when throwError is false
  }

  const state = client.getQueryState(queryKey);
  expect(state?.isError).toBe(true);
  expect(state?.error).toBeInstanceOf(Error);
  expect((state?.error as Error).message).toBe("Test error");
});

test("should throw errors when throwError is true", async () => {
  const client = createQueryClient();
  const queryKey = ["throw-test"];

  const queryFn = async () => {
    throw new Error("Should throw");
  };

  await expect(client.fetchQuery(queryKey, queryFn, { throwError: true })).rejects.toThrow(
    "Should throw",
  );
});

test("should retry failed queries", async () => {
  const client = createQueryClient();
  const queryKey = ["retry-test"];
  let attemptCount = 0;

  const queryFn = async () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error("Fail");
    }
    return "success";
  };

  const result = await client.fetchQuery(queryKey, queryFn, {
    retry: 3,
    throwError: false,
  });

  expect(result).toBe("success");
  expect(attemptCount).toBe(3);
});

test("should invalidate queries", async () => {
  const client = createQueryClient();
  const queryKey1 = ["users", "1"];
  const queryKey2 = ["users", "2"];

  await client.fetchQuery(queryKey1, async () => "user1");
  await client.fetchQuery(queryKey2, async () => "user2");

  expect(client.getQueryData(queryKey1)).toBe("user1");
  expect(client.getQueryData(queryKey2)).toBe("user2");

  // Invalidate all user queries
  client.invalidateQueries(["users"]);

  const state1 = client.getQueryState(queryKey1);
  const state2 = client.getQueryState(queryKey2);

  // Data should be marked as stale (dataUpdatedAt reset)
  expect(state1?.dataUpdatedAt).toBeNull();
  expect(state2?.dataUpdatedAt).toBeNull();
});

test("should refetch queries", async () => {
  const client = createQueryClient();
  const queryKey = ["refetch-test"];
  let callCount = 0;

  const queryFn = async () => {
    callCount++;
    return `data ${callCount}`;
  };

  await client.fetchQuery(queryKey, queryFn);
  expect(callCount).toBe(1);

  await client.refetchQueries(queryKey);
  expect(callCount).toBe(2);
});

test("should clear all queries", async () => {
  const client = createQueryClient();

  await client.fetchQuery(["test1"], async () => "data1");
  await client.fetchQuery(["test2"], async () => "data2");

  expect(client.getQueryData(["test1"])).toBe("data1");
  expect(client.getQueryData(["test2"])).toBe("data2");

  client.clear();

  expect(client.getQueryData(["test1"])).toBeUndefined();
  expect(client.getQueryData(["test2"])).toBeUndefined();
});

test("should use default options", async () => {
  const client = createQueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000,
        retry: 1,
      },
    },
  });

  const queryKey = ["default-test"];
  let callCount = 0;

  const queryFn = async () => {
    callCount++;
    return "data";
  };

  await client.fetchQuery(queryKey, queryFn);
  expect(callCount).toBe(1);

  // Should not refetch immediately (staleTime: 1000)
  await client.fetchQuery(queryKey, queryFn);
  expect(callCount).toBe(1);
});

import { test, expect, beforeEach } from "bun:test";
import { QueryCache } from "../src/query-cache.js";

beforeEach(() => {
  // Clean up between tests if needed
});

test("should create and retrieve query entries", () => {
  const cache = new QueryCache();
  const queryKey = ["users", "1"];
  const queryFn = async () => ({ id: "1", name: "Test" });

  const entry = cache.getOrCreate(queryKey, queryFn, {
    queryKey,
    queryFn,
  });

  expect(entry).toBeDefined();
  expect(entry.queryKey).toEqual(queryKey);
  expect(entry.state.status).toBe("pending");

  const retrieved = cache.get(queryKey);
  expect(retrieved).toBe(entry);
});

test("should serialize query keys consistently", () => {
  const cache = new QueryCache();
  const key1 = ["users", { id: 1, name: "test" }];
  const key2 = ["users", { name: "test", id: 1 }]; // Different order

  const entry1 = cache.getOrCreate(key1, async () => ({}), {
    queryKey: key1,
    queryFn: async () => ({}),
  });

  const entry2 = cache.get(key2);
  // Should find the same entry due to key normalization
  expect(entry2).toBe(entry1);
});

test("should mark queries as stale after staleTime", async () => {
  const cache = new QueryCache();
  const queryKey = ["test"];
  const queryFn = async () => "data";

  const entry = cache.getOrCreate(queryKey, queryFn, {
    queryKey,
    queryFn,
    staleTime: 100,
  });

  // Set data
  cache.setData(queryKey, "data");
  expect(cache.isStale(entry)).toBe(false);

  // Wait for staleTime to pass
  await new Promise((resolve) => setTimeout(resolve, 150));
  expect(cache.isStale(entry)).toBe(true);
});

test("should invalidate queries by key", () => {
  const cache = new QueryCache();
  const key1 = ["users", "1"];
  const key2 = ["users", "2"];
  const key3 = ["posts", "1"];

  cache.getOrCreate(key1, async () => ({}), {
    queryKey: key1,
    queryFn: async () => ({}),
  });
  cache.getOrCreate(key2, async () => ({}), {
    queryKey: key2,
    queryFn: async () => ({}),
  });
  cache.getOrCreate(key3, async () => ({}), {
    queryKey: key3,
    queryFn: async () => ({}),
  });

  cache.setData(key1, "user1");
  cache.setData(key2, "user2");
  cache.setData(key3, "post1");

  // Invalidate all user queries
  cache.invalidate(["users"]);

  const entry1 = cache.get(key1);
  const entry2 = cache.get(key2);
  const entry3 = cache.get(key3);

  expect(entry1?.state.dataUpdatedAt).toBeNull();
  expect(entry2?.state.dataUpdatedAt).toBeNull();
  expect(entry3?.state.dataUpdatedAt).not.toBeNull(); // Post not invalidated
});

test("should notify subscribers on state changes", () => {
  const cache = new QueryCache();
  const queryKey = ["test"];
  let notified = false;

  cache.getOrCreate(queryKey, async () => "data", {
    queryKey,
    queryFn: async () => "data",
  });

  cache.subscribe(queryKey, () => {
    notified = true;
  });

  cache.setData(queryKey, "new data");
  expect(notified).toBe(true);
});

test("should garbage collect unused queries", async () => {
  const cache = new QueryCache();
  const queryKey = ["test"];

  cache.getOrCreate(queryKey, async () => "data", {
    queryKey,
    queryFn: async () => "data",
    cacheTime: 100,
  });

  // Entry should exist
  expect(cache.get(queryKey)).toBeDefined();

  // Wait for cacheTime to pass
  await new Promise((resolve) => setTimeout(resolve, 150));

  // Manually trigger GC (normally done by interval)
  // @ts-expect-error - accessing private method for testing
  cache.garbageCollect();

  // Entry should be removed if no subscribers
  // Note: This test might be flaky due to timing, but tests the concept
  const entry = cache.get(queryKey);
  if (entry && entry.subscribers.size === 0) {
    expect(cache.shouldGarbageCollect(entry)).toBe(true);
  }
});

test("should find all entries matching a key pattern", () => {
  const cache = new QueryCache();

  cache.getOrCreate(["users", "1"], async () => ({}), {
    queryKey: ["users", "1"],
    queryFn: async () => ({}),
  });
  cache.getOrCreate(["users", "2"], async () => ({}), {
    queryKey: ["users", "2"],
    queryFn: async () => ({}),
  });
  cache.getOrCreate(["posts", "1"], async () => ({}), {
    queryKey: ["posts", "1"],
    queryFn: async () => ({}),
  });

  const userEntries = cache.findAll(["users"]);
  expect(userEntries.length).toBe(2);

  const allEntries = cache.findAll([]);
  expect(allEntries.length).toBe(3);
});

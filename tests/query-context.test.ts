import { expect, test } from "bun:test";
import { renderToString } from "solid-js/web";
import { QueryProvider } from "../src/query-context.js";
import { createQueryClient } from "../src/query-client.js";

test("QueryProvider renders on the server without DOM globals", () => {
  const client = createQueryClient();
  const html = renderToString(() => QueryProvider({ client, children: "server child" }));
  expect(html).toBe("server child");
});

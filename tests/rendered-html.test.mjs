import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the sorting studio with the definition collapsed", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Sort Lab — Sorting Studio<\/title>/i);
  assert.match(html, /Sorting studio/);
  assert.match(html, /Definition/);
  assert.match(html, /Story sentences/);
  assert.match(html, /Agent/);
  assert.doesNotMatch(html, /Sort program|Validate &amp; compile/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

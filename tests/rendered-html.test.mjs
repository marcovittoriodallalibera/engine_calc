import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the complete calculator shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("content-security-policy") ?? "", /object-src 'none'/);

  const html = await response.text();
  assert.match(html, /<title>Two-stroke timing workbench \| Phase 360<\/title>/i);
  assert.match(html, /See the whole cycle, not isolated numbers\./);
  assert.match(html, /360° timing map/);
  assert.match(html, /Compression/);
  assert.match(html, /Squish geometry/);
  assert.match(html, /Time-area/);
  assert.match(html, /Client-only calculation/);
  assert.match(html, /Private-by-default two-stroke geometry/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site|react-loading-skeleton/);
});

test("renders accessible controls and explicit interpretation limits", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /aria-label="Engine inputs"/);
  assert.match(html, /aria-label="Calculated results"/);
  assert.match(html, /aria-label="Induction mode"/);
  assert.match(html, /simultaneous geometric opening only/);
  assert.match(html, /not a dynamic pressure or detonation prediction/);
  assert.match(html, /No universal safe squish target is applied/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
  assert.equal(response.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.match(
    response.headers.get("strict-transport-security") ?? "",
    /max-age=63072000/,
  );
  assert.match(response.headers.get("content-security-policy") ?? "", /object-src 'none'/);
  assert.match(response.headers.get("content-security-policy") ?? "", /form-action 'self'/);

  const html = await response.text();
  assert.match(html, /<title>Two-stroke timing workbench \| Phase 360<\/title>/i);
  assert.match(html, /Vespa 51 mm study/);
  assert.match(html, /Live slider-crank geometry across one complete crankshaft cycle\./);
  assert.match(html, /360° timing map/);
  assert.match(html, />Print</);
  assert.match(html, /Project report/);
  assert.match(html, /Project code/);
  assert.match(html, /Project date/);
  assert.match(html, /Engine details/);
  assert.match(html, /Clear local data/);
  assert.match(html, /Two-stroke timing report/);
  assert.match(html, /Authoritative project inputs/);
  assert.match(html, /Port measurements/);
  assert.match(html, /Generated/);
  assert.match(html, /Cylinder lift study/);
  assert.match(html, /Installed cylinder lift/);
  assert.match(html, /aria-label="Rotary calculation mode"/);
  assert.match(html, /Size physical arcs/);
  assert.match(html, /Rotary geometry solver/);
  assert.match(html, /Desired inlet opening/);
  assert.match(html, /Desired inlet closing/);
  assert.match(html, /Valve timing-track diameter/);
  assert.match(html, /Diameter uncertainty/);
  assert.match(html, /aria-label="Manual arc measurement"/);
  assert.match(html, /Measured crank cut-away arc/);
  assert.match(html, /Measured arc uncertainty/);
  assert.match(html, /Calculated crankcase valve opening/);
  assert.match(html, /Solved arc geometry/);
  assert.match(html, /aria-label="Rotary inlet area source"/);
  assert.match(html, /Common axial overlap width/);
  assert.match(html, /Axial width uncertainty/);
  assert.match(html, /Interpretation profile/);
  assert.match(html, /Touring box/);
  assert.match(html, /Sport box/);
  assert.match(html, /Road expansion/);
  assert.match(html, /Race expansion/);
  assert.match(html, /Engine character estimate/);
  assert.match(html, /Transmission/);
  assert.match(html, /Drive pinion/);
  assert.match(html, /Driven gear/);
  assert.match(html, /Cluster pinion/);
  assert.match(html, /Gear wheel/);
  assert.match(html, /aria-label="1st gear cluster pinion teeth"/);
  assert.match(html, /aria-label="4th gear gear wheel teeth"/);
  assert.match(html, /aria-label="Number of transmission gears"/);
  assert.match(html, /Rolling circumference/);
  assert.match(html, /Transmission and road speed/);
  assert.match(html, /Road speed, km\/h/);
  assert.match(html, /Engine speed, RPM/);
  assert.match(html, /aria-label="Scrollable transmission chart"/);
  assert.match(html, /Transmission ratios and theoretical road speed by gear/);
  assert.match(html, /Transmission source/);
  assert.match(html, /Rotary inlet opening area/);
  assert.match(html, /Specific time-area across RPM/);
  assert.match(html, /Profile-qualified annotations/);
  assert.match(html, /No performance score is generated/);
  assert.match(html, /Rule, scope and limits/);
  assert.match(html, /Evidence boundary/);
  assert.doesNotMatch(html, /\/100 nominal|Nominal marker|Measurement range/);
  assert.match(html, /Cycle overview/);
  assert.match(html, /aria-label="Project menu"/);
  assert.match(html, /Diagnostic levels/);
  assert.match(html, /Calculated geometry/);
  assert.match(html, /Profile heuristic/);
  assert.match(html, /Measured or modelled/);
  assert.match(html, /Compression/);
  assert.match(html, /Squish geometry/);
  assert.match(html, /Time-area/);
  assert.match(html, /Calculation is local to this browser\./);
  assert.match(html, /Private-by-default two-stroke geometry/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site|react-loading-skeleton/);
});

test("renders accessible controls and explicit interpretation limits", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /aria-labelledby="engine-setup-heading"/);
  assert.match(html, /aria-label="Calculated results"/);
  assert.match(html, /aria-label="Induction mode"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Measure along the arc, not as a\s+straight chord/i);
  assert.match(html, /one physical arc is measured; the other\s+is calculated/i);
  assert.match(html, /aria-label="Adjust cylinder lift in 0.1 millimetre steps"/);
  assert.match(html, /Increase cylinder lift by 0.1 millimetres/);
  assert.match(html, /stroke and\s+rod length stay unchanged/i);
  assert.match(html, /Assembled no-spacer baseline volume above the piston at TDC/);
  assert.match(html, /simultaneous geometric opening only/);
  assert.match(html, /analysed separately from opening overlap/i);
  assert.match(html, /Geometric specific time-area/);
  assert.match(html, /measurement bounds/i);
  assert.match(html, /No output curve is predicted/i);
  assert.match(html, /No performance score is generated/i);
  assert.match(html, /not a dynamic pressure or detonation prediction/);
  assert.match(html, /No universal safe squish target is applied/);
  assert.match(html, /does not predict an achievable maximum speed/i);
});

test("keeps character graph values visible in the print report", async () => {
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const printStyles = css.slice(css.indexOf("@media print"));

  assert.match(
    printStyles,
    /\.chart-data-disclosure\s*\{[^}]*display:\s*block;/su,
  );
  assert.match(
    printStyles,
    /\.chart-data-disclosure:not\(\[open\]\)\s*>\s*\.table-scroll/su,
  );
  assert.match(printStyles, /\.gearing-results\s*\{[^}]*break-before:\s*page;/su);
  assert.match(printStyles, /\.gearing-chart-frame\s*\{[^}]*margin-top:/su);
  assert.match(printStyles, /\.gearing-chart\s*\{[^}]*min-width:\s*0;/su);
});

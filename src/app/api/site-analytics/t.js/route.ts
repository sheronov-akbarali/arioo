import { NextResponse } from "next/server";

// Served as a static, cacheable snippet the tracked site embeds via
// <script defer data-site="KEY" src=".../api/site-analytics/t.js">. It
// derives the collect endpoint from its own <script> src so it always
// points back at this app, regardless of what domain it's embedded on.
const SCRIPT = `(function () {
  var el = document.currentScript;
  var key = el && el.getAttribute("data-site");
  if (!key) return;
  var endpoint = el.src.replace(/\\/t\\.js(\\?.*)?$/, "/collect");
  var payload = JSON.stringify({ key: key, path: location.pathname, referrer: document.referrer || null });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([payload], { type: "application/json" }));
      return;
    }
  } catch (e) {}
  fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(function () {});
})();
`;

export async function GET() {
  return new NextResponse(SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

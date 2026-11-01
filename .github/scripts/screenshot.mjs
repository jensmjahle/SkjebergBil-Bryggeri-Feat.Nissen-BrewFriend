// Take screenshots of app pages with Playwright, logged in as a test user.
//
// Usage:
//   node .github/scripts/screenshot.mjs <out-dir> <prefix> <path> [path ...]
//   e.g. node .github/scripts/screenshot.mjs /tmp/shots after /oppskrifter /brygg/123
//
// For each path it saves <prefix>-<page>-desktop.png (1280px wide) and
// <prefix>-<page>-mobile.png (390px wide), full page.
//
// Login: uses SCREENSHOT_USERNAME / SCREENSHOT_PASSWORD when set, otherwise
// registers (or logs in) a throwaway "ci-screenshots" user on the local API.
// The JWT is written to /tmp/screenshot-token so you can create sample data
// through the API (Authorization: Bearer <token>) before taking screenshots.
//
// Env: APP_URL (default http://127.0.0.1:4173), API_URL (default http://127.0.0.1:3000)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(join(process.cwd(), "noop.js"));
const { chromium } = require("playwright");

const [outDir, prefix, ...paths] = process.argv.slice(2);
if (!outDir || !prefix || paths.length === 0) {
  console.error("Usage: screenshot.mjs <out-dir> <prefix> <path> [path ...]");
  process.exit(2);
}

const APP_URL = process.env.APP_URL || "http://127.0.0.1:4173";
const API_URL = process.env.API_URL || "http://127.0.0.1:3000";

async function getToken() {
  const post = (route, body) =>
    fetch(`${API_URL}/api/auth/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const username = process.env.SCREENSHOT_USERNAME || "ci-screenshots";
  const password = process.env.SCREENSHOT_PASSWORD || "ci-screenshots-password";

  let res = await post("login", { username, password });
  if (!res.ok && !process.env.SCREENSHOT_USERNAME) {
    res = await post("register", { username, password, name: "CI Screenshots" });
  }
  if (!res.ok) {
    console.warn(`Login failed (${res.status}); taking screenshots logged out.`);
    return null;
  }
  const { token } = await res.json();
  writeFileSync("/tmp/screenshot-token", token, { mode: 0o600 });
  return token;
}

const slug = (p) =>
  p.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() || "home";

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

mkdirSync(outDir, { recursive: true });
const token = await getToken();
const browser = await chromium.launch();
const saved = [];

try {
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    if (token) {
      await context.addInitScript((t) => {
        sessionStorage.setItem("jwt", t);
        localStorage.setItem("jwt", t);
      }, token);
    }
    const page = await context.newPage();
    for (const p of paths) {
      await page.goto(new URL(p, APP_URL).toString(), { waitUntil: "networkidle" });
      await page.waitForTimeout(800); // let animations / charts settle
      const file = join(outDir, `${prefix}-${slug(p)}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      saved.push(file);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(saved.join("\n"));

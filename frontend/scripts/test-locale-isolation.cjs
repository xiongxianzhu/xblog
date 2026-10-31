const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const {NextRequest, NextResponse} = require("next/server");
function load(file, modules) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
  }).outputText;
  vm.runInNewContext(code, {exports, Headers, require(name) {
    if (name in modules) return modules[name];
    if (name.startsWith("../messages/")) return JSON.parse(fs.readFileSync("messages/" + name.split("/").pop(), "utf8"));
    throw new Error(name);
  }});
  return exports;
}
const routing = load("i18n/routing.ts", {"next-intl/routing": {defineRouting: (x) => x}});
let path, jar, writes;
const storage = {
  cookies: async () => ({get: (name) => jar[name] ? {value: jar[name]} : undefined,
    set: (...args) => writes.push(args)}),
  headers: async () => new Headers({"x-pathname": path}),
};
const config = load("i18n/request.ts", {
  "next/headers": storage, "next-intl/server": {getRequestConfig: (fn) => fn}, "./routing": routing,
}).default;
const actions = load("lib/locale-actions.ts", {"next/headers": storage, "@/i18n/routing": routing});
const proxy = load("proxy.ts", {
  "next/server": {NextRequest, NextResponse}, "./i18n/routing": routing,
  "next-intl/middleware": {default: () => () => NextResponse.next()},
}).proxy;
(async () => {
  for (const site of routing.locales) for (const admin of routing.locales) {
    jar = {SITE_LOCALE: site, ADMIN_LOCALE: admin};
    path = "/admin/posts";
    assert.equal((await config({requestLocale: Promise.resolve(site)})).locale, admin);
    path = "/about";
    assert.equal((await config({requestLocale: Promise.resolve(undefined)})).locale, site);
    for (const locale of routing.locales) {
      const response = proxy(new NextRequest(`http://localhost:10241/${locale}/admin/posts?q=1`, {
        headers: {cookie: `SITE_LOCALE=${site}; ADMIN_LOCALE=${admin}`},
      }));
      assert.equal(response.headers.get("location"), "http://localhost:10241/admin/posts?q=1");
      assert.equal(response.headers.get("set-cookie"), null);
    }
    writes = []; await actions.setAdminLocale(admin);
    assert.equal(writes.length, 1); assert.equal(writes[0][0], "ADMIN_LOCALE");
    writes = []; await actions.setSiteLocale(site);
    assert.equal(writes.length, 1); assert.equal(writes[0][0], "SITE_LOCALE");
  }
  path = "/admin"; jar = {SITE_LOCALE: "en"};
  assert.equal((await config({requestLocale: Promise.resolve("en")})).locale, "zh-CN");
  jar.ADMIN_LOCALE = "invalid";
  assert.equal((await config({requestLocale: Promise.resolve("zh-TW")})).locale, "zh-CN");
  writes = []; await actions.setAdminLocale("invalid"); await actions.setSiteLocale("invalid");
  assert.equal(writes.length, 0);
  console.log("Locale isolation passed: 9 preference combinations, 27 legacy redirects, independent writes and defaults.");
})().catch((error) => {console.error(error); process.exitCode = 1;});

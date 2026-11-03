const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { transformSync } = require("esbuild");
const { NextRequest, NextResponse } = require("next/server");
function load(file, modules) {
  const moduleObject = { exports: {} };
  const code = transformSync(fs.readFileSync(file, "utf8"), {
    loader: "ts",
    format: "cjs",
    target: "es2017",
    supported: { "dynamic-import": false },
  }).code;
  vm.runInNewContext(code, {
    module: moduleObject,
    exports: moduleObject.exports,
    Headers,
    process: { env: { NODE_ENV: "production" } },
    require(name) {
      if (name in modules) return modules[name];
      if (name.startsWith("../messages/"))
        return JSON.parse(fs.readFileSync(`messages/${name.split("/").pop()}`, "utf8"));
      throw new Error(name);
    },
  });
  return moduleObject.exports;
}
const routing = load("i18n/routing.ts", { "next-intl/routing": { defineRouting: (x) => x } });
let path, jar, writes;
const storage = {
  cookies: async () => ({
    get: (name) => (jar[name] ? { value: jar[name] } : undefined),
    set: (...args) => writes.push(args),
  }),
  headers: async () => new Headers({ "x-pathname": path }),
};
const config = load("i18n/request.ts", {
  "next/headers": storage,
  "next-intl/server": { getRequestConfig: (fn) => fn },
  "./routing": routing,
}).default;
const actions = load("lib/locale-actions.ts", { "next/headers": storage, "@/i18n/routing": routing });
const proxy = load("proxy.ts", {
  "next/server": { NextRequest, NextResponse },
  "./i18n/routing": routing,
  "next-intl/middleware": { __esModule: true, default: () => () => NextResponse.next() },
}).proxy;
(async () => {
  for (const site of routing.locales)
    for (const admin of routing.locales) {
      jar = { SITE_LOCALE: site, ADMIN_LOCALE: admin };
      path = "/about";
      assert.equal((await config({ requestLocale: Promise.resolve(site) })).locale, site);
      path = "/about";
      assert.equal((await config({ requestLocale: Promise.resolve(undefined) })).locale, site);
      for (const locale of routing.locales) {
        const response = proxy(
          new NextRequest(`http://localhost:10241/${locale}/admin/posts?q=1`, {
            headers: { cookie: `SITE_LOCALE=${site}; ADMIN_LOCALE=${admin}` },
          }),
        );
        assert.equal(response.headers.get("location"), "http://localhost:10241/admin/posts?q=1");
        assert.equal(response.headers.get("set-cookie"), null);
      }
      writes = [];
      await actions.setSiteLocale(site);
      assert.equal(writes.length, 1);
      assert.equal(writes[0][0], "SITE_LOCALE");
    }
  path = "/";
  jar = { ADMIN_LOCALE: "en" };
  assert.equal((await config({ requestLocale: Promise.resolve(undefined) })).locale, "zh-CN");
  jar.SITE_LOCALE = "invalid";
  assert.equal((await config({ requestLocale: Promise.resolve(undefined) })).locale, "zh-CN");
  writes = [];
  await actions.setSiteLocale("invalid");
  assert.equal(writes.length, 0);
  console.log(
    "Locale isolation passed: 9 preference combinations, 27 legacy redirects, independent writes and defaults.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

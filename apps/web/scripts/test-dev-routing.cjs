const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { transformSync } = require("esbuild");
const { NextRequest, NextResponse } = require("next/server");
function load(file, environment, modules) {
  const moduleObject = { exports: {} };
  const code = transformSync(fs.readFileSync(file, "utf8"), { loader: "ts", format: "cjs" }).code;
  vm.runInNewContext(code, {
    module: moduleObject,
    exports: moduleObject.exports,
    URL,
    Headers,
    process: { env: environment },
    require(name) {
      if (name in modules) return modules[name];
      throw new Error(name);
    },
  });
  return moduleObject.exports;
}
(async () => {
  for (const mode of ["development", "production"]) {
    const environment = { NODE_ENV: mode };
    const config = load("next.config.ts", environment, {
      "next-intl/plugin": { __esModule: true, default: () => (value) => value },
    }).default;
    const routes = await config.rewrites();
    assert.equal(routes.beforeFiles.length, 0);
    const proxy = load("proxy.ts", environment, {
      "next/server": { NextRequest, NextResponse },
      "next-intl/middleware": { __esModule: true, default: () => () => NextResponse.next() },
      "./i18n/routing": { locales: ["zh-CN", "zh-TW", "en"], routing: {} },
    }).proxy;
    for (const path of ["/admin", "/admin/", "/admin/posts"]) {
      const response = proxy(new NextRequest(`http://localhost:10241${path}`));
      assert.equal(response.status, 404);
      assert.equal(response.headers.get("location"), null);
    }
  }
  console.log("Dev routing passed: web/admin isolation in development and production.");
  const guarded = load(
    "proxy.ts",
    {},
    {
      "next/server": { NextRequest, NextResponse },
      "next-intl/middleware": {
        __esModule: true,
        default: () => () => NextResponse.redirect("http://localhost:10241/blog/test"),
      },
      "./i18n/routing": { locales: ["zh-CN", "zh-TW", "en"], routing: {} },
    },
  ).proxy;
  const internal = guarded(
    new NextRequest("http://localhost:10241/zh-CN/blog/test", {
      headers: { "x-next-intl-locale": "zh-CN" },
    }),
  );
  assert.equal(internal.status, 200);
  assert.equal(internal.headers.get("location"), null);
  assert.equal(guarded(new NextRequest("http://localhost:10241/zh-CN/blog/test")).status, 307);
  assert.equal(
    guarded(
      new NextRequest("http://localhost:10241/zh-CN/admin", {
        headers: { "x-next-intl-locale": "zh-CN" },
      }),
    ).headers.get("location"),
    "http://localhost:10241/admin",
  );
  console.log("Locale rewrite recursion and legacy admin redirect guards passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

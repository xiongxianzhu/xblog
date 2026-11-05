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
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

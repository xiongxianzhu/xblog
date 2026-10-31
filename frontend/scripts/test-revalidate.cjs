const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const calls = [];
const exportsObject = {};
const code = ts.transpileModule(fs.readFileSync("app/api/revalidate/route.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
vm.runInNewContext(code, {
  exports: exportsObject,
  process: { env: { REVALIDATE_SECRET: "test-secret" } },
  require(name) {
    if (name === "next/server") return { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } };
    if (name === "next/cache") return {
      revalidatePath: (...args) => calls.push(["path", ...args]),
      revalidateTag: (...args) => calls.push(["tag", ...args]),
    };
    if (name === "@/i18n/routing") {
      // Read the actual locale list, without initializing next-intl.
      const source = fs.readFileSync("i18n/routing.ts", "utf8");
      return { locales: JSON.parse(source.match(/export const locales = (\[[^;]+?\]) as const/)[1]) };
    }
    if (name === "@/lib/site-theme") return { SITE_THEME_CACHE_TAG: "site-theme" };
    throw new Error(name);
  },
});
(async () => {
  const post = (body) => exportsObject.POST({ json: async () => body });
  assert.equal((await post({ secret: "wrong", paths: ["/about"] })).status, 401);
  assert.equal(calls.length, 0);
  const response = await post({ secret: "test-secret", paths: ["/about", "/projects", "/zh-CN/about", "/links"] });
  for (const path of ["/about", "/projects", "/links"]) {
    for (const prefix of ["", "/zh-CN", "/zh-TW", "/en"]) {
      assert(calls.some((call) => call[0] === "path" && call[1] === prefix + path));
    }
  }
  assert.equal(response.body.paths.length, 12);
  calls.length = 0;
  await post({ secret: "test-secret", paths: ["/"], layout: true });
  for (const path of ["/", "/zh-CN", "/zh-TW", "/en"]) {
    assert(calls.some((call) => call[0] === "path" && call[1] === path && call[2] === "layout"));
  }
  assert(calls.some((call) => call[0] === "tag" && call[1] === "site-theme" && call[2].expire === 0));
  console.log("Revalidation: authentication, all locales, deduplication, layouts and immediate expiry passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });

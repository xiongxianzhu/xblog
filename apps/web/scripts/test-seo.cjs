const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { transformSync } = require("esbuild");
let domain = "https://blog.xxivo.com";
const theme = { getPublicSiteTheme: async () => ({ site_base_url: domain }) };
function load(file, deps) {
  const m = { exports: {} };
  vm.runInNewContext(transformSync(fs.readFileSync(file, "utf8"), { loader: "ts", format: "cjs" }).code, {
    module: m,
    exports: m.exports,
    URL,
    process: { env: {} },
    require: (name) => deps[name],
  });
  return m.exports;
}
(async () => {
  const seo = load("lib/seo.ts", { "@/lib/site-theme": theme });
  assert.equal(seo.resolveSiteUrl(domain, "https://fallback.test"), domain);
  assert.equal(seo.resolveSiteUrl("javascript:alert(1)", "https://fallback.test/"), "https://fallback.test");
  assert.equal(
    seo.siteUrl("https://example.test/sub", "/blog/test", "en"),
    "https://example.test/sub/en/blog/test",
  );
  const dangerous = { headline: "</script><script>alert(1)</script>&" };
  assert.ok(!seo.jsonLd(dangerous).includes("<"));
  assert.equal(JSON.parse(seo.jsonLd(dangerous)).headline, dangerous.headline);
  assert.equal(seo.xmlText("a&<b>"), "a&amp;&lt;b&gt;");
  const posts = Array.from({ length: 237 }, (_, i) => ({ slug: `中文-${i}` }));
  const sitemap = load("app/sitemap.ts", {
    "@/lib/seo": seo,
    "@/lib/site-theme": theme,
    "@/lib/api": {
      listPublishedPostsForSitemap: async () => posts,
      listTags: async () => [{ slug: "标签", post_count: 1 }],
    },
  }).default;
  const routes = await sitemap();
  assert.equal(routes.filter((r) => r.url.includes("/blog/")).length, 237);
  assert.ok(routes.every((r) => !r.url.includes("/search") && !r.lastModified));
  assert.ok(routes.some((r) => r.url.includes(encodeURIComponent("中文-236"))));
  domain = "https://new.example";
  assert.ok((await sitemap()).every((r) => r.url.startsWith(domain)));
  assert.equal(
    (await seo.pageSeo("/blog?page=2", "en")).alternates.canonical,
    "https://new.example/en/blog?page=2",
  );
  console.log(
    "SEO: configured domain, domain changes, canonical paths, full sitemap and output escaping passed.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

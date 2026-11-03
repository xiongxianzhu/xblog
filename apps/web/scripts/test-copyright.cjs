const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { transformSync } = require("esbuild");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
async function main() {
  const markdown = await import("react-markdown");
  const moduleObject = { exports: {} };
  const code = transformSync(fs.readFileSync("components/article-copyright.tsx", "utf8"), {
    loader: "tsx",
    format: "cjs",
    jsx: "automatic",
  }).code;
  vm.runInNewContext(code, {
    module: moduleObject,
    exports: moduleObject.exports,
    require: (name) => (name === "react-markdown" ? markdown.default : require(name)),
  });
  const render = (enabled, content) =>
    renderToStaticMarkup(
      React.createElement(moduleObject.exports.ArticleCopyright, { enabled, content, title: "版权声明" }),
    );
  assert.equal(render(false, "内容"), "");
  assert.equal(render(true, "  "), "");
  const html = render(true, "遵循 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.zh-hans)。");
  assert.match(html, /版权声明/);
  assert.match(html, /href="https:\/\/creativecommons.org\/licenses\/by\/4.0\/deed.zh-hans"/);
  const unsafe = render(true, "<script>alert(1)</script>\n\n[危险](javascript:alert%281%29)");
  assert.doesNotMatch(unsafe, /<script|href="javascript:/);
  console.log(
    "Article copyright passed: enabled/disabled, empty content, Markdown link and unsafe HTML/URL handling.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

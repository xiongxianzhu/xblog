const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { transformSync } = require("esbuild");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

async function main() {
  const [{ default: Markdown }, { default: raw }] = await Promise.all([
    import("react-markdown"),
    import("rehype-raw"),
  ]);
  const moduleObject = { exports: {} };
  const code = transformSync(fs.readFileSync("src/lib/markdown-headings.ts", "utf8"), {
    loader: "ts",
    format: "cjs",
  }).code;
  vm.runInNewContext(code, { module: moduleObject, exports: moduleObject.exports });
  const render = (content) =>
    renderToStaticMarkup(
      React.createElement(Markdown, {
        rehypePlugins: [raw, moduleObject.exports.rehypeHeadingIds],
        children: content,
      }),
    );
  const html = render(
    [
      '<div align="center">',
      "",
      "[关于我](#关于我) / [技术栈](#技术栈) / [找到我](#找到我)",
      "",
      "</div>",
      "",
      "## 关于我",
      "",
      "## **技术栈**",
      "",
      "## 找到我",
      "",
      "## 技术栈",
      "",
      '<h3 id="custom">自定义标题</h3>',
      "",
      "### Hello World!",
      "",
      "#### 👋",
    ].join("\n"),
  );
  for (const id of ["关于我", "技术栈", "找到我"]) {
    assert.ok(html.includes(`href="#${encodeURIComponent(id)}"`) || html.includes(`href="#${id}"`), html);
    assert.ok(html.includes(`id="${id}"`));
  }
  assert.match(html, /id="技术栈-4"/);
  assert.match(html, /id="custom"/);
  assert.match(html, /id="hello-world"/);
  assert.match(html, /id="section-7"/);
  assert.equal(new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])).size, 7);
  assert.ok(render("## 技术栈").includes('id="技术栈"'), "IDs reset on each render");
  console.log("Markdown heading anchors passed.");
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

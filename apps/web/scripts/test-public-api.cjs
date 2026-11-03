const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { transformSync } = require("esbuild");
const calls = [];
const moduleObject = { exports: {} };
const code = transformSync(fs.readFileSync("lib/api.ts", "utf8"), {
  loader: "ts",
  format: "cjs",
  target: "es2022",
}).code;
vm.runInNewContext(code, {
  module: moduleObject,
  exports: moduleObject.exports,
  URL,
  AbortSignal,
  process: { env: { BACKEND_URL: "http://api.test" } },
  fetch: async (url, options) => {
    const request = new URL(url);
    const page = Number(request.searchParams.get("page"));
    const size = Number(request.searchParams.get("page_size"));
    assert(size > 0 && size <= 50);
    assert(options.signal instanceof AbortSignal);
    calls.push(page);
    const start = (page - 1) * size;
    const items = Array.from({ length: Math.min(size, 137 - start) }, (_, index) => ({
      id: start + index + 1,
    }));
    return new Response(
      JSON.stringify({ code: 0, msg: "ok", data: { items, total: 137, page, page_size: size } }),
      { headers: { "content-type": "application/json" } },
    );
  },
});
(async () => {
  assert.equal((await moduleObject.exports.listPostsForFeed(0)).length, 0);
  assert.equal(calls.length, 0);
  let posts = await moduleObject.exports.listPostsForFeed(100);
  assert.deepEqual(calls, [1, 2]);
  assert.equal(posts.length, 100);
  assert.equal(posts[99].id, 100);
  calls.length = 0;
  posts = await moduleObject.exports.listPostsForFeed(200);
  assert.deepEqual(calls, [1, 2, 3]);
  assert.equal(posts.length, 137);
  assert.equal(posts[136].id, 137);
  console.log("Public API: feed pagination, order, bounds and request timeout passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { transformSync } = require("esbuild");
const { createTranslator } = require("use-intl");
const locales = ["zh-CN", "zh-TW", "en"];
const catalogs = Object.fromEntries(
  locales.map((locale) => [locale, JSON.parse(fs.readFileSync(`src/messages/${locale}.json`, "utf8"))]),
);
for (const locale of locales) {
  for (const namespace of ["ui", "errors", "login"]) {
    const messages = catalogs[locale].admin[namespace];
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(catalogs.en.admin[namespace]).sort());
    const errors = [];
    const translate = createTranslator({
      locale,
      messages: catalogs[locale],
      namespace: `admin.${namespace}`,
      onError: (error) => errors.push(error),
    });
    for (const [key, value] of Object.entries(messages)) {
      const params = Object.fromEntries(
        [...value.matchAll(/\{(\w+)\}/g)].map((match) => [match[1], "Sample"]),
      );
      const output = translate(key, params);
      assert.ok(output.length, `${locale}/${key}`);
      if (locale === "en") assert.doesNotMatch(output, /[\p{Script=Han}]/u, key);
    }
    assert.equal(errors.length, 0, errors.map(String).join("\n"));
  }
}
const cache = new Map();
function load(file) {
  file = path.normalize(file);
  if (cache.has(file)) return cache.get(file);
  if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
  const module = { exports: {} };
  const code = transformSync(fs.readFileSync(file, "utf8"), {
    loader: "tsx",
    format: "cjs",
    jsx: "automatic",
  }).code;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    Error,
    TypeError,
    Date,
    Intl,
    require: (name) => {
      if (name === "@/components/ui/content-width-select") return {};
      if (name.startsWith("@/")) {
        const stem = path.join("src", name.slice(2));
        return load(
          [stem, `${stem}.ts`, `${stem}.tsx`].find(
            (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
          ),
        );
      }
      return require(name);
    },
  });
  cache.set(file, module.exports);
  return module.exports;
}
const { setAdminMessageLocale, localizeAdminNotice } = load("src/lib/admin-messages.ts");
const { LOGIN_METHOD_LABELS } = load("src/lib/admin-log-labels.ts");
const { ADMIN_PALETTES } = load("src/lib/themes.ts");
const { ACTIVE_FILTER_OPTIONS } = load("src/components/admin/admin-list-filter.tsx");
const { getAdminErrorMessage } = load("src/lib/admin-errors.ts");
for (const locale of locales) {
  setAdminMessageLocale(locale);
  assert.equal(LOGIN_METHOD_LABELS.password, catalogs[locale].admin.ui.m0751);
  assert.equal(ADMIN_PALETTES.find((item) => item.id === "slate").label, catalogs[locale].admin.ui.m0784);
  assert.equal(ACTIVE_FILTER_OPTIONS[0].label, catalogs[locale].admin.ui.m0313);
  assert.equal(
    getAdminErrorMessage(new Error("Slug already exists")),
    catalogs[locale].admin.errors.slugExists,
  );
}
setAdminMessageLocale("en");
assert.equal(localizeAdminNotice("文章「Example」已发布。"), "“Example” has been published.");
assert.equal(localizeAdminNotice("This is user content"), "This is user content");
assert.equal(getAdminErrorMessage(new Error("unknown diagnostic")), catalogs.en.admin.errors.requestFailed);
const { formatDate } = load("src/lib/utils.ts");
assert.doesNotMatch(formatDate("2026-01-01T00:00:00Z", "en"), /[\p{Script=Han}]/u);

// These modules intentionally contain source-language keys, user-content defaults or AI instructions.
const intentional = new Set([
  "components/locale-switcher.tsx",
  "components/admin/admin-login-screen.tsx",
  "components/admin/ai-composer.tsx",
  "components/admin/post-editor-form.tsx",
  "lib/themes.ts",
  "lib/admin-errors.ts",
]);
function inspect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) inspect(file);
    else if (/\.tsx?$/.test(file) && !intentional.has(path.relative("src", file).replaceAll("\\", "/"))) {
      const code = transformSync(fs.readFileSync(file, "utf8"), {
        loader: "tsx",
        charset: "utf8",
        minifyWhitespace: true,
        legalComments: "none",
      }).code;
      assert.doesNotMatch(code, /[\p{Script=Han}]/u, `Hardcoded UI copy in ${file}`);
    }
  }
}
inspect("src");
console.log(
  "Admin i18n passed: catalog parity, ICU rendering, dynamic labels, notices, errors and untranslated-copy guard.",
);

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { transformSync } = require("esbuild");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { IntlProvider, createTranslator } = require("use-intl");

const user = {
  username: "sample-user",
  nickname: "Sample",
  email: "sample@example.com",
  phone: "13800138000",
  gender: "female",
  birth_date: "2000-01-02",
  avatar_url: "/avatar.png",
};
const wrap =
  (tag) =>
  ({ children, title, description, actions, ...props }) =>
    React.createElement(
      tag,
      {
        "aria-label": props["aria-label"],
        title: typeof title === "string" ? title : undefined,
        placeholder: props.placeholder,
        href: props.href,
      },
      title,
      description,
      children,
      actions,
    );
const mocks = {
  "@/components/ui/button": { Button: wrap("button") },
  "@/components/ui/badge": { Badge: wrap("span") },
  "@/components/ui/skeleton": { Skeleton: wrap("div") },
  "@/components/ui/field": { Field: wrap("div"), FieldGroup: wrap("div"), FieldLabel: wrap("label") },
  "@/components/ui/input": { Input: ({ placeholder }) => React.createElement("input", { placeholder }) },
  "@/components/ui/select": Object.fromEntries(
    ["Select", "SelectContent", "SelectItem", "SelectTrigger", "SelectValue"].map((key) => [
      key,
      wrap("div"),
    ]),
  ),
  "@/components/link": { default: wrap("a") },
  "@/components/admin/user-avatar": { UserAvatar: () => null },
  "@/components/admin/birth-date-picker": { BirthDatePicker: () => null },
  "@/lib/navigation": { useRouter: () => ({}), useSearchParams: () => new URLSearchParams() },
  "@/lib/feedback": { toast: {} },
  antd: {
    Modal: ({ open, children, title, footer }) =>
      open ? React.createElement("div", null, title, children, footer) : null,
    Upload: wrap("div"),
  },
  swr: {
    default: (key) => ({ data: key === "admin-me" ? user : { github: true, wechat: true } }),
    useSWRConfig: () => ({ mutate: async () => {} }),
  },
};
const cache = new Map();
function load(file) {
  file = path.normalize(file);
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  const code = transformSync(fs.readFileSync(file, "utf8"), {
    loader: "tsx",
    format: "cjs",
    jsx: "automatic",
  }).code;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    URLSearchParams,
    Error,
    require: (name) => {
      if (mocks[name]) return { __esModule: true, ...mocks[name] };
      if (name.startsWith("@/")) {
        const stem = path.join("src", name.slice(2));
        if (name.endsWith(".json")) return JSON.parse(fs.readFileSync(stem, "utf8"));
        return load([`${stem}.tsx`, `${stem}.ts`].find(fs.existsSync));
      }
      return require(name);
    },
  });
  cache.set(file, module.exports);
  return module.exports;
}
const Page = load("src/app/admin/(shell)/profile/page.tsx").default;
const Hero = load("src/components/admin/profile/profile-hero.tsx").ProfileHero;
const messages = Object.fromEntries(
  ["zh-CN", "zh-TW", "en"].map((locale) => [
    locale,
    JSON.parse(fs.readFileSync(`src/messages/${locale}.json`, "utf8")),
  ]),
);
const keys = Object.keys(messages.en.admin.profile).sort();
for (const locale of Object.keys(messages)) {
  assert.deepEqual(Object.keys(messages[locale].admin.profile).sort(), keys);
  const errors = [];
  const render = (child) =>
    renderToStaticMarkup(
      React.createElement(
        IntlProvider,
        {
          locale,
          messages: messages[locale],
          timeZone: "Asia/Shanghai",
          onError: (error) => errors.push(error),
        },
        child,
      ),
    );
  const html = render(React.createElement(Page));
  const t = createTranslator({ locale, messages: messages[locale], namespace: "admin.profile" });
  for (const key of [
    "title",
    "description",
    "basic",
    "email",
    "phone",
    "oauth",
    "saveBasic",
    "saveEmail",
    "savePhone",
    "avatarHint",
    "completion",
  ]) {
    assert.ok(html.includes(t(key)), `${locale}: missing ${key}`);
  }
  assert.ok(html.includes(messages[locale].admin.gender.female));
  assert.ok(html.includes(messages[locale].common.copyField.replace("{label}", t("email"))));
  const unlinked = render(
    React.createElement(Hero, {
      user: { ...user, email: null, phone: null, gender: "male", avatar_url: null },
    }),
  );
  assert.ok(unlinked.includes(t("emailUnlinked")));
  assert.ok(unlinked.includes(t("phoneUnlinked")));
  assert.equal(errors.length, 0, errors.map(String).join("\n"));
  if (locale === "en") assert.doesNotMatch(html + unlinked, /[\p{Script=Han}]/u);
}
const { profileErrorKey } = load("src/lib/profile-errors.ts");
const { ApiError } = load("src/lib/api.ts");
assert.equal(profileErrorKey(new ApiError("Email is already linked", 409)), "emailTaken");
assert.equal(profileErrorKey(new ApiError("Invalid phone number", 400)), "invalidPhone");
assert.equal(profileErrorKey(new ApiError("raw server validation error", 422)), "invalidInput");
assert.equal(profileErrorKey(new Error("raw network error")), "retry");
console.log(
  "Profile i18n passed: three locales, linked/unlinked states, labels, copy feedback and localized errors.",
);

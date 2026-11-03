const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { transformSync } = require("esbuild");
function load(file, mocks, globals = {}) {
  const moduleObject = { exports: {} };
  const code = transformSync(fs.readFileSync(file, "utf8"), {
    loader: "tsx",
    format: "cjs",
    jsx: "automatic",
    target: "es2022",
  }).code;
  vm.runInNewContext(code, {
    module: moduleObject,
    exports: moduleObject.exports,
    ...globals,
    require: (name) => mocks[name] ?? require(name),
  });
  return moduleObject.exports;
}
const calls = [];
const navigation = load("src/lib/navigation.tsx", {
  react: { useMemo: (fn) => fn() },
  "react-router-dom": {
    useNavigate:
      () =>
      (...args) =>
        calls.push(args),
    useLocation: () => ({ pathname: "/posts" }),
  },
});
assert.equal(navigation.adminPath("/admin"), "/");
assert.equal(navigation.adminPath("/admin/posts/42/edit?from=list"), "/posts/42/edit?from=list");
assert.equal(navigation.adminPath("/administrator"), "/administrator");
// biome-ignore lint/correctness/useHookAtTopLevel: This VM replaces React hooks with deterministic test doubles.
assert.equal(navigation.usePathname(), "/admin/posts");
// biome-ignore lint/correctness/useHookAtTopLevel: This VM replaces React hooks with deterministic test doubles.
const router = navigation.useRouter();
router.push("/admin/posts");
router.replace("/admin/profile");
assert.equal(calls[0][0], "/posts");
assert.equal(calls[1][0], "/profile");
assert.equal(calls[1][1].replace, true);
for (const site of ["zh-CN", "zh-TW", "en"]) {
  for (const admin of [undefined, "invalid", "zh-CN", "zh-TW", "en"]) {
    const jar = new Map([["SITE_LOCALE", site]]);
    if (admin) jar.set("ADMIN_LOCALE", admin);
    const doc = { documentElement: { lang: "" } };
    Object.defineProperty(doc, "cookie", {
      get: () => [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
      set: (value) => {
        const [key, val] = value.split(";")[0].split("=");
        jar.set(key, val);
      },
    });
    const locale = load(
      "src/lib/locale.tsx",
      {
        react: {
          createContext: () => ({ Provider: "provider" }),
          useContext: () => {},
          useEffect: (fn) => fn(),
          useState: (init) => [init(), () => {}],
        },
        "use-intl": { IntlProvider: "intl" },
        "@/messages/en.json": {},
        "@/messages/zh-CN.json": {},
        "@/messages/zh-TW.json": {},
      },
      { document: doc },
    );
    const provider = locale.AdminLocaleProvider({ children: null });
    const expected = admin === "en" || admin === "zh-TW" ? admin : "zh-CN";
    assert.equal(provider.props.value.locale, expected);
    assert.equal(doc.documentElement.lang, expected);
    provider.props.value.setLocale("en");
    assert.equal(jar.get("ADMIN_LOCALE"), "en");
    assert.equal(jar.get("SITE_LOCALE"), site);
    provider.props.value.setLocale("invalid");
    assert.equal(jar.get("ADMIN_LOCALE"), "en");
  }
}
console.log(
  "Admin boundaries passed: basename navigation, initial language, isolated preference writes and invalid values.",
);

// UI adapters must preserve compact controls, accessible names and table layout.
const React = require("react");
const buttonNavigations = [];
const { Button } = load("src/components/ui/button.tsx", {
  antd: { Button: "button" },
  "react-router-dom": { useNavigate: () => (path) => buttonNavigations.push(path) },
  "@/lib/navigation": navigation,
  "@/lib/utils": { cn: (...classes) => classes.filter(Boolean).join(" ") },
});
const editButton = Button({
  asChild: true,
  variant: "ghost",
  size: "sm",
  children: React.createElement("a", { href: "/admin/posts/42/edit", "aria-label": "编辑文章" }, "编辑"),
});
assert.equal(editButton.props.type, "text");
assert.equal(editButton.props.size, "small");
assert.equal(editButton.props["aria-label"], "编辑文章");
function click(overrides = {}) {
  return {
    button: 0,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...overrides,
  };
}
const modifiedClick = click({ ctrlKey: true });
editButton.props.onClick(modifiedClick);
assert.equal(modifiedClick.defaultPrevented, false);
assert.equal(buttonNavigations.length, 0);
editButton.props.onClick(click());
assert.equal(buttonNavigations[0], "/posts/42/edit");
const disabledButton = Button({
  asChild: true,
  disabled: true,
  children: React.createElement("a", { href: "/admin/posts" }, "文章"),
});
assert.equal(disabledButton.props.href, undefined);
disabledButton.props.onClick(click());
assert.equal(buttonNavigations.length, 1);
const tableParts = load("src/components/ui/table.tsx", { antd: { Table: "table" } });
const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } = tableParts;
const element = React.createElement;
const table = Table({
  children: [
    element(
      TableHeader,
      { key: "header" },
      element(TableRow, null, element(TableHead, null, "名称"), element(TableHead, null, "状态")),
    ),
    element(TableBody, { key: "body" }, [
      element(
        TableRow,
        { key: "record" },
        element(TableCell, { className: "max-w-40", style: { width: 160 } }, "长标题"),
        element(TableCell, { className: "hidden sm:table-cell" }, "草稿"),
      ),
      element(TableRow, { key: "empty" }, element(TableCell, { colSpan: 2 }, "暂无数据")),
    ]),
  ],
});
const { columns, dataSource } = table.props;
assert.equal(columns[0].onCell(dataSource[0]).className, "max-w-40");
assert.equal(columns[1].onCell(dataSource[0]).className, "hidden sm:table-cell");
assert.equal(columns[0].onCell(dataSource[1]).colSpan, 2);
assert.equal(columns[1].onCell(dataSource[1]).colSpan, 0);
console.log(
  "Admin UI adapters passed: button variants, accessible links, navigation and responsive table cells.",
);
const { hslChannelsToHex } = load("src/lib/theme-color.ts", {});
assert.equal(hslChannelsToHex("0 0% 100%"), "#ffffff");
assert.equal(hslChannelsToHex("0 0% 0%"), "#000000");
assert.equal(hslChannelsToHex("215.156 61.905% 40.784%"), "#285da8");
assert.equal(hslChannelsToHex("24.6 95% 53.1%"), "#f97316");
assert.throws(() => hslChannelsToHex(""), /Invalid theme color/);
console.log("Theme color conversion passed: neutral, blue, orange and invalid channels.");

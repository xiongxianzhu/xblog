<p align="center">
  <a href="../../README.md"><img src="https://img.shields.io/badge/Monorepo-xblog-181717?style=for-the-badge&logo=github&logoColor=white" alt="xblog Monorepo"/></a>
  <a href="https://github.com/xiongxianzhu/xblog/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License MIT"/></a>
</p>

<h1 align="center">xblog Web</h1>

<p align="center">
  <strong>Next.js 公开站（i18n）</strong><br/>
  <sub>RSC · ISR · next-intl · Tailwind CSS 4 · shadcn/ui</sub>
</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.4-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"/></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind"/></a>
</p>

<p align="center">
  <a href="https://ui.shadcn.com/"><img src="https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge" alt="shadcn/ui"/></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-9+-F69220?style=for-the-badge&logo=pnpm&logoColor=white" alt="pnpm"/></a>
</p>

<p align="center">
  <a href="../../README.md"><b>Monorepo 首页</b></a>
  &nbsp;·&nbsp;
  <a href="../../AGENTS.md"><b>AGENTS.md</b></a>
  &nbsp;·&nbsp;
  <a href="../api/README.md"><b>后端文档</b></a>
  &nbsp;·&nbsp;
  <a href="../../docs/prd.md"><b>PRD</b></a>
</p>

<p align="center"><sub>— · — · —</sub></p>

---

## 职责

公开站包含文章、标签、关于、作品集、友链、搜索、RSS、sitemap 和 ISR 回调。管理端已独立到 [apps/admin](../admin/README.md)，不在本应用构建。

## 开发与构建

从仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm dev:web
pnpm --filter @xblog/web typecheck
pnpm --filter @xblog/web test
pnpm --filter @xblog/web build
```

服务端口 10241；双端联调统一访问 nginx 10240，见 [部署文档](../../docs/deployment.md)。生产由 systemd 调用 `pnpm start`，不添加 -H。

## 配置

复制 [.env.example](.env.example) 为 .env。BACKEND_URL 指向 API 10242；NEXT_PUBLIC_SITE_URL 使用对外域名（联调为 localhost:10240）；REVALIDATE_SECRET 与 API 一致。Giscus 相关 NEXT_PUBLIC_GISCUS_* 按需配置。后台 Turnstile 配置位于 apps/admin。

## 边界

- 使用 Next.js 16.4.3、React19.3.1、TS7，版本由根锁文件统一管理。
- 公开语言由 URL 与 SITE_LOCALE 决定，管理端链接使用普通 /admin/，不传播当前语言。
- 公开主题来自 API，后台 Ant 样式和 token 不进入此应用。
- 字体本地分发，见 app/fonts；保留许可证，不在构建时下载 Google Fonts。
- API 提交后调用 /api/revalidate，覆盖所有语言页面；已打开页面需刷新。
- tests 位于 scripts，覆盖缓存失效、语言边界、RSS/sitemap分页和请求超时。

检查在根目录运行 Biome；不要在此目录建立独立 lockfile。详细版本见 [技术栈](../../docs/tech-stack.md)。

### 本地直接访问后台

同时运行 `pnpm dev:web` 和 `pnpm dev:admin` 后，可访问 `http://localhost:10241/admin`。公开站开发服务会将 `/admin/*` 转发到 Vite 10243；修改 Next 配置后须重启 dev:web。生产 `pnpm start` 不启用该转发，仍使用 nginx 静态后台。

10240 联调网关仍可用。选择哪一个入口，开发环境的 FRONTEND_URL、NEXT_PUBLIC_SITE_URL 和 OAuth 回调就使用相同地址；10241 入口应填写 `http://localhost:10241`。HMR 使用当前入口，不固定为 10240。

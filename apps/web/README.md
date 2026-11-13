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

服务端口 10241；生产使用 nginx 同域入口，见 [部署文档](../../docs/deployment.md)。生产由 systemd 调用 `pnpm start`，不添加 -H。

## 配置

复制 [.env.example](.env.example) 为 .env。BACKEND_URL 指向 API 10242；NEXT_PUBLIC_SITE_URL 使用对外域名（单端本地开发为 http://localhost:10241）；REVALIDATE_SECRET 与 API 一致。Giscus 相关 NEXT_PUBLIC_GISCUS_* 按需配置。后台 Turnstile 配置位于 apps/admin。

## 边界

- 使用 Next.js 16.4.3、React19.3.1、TS7，版本由根锁文件统一管理。
- 公开语言由 URL 与 SITE_LOCALE 决定，管理端链接使用普通 /admin/，不传播当前语言。
- 公开主题来自 API，后台 Ant 样式和 token 不进入此应用。
- 字体本地分发，见 app/fonts；保留许可证，不在构建时下载 Google Fonts。
- API 提交后调用 /api/revalidate，覆盖所有语言页面；已打开页面需刷新。
- tests 位于 scripts，覆盖缓存失效、语言边界、RSS/sitemap分页和请求超时。

检查在根目录运行 Biome；不要在此目录建立独立 lockfile。详细版本见 [技术栈](../../docs/tech-stack.md)。

### 本地直接访问后台

运行 `pnpm dev:admin` 后访问 `http://localhost:10243/admin/`。公开站使用 10241；两端可分别开发，跨端导航与 OAuth 需通过同域部署入口验收。


## 搜索与 AI 抓取

- canonical、结构化数据、RSS 和 sitemap 优先使用后台“公开站设置”的基础地址；环境变量 `NEXT_PUBLIC_SITE_URL` 仅作回退。生产必须配置真实的 HTTPS 域名。
- `/robots.txt` 允许公开内容与上传图片抓取，限制管理端和 API 路径；这是抓取提示，不替代认证。CDN/WAF 也需允许合法搜索爬虫访问。
- `/sitemap.xml` 分页读取全部已发布文章及非空标签，不列入搜索结果页，不用当前时间冒充内容更新时间。超过 50,000 个地址时需拆分 sitemap，当前会明确报错。
- 页面提供 canonical；界面语言页面提供语言关联，未翻译的文章正文统一指向默认语言规范地址。站内搜索页为 `noindex, follow`。
- 服务端输出 WebSite、BlogPosting 和 BreadcrumbList JSON-LD；不虚构作者、修改日期、评分或引用。RSS 对标题、摘要和 URL 做 XML 转义。
- 发布后在 Google Search Console、百度搜索资源平台及 Bing Webmaster Tools 验证域名并提交 sitemap；这些操作需要站点所有者账户。代码配置不会自动完成收录或保证排名、AI 引用。
- GEO 的内容基础仍是可访问正文、清楚的标题与摘要、真实来源和作者信息。未添加声称能保证 AI 推荐的隐藏提示词或专用文件。

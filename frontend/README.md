<p align="center">
  <a href="../README.md"><img src="https://img.shields.io/badge/Monorepo-xblog-181717?style=for-the-badge&logo=github&logoColor=white" alt="xblog Monorepo"/></a>
  <a href="https://github.com/xiongxianzhu/xblog/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License MIT"/></a>
</p>

<h1 align="center">xblog Web</h1>

<p align="center">
  <strong>Next.js 公开站（i18n）+ <code>/admin</code> 写作后台</strong><br/>
  <sub>RSC · ISR · next-intl · Tailwind CSS 4 · shadcn/ui</sub>
</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.2-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"/></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind"/></a>
</p>

<p align="center">
  <a href="https://ui.shadcn.com/"><img src="https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge" alt="shadcn/ui"/></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-9+-F69220?style=for-the-badge&logo=pnpm&logoColor=white" alt="pnpm"/></a>
</p>

<p align="center">
  <a href="../README.md"><b>Monorepo 首页</b></a>
  &nbsp;·&nbsp;
  <a href="../AGENTS.md"><b>AGENTS.md</b></a>
  &nbsp;·&nbsp;
  <a href="../backend/README.md"><b>后端文档</b></a>
  &nbsp;·&nbsp;
  <a href="../docs/prd-xblog.md"><b>PRD</b></a>
</p>

<p align="center"><sub>— · — · —</sub></p>

---

## 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [目录结构](#目录结构)
- [主题系统](#主题系统)
- [主要路由](#主要路由)
- [与后端协作](#与后端协作)
- [故障排查](#故障排查)

---

## 概述

| | 区域 | 路径 | 渲染 |
|:-:|:---|:---|:---|
| 🏠 | 公开站 | `/[locale]/` · `/blog` · `/search` … | RSC + ISR · next-intl |
| ⚙️ | 管理后台 | `/admin/*`（无 locale 前缀） | Client Components + SWR + **AI Composer** + 固定底栏保存/发布 |
| 📡 | ISR 回调 | `/api/revalidate` | Route Handler |
| 🤖 | AI BFF | `/api/v1/admin/ai/complete` | SSE 代理至后端（支持多 Skill） |
| 💬 | Giscus | 文章详情 `GiscusComments` | Client 动态加载；iframe wrapper + 公开站主题联动 |

<p align="center"><sub><b>主题</b>：公开站 7 款 palette + 站点品牌（DB，含<strong>备案号</strong>）· 后台 UI 主题存 <code>localStorage</code> · 互不干扰</sub></p>

---

## 快速开始

<p align="center"><sub>前置：后端 API 已启动 → <a href="../backend/README.md"><b>backend/README.md</b></a></sub></p>

```bash
pnpm install
pnpm dev
```

<p align="center"><sub>公开站 <a href="http://localhost:3000"><code>localhost:3000</code></a> · 后台 <a href="http://localhost:3000/admin"><code>localhost:3000/admin</code></a></sub></p>

**构建与生产**：

```bash
pnpm lint && pnpm build && pnpm start
```

---

## 环境变量

<p align="center"><sub>复制 <code>.env.example</code> → <code>.env</code> · <b>勿提交 Git</b></sub></p>

| 变量 | 说明 |
|------|------|
| `BACKEND_URL` | 服务端 fetch 与 `/api` rewrite 目标，默认 `http://localhost:8000` |
| `REVALIDATE_SECRET` | 与 backend 一致，供 `/api/revalidate` 校验 |
| `NEXT_PUBLIC_SITE_URL` | 站点绝对 URL（sitemap、RSS） |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile 站点 Key（与 backend `TURNSTILE_SITE_KEY` 相同） |
| `NEXT_PUBLIC_GISCUS_REPO` | Giscus 仓库 `owner/repo` |
| `NEXT_PUBLIC_GISCUS_REPO_ID` | Giscus repoId |
| `NEXT_PUBLIC_GISCUS_CATEGORY` | Discussion 分类名 |
| `NEXT_PUBLIC_GISCUS_CATEGORY_ID` | Giscus categoryId |
| `NEXT_PUBLIC_GISCUS_MAPPING` | 可选，`pathname` 等 |
| `NEXT_PUBLIC_GISCUS_INPUT_POSITION` | 可选，`top` / `bottom` |
| `NEXT_PUBLIC_GISCUS_THEME` | 可选，Giscus 主题名 |

<p align="center"><sub><a href="next.config.ts"><code>next.config.ts</code></a> 将浏览器 <code>/api/*</code> 代理到 <code>BACKEND_URL</code></sub></p>

> 💡 模板见 <a href=".env.example"><code>.env.example</code></a>；`.gitignore` 已忽略 `.env` 但保留 `!.env.example`。

---

## 目录结构

```text
app/
├── [locale]/               # 公开站（next-intl）
│   ├── layout.tsx          # locale 布局 · 语言切换
│   ├── page.tsx            # 首页
│   └── blog/ · search/ …
├── admin/
│   ├── (public)/           # 登录页
│   └── (shell)/            # 后台主界面 · AI 模型/Skill
├── api/
│   ├── revalidate/         # ISR 刷新
│   └── v1/admin/ai/complete/  # AI SSE BFF
├── sitemap.ts · rss.xml/
components/
├── site/                   # 公开页组件 · site-footer（备案号）
├── admin/                  # 壳层 · post-editor-form · ai-composer · friend-link-logo-editor · admin-pagination
├── article-cover.tsx       # 详情页封面
├── article-toc.tsx         # 正文目录（桌面 sticky / 移动折叠）
├── post-card.tsx           # 列表卡片（4:3 封面 + 标签）
├── giscus.tsx              # Giscus 评论（iframe wrapper）
└── ui/                     # shadcn/ui
i18n/                       # routing.ts · request.ts
messages/                   # zh-CN.json · zh-TW.json · en.json
lib/
├── api.ts · ai-api.ts      # 数据与 AI 请求（含日志分页 API）
├── themes.ts               # 7 款 palette · site_icp_number 类型
├── site-theme.ts           # 服务端主题 + cache tag
├── pending-upload-cleanup.ts  # 未保存封面/LOGO 即时 DELETE
├── prose-code-blocks.ts    # 正文代码块语言标签
├── locale-actions.ts       # 后台语言 cookie
└── admin-nav.ts            # 侧栏导航
proxy.ts                    # locale 中间件 · /admin 重定向
public/beian-ghs.png        # 页脚公安备案图标
```

---

## 主题系统

| 范围 | 配置入口 | DOM |
|------|----------|-----|
| 🌐 公开站 | 后台 **设置 → 公开站外观** | `[data-site-shell]` · 7 款配色 + 站点名称/副标题/LOGO/**备案号** |
| 🖥 管理后台 | 后台 **设置 → 后台外观** | `[data-admin-shell]` · 同款 7 palette · `localStorage` |

**Palette ID**：`editorial` · `forest` · `slate` · `ink` · `graphite` · `ocean` · `rose`（中英文标签见 `lib/themes.ts`）

CSS 变量 → [`app/globals.css`](app/globals.css)

新增 palette 时需同步：

1. `lib/themes.ts` 定义
2. `globals.css` 中 `[data-site-palette=…]` / admin 块

<p align="center">刷新机制 → <a href="../AGENTS.md#-主题系统易踩坑"><b>AGENTS.md · 主题系统</b></a></p>

---

## 国际化（i18n）

| 区域 | 约定 |
|------|------|
| 公开站 | 路由 `app/[locale]/…`；locale 来自 URL；文案 `messages/*.json` |
| 管理后台 | 路径 **不含** locale；语言存 `NEXT_LOCALE` cookie |
| 中间件 | `proxy.ts` 处理 locale 前缀；`/{locale}/admin/*` → `/admin/*` |

顶栏 **语言切换**：公开站走 next-intl router；后台写 cookie 后 `router.refresh()`。

---

## 主要路由

| 路径 | 类型 | 说明 |
|------|:----:|------|
| `/` 或 `/[locale]` | ISR | 首页 |
| `/[locale]/blog` · `/blog/[slug]` | ISR | 文章（封面 · TOC · Giscus） |
| `/[locale]/search` | ISR | 站内搜索 |
| `/[locale]/projects` · `/links` · `/about` | ISR | 内容页（友链展示 LOGO + 简介） |
| `/[locale]/tags/[slug]` | ISR | 标签归档（`decodeRouteParam` 解码中文 slug） |
| `/admin` | 动态 | 登录（Turnstile · `GET /auth/login-guard`） |
| `/admin/posts/new` · `/admin/posts/[id]/edit` | Client | 文章编辑（固定底栏 **保存草稿 / 发布**） |
| `/admin/dashboard` · `/admin/ai/*` · `/admin/links` 等 | Client | 后台模块 |
| `/rss.xml` · `/sitemap.xml` | 动态 | 订阅 · SEO |

---

## Giscus 评论

| 项 | 说明 |
|----|------|
| 组件 | [`components/giscus.tsx`](components/giscus.tsx) |
| 配置 | `NEXT_PUBLIC_GISCUS_*`（见 `.env.example`） |
| 挂载 | 文章详情 [`app/[locale]/blog/[slug]/page.tsx`](app/[locale]/blog/[slug]/page.tsx) |
| 主题 | 默认跟随公开站 `mode`；`NEXT_PUBLIC_GISCUS_THEME` 可覆盖 |
| 布局 | `client.js` 会清空 `.giscus` 并插入 iframe；组件用 `MutationObserver` 再包一层 `div`，由 `globals.css` `[data-site-shell] .giscus > div` 控制宽度 |

> iframe **内部**样式无法由父页 CSS 穿透；需自定义时把 `data-theme` 设为托管 CSS URL（见 [Giscus STYLING](https://github.com/giscus/giscus/blob/main/STYLING.md)）并配置 CORS。

---

## 文章编辑与封面

| 文件 | 职责 |
|------|------|
| [`components/admin/post-editor-form.tsx`](components/admin/post-editor-form.tsx) | 表单 · AI 助手 · **固定底栏** `.admin-editor-actions` |
| [`components/admin/post-cover-editor.tsx`](components/admin/post-cover-editor.tsx) | 封面上传 / URL · 「移除」触发 pending 清理 |
| [`lib/pending-upload-cleanup.ts`](lib/pending-upload-cleanup.ts) | 取消/卸载/关弹窗时 DELETE 未保存封面或 LOGO |
| [`lib/public-asset-url.ts`](lib/public-asset-url.ts) | 公开页与后台预览 URL 解析 |

保存或发布时若 `cover_url` 为空，后端 PATCH 会删除旧的本地上传；关浏览器场景由后端 `cleanup-uploads` cron 兜底（见 [backend/README.md](../backend/README.md)）。

---

## 友链 LOGO 编辑

| 文件 | 职责 |
|------|------|
| [`components/admin/friend-link-logo-editor.tsx`](components/admin/friend-link-logo-editor.tsx) | LOGO 外链或本地上传（必填）· 2px 细边框表单风 |
| [`app/admin/(shell)/links/page.tsx`](app/admin/(shell)/links/page.tsx) | 后台列表（LOGO 预览）· 编辑弹窗 |
| [`app/[locale]/links/page.tsx`](app/[locale]/links/page.tsx) | 公开页：LOGO + 简介，不显示 URL 文本 |

---

## AI Composer

| 文件 | 职责 |
|------|------|
| [`components/admin/ai-composer.tsx`](components/admin/ai-composer.tsx) | Skill Chip · `/` 唤起 · 快捷按钮 · 模型选择 |
| [`components/admin/editor-ai-assistant-layout.tsx`](components/admin/editor-ai-assistant-layout.tsx) | 编辑页三栏布局 · 右侧 Agent 面板 |
| [`components/admin/ai-assistant-panel.tsx`](components/admin/ai-assistant-panel.tsx) | 对话/生成 Tab · 思考过程展示 |

设计说明 → [`docs/superpowers/specs/2026-07-05-ai-editor-composer-design.md`](../docs/superpowers/specs/2026-07-05-ai-editor-composer-design.md)

---

## 与后端协作

```text
公开页（RSC）  ──fetch──→  /api/v1/public/*
后台（Client） ──SWR───→  /api/v1/admin/*   （Cookie 自动携带）
AI 流式       ──BFF────→  /api/v1/admin/ai/complete → 后端 SSE
内容发布/主题  ──后端───→  POST /api/revalidate → revalidateTag
```

| 文件 | 职责 |
|------|------|
| [`lib/api.ts`](lib/api.ts) | 公开/后台 API 封装（含日志分页） |
| [`lib/ai-api.ts`](lib/ai-api.ts) | AI SSE 客户端 |
| [`lib/site-theme.ts`](lib/site-theme.ts) | 根布局主题、品牌与备案号拉取 |
| [`components/admin/admin-pagination.tsx`](components/admin/admin-pagination.tsx) | 后台列表分页（页码跳转 · 页大小） |
| [`components/site-footer.tsx`](components/site-footer.tsx) | 公开站页脚 · 备案号链接 |
| [`components/giscus.tsx`](components/giscus.tsx) | Giscus 评论加载与 iframe wrapper |
| [`app/api/revalidate/route.ts`](app/api/revalidate/route.ts) | ISR 入口 |

---

## 故障排查

| 现象 | 处理 |
|------|------|
| API 请求失败 | 确认 `make dev` 运行中 + `BACKEND_URL` 正确 |
| 公开页主题不变 | 开发：硬刷新；生产：检查 `REVALIDATE_SECRET` |
| `/zh-TW/admin` 404 | 应访问 `/admin`；勿在 admin 路径加 locale |
| 后台切换语言无效 | 检查 cookie · 刷新页面 · 见 `i18n/request.ts` |
| AI 无流式输出 | 确认提供商已激活 · 浏览器 Network 看 SSE |
| Giscus 宽度不齐 | 检查 `globals.css` `.giscus > div`；iframe 内样式需 custom theme CSS |
| 封面/LOGO 预览 404 | 确认后端已启动 · URL 为 `/api/v1/uploads/covers/…` 或 `link-logos/…` |
| 未保存上传占磁盘 | 开发：取消编辑应即时 DELETE；生产：backend `cleanup-uploads` cron |
| `pnpm build` 失败 | `pnpm lint` 查看 TS/ESLint 报错 |
| `.next` 异常 | 删除 `.next/` 后重新 `pnpm dev` |

---

<p align="center">
  <sub><a href="../LICENSE"><b>MIT License</b></a></sub>
</p>

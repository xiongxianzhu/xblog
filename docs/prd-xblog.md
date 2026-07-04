# xblog 产品需求文档（PRD）


| 字段   | 值                                       |
| ---- | --------------------------------------- |
| 产品   | xblog 个人博客                              |
| 仓库   | `git@github.com:xiongxianzhu/xblog.git` |
| 许可证  | MIT                                     |
| 文档版本 | v2.6 |
| 最后更新 | 2026-07-05 |

## 技术栈速查

> 完整说明见 **§4.2 Technology Stack**；脚手架初始化见 **§6.3 / §6.4** 与 **附录 A**。

### 后端 `backend/`

| 类别 | 技术 |
|------|------|
| 语言 | Python 3.14 |
| 框架 | FastAPI |
| ORM | SQLModel（同步；SQLAlchemy 2.0） |
| 迁移 | Alembic |
| 配置 / 校验 | pydantic-settings · Pydantic v2 |
| 认证 | HttpOnly Cookie + JWT · bcrypt |
| 数据库 | PostgreSQL（开发 / 生产；禁止 SQLite） |
| Markdown | `markdown` + Pygments |
| 运行时 | uvicorn |
| 工具链 | uv · ruff · mypy · pytest |
| 脚手架 | [create-fastapi](https://github.com/xiongxianzhu/create-fastapi) |

### 前端 `frontend/`

| 类别 | 技术 |
|------|------|
| 包管理 | pnpm |
| 框架 | Next.js App Router · React · TypeScript |
| 样式 / UI | Tailwind CSS · **[shadcn/ui](https://ui.shadcn.com/)**（全站：公开页 + `/admin`） |
| 公开页 | React Server Components + ISR |
| 后台 | Client Components · Markdown 编辑器懒加载 · SWR（M2+） |
| 主题 | 公开站 DB 统一配置 · 后台 localStorage · 双轨互不干扰 |
| 评论 | Giscus |
| 脚手架 | `pnpm create next-app` |

### 部署（VPS）

| 组件 | 技术 |
|------|------|
| 反向代理 | nginx + Let's Encrypt |
| 进程 | uvicorn · `next start`（systemd） |
| 路由 | `/` → Next.js · `/api/` → FastAPI |

---

## 1. Executive Summary

### 1.1 Problem Statement

作者需要一套**可自托管、可开源**的个人博客：在浏览器中完成 Markdown 写作与发布，同时满足 SEO、RSS 与基础内容展示（作品集、友链等）。现有通用 CMS 过重，从零手写骨架则重复劳动且难以与作者已有的 FastAPI 工具链对齐。

### 1.2 Proposed Solution

**xblog** 采用 Monorepo：**FastAPI 后端 API** + **Next.js 前端**（公开页 SSR/ISR + `/admin` 写作后台），UI 为 **Tailwind CSS + shadcn/ui**（全站统一），部署于自有 VPS（nginx 同域反代）。

### 1.3 Success Criteria

MVP 视为成功当且仅当满足以下 **可验证** 指标：


| #    | 指标                                                                                 | 验收方式            |
| ---- | ---------------------------------------------------------------------------------- | --------------- |
| SC-1 | 管理员可在 5 分钟内完成「登录 → 新建文章 → 发布 → 前台可见」全流程                                            | 人工走查 + 记录步骤     |
| SC-2 | 公开文章详情页 HTML 源码含完整 `<title>` 与 `meta description`；`/sitemap.xml` 与 RSS 可访问且包含已发布文章 | `curl` 或浏览器查看源码 |
| SC-3 | 站内搜索在 **1000 篇**已发布文章规模下，P95 响应时间 **≤ 500ms**（本地 PostgreSQL，不含网络）                  | API 压测或手动计时     |
| SC-4 | 发布后 **60 秒内**，对应 `/blog/[slug]` ISR 页面内容更新（通过 revalidate 触发）                       | 发布后立即访问前台对比     |
| SC-5 | 生产环境：`/api/v1/public/health` 返回 200；HTTPS 可用；仓库无真实密钥与私人文章内容                        | 部署检查清单          |
| SC-6 | `backend`: `ruff check`、`mypy`、`pytest` 通过；`frontend`: `pnpm lint`、`pnpm build` 通过 | CI 或本地命令        |
| SC-7 | 管理员在后台修改**公开站主题**后，访客刷新公开页可见新配色（开发即时；生产 **60 秒内**，见 US-7） | 改主题 → 访问 `/` 或 `/blog` 对比 |
| SC-8 | 仓库含 `AGENT.md`、根/`backend`/`frontend` README、`docs/prd-xblog.md`；`.gitignore` 覆盖前后端产物 | 克隆后文档可读、无 `.env` 泄漏 |




### 1.4 作者手动执行清单（概览）

以下事项 **必须由作者本人在本机或 VPS 上手动完成**；Agent 仅提供说明或业务代码，**不得**代跑脚手架命令、代配基础设施或代管密钥。


| 类别    | 手动事项                                                      | 详见              |
| ----- | --------------------------------------------------------- | --------------- |
| 环境安装  | Python 3.14、uv、Node.js、pnpm、create-fastapi CLI、PostgreSQL | §6.1 · **附录 B** |
| 仓库与密钥 | `git clone` / `push`；复制并编辑 `.env` / `.env.local`（不提交）     | §6.2            |
| 后端脚手架 | `create-fastapi` 生成 `backend/`                            | §6.3 · 附录 A.1   |
| 前端脚手架 | `pnpm create next-app` 生成 `frontend/`                     | §6.4 · 附录 A.2   |
| 数据库   | 安装/启动 PostgreSQL；建库建用户；`alembic upgrade`                  | §6.5            |
| 管理员   | `uv run python -m app.cli create-admin`（本地与生产各执行）                      | §6.6            |
| 本地运行  | `uv sync`、`uvicorn`；`pnpm dev`                            | §6.7            |
| 第三方   | Giscus 所需 GitHub Discussions 仓库与前端 env                    | §6.8            |
| 生产部署  | nginx、systemd、HTTPS（certbot）、生产 env                    | §6.9            |


完整分阶段步骤见 **第 6 章**。

---



## 2. User Experience & Functionality



### 2.1 User Personas


| 角色          | 描述     | 核心诉求                         |
| ----------- | ------ | ---------------------------- |
| **管理员（唯一）** | 博客作者本人 | 在线 Markdown 写作、草稿/发布、管理页面与友链 |
| **访客**      | 互联网读者  | 阅读文章、按标签浏览、搜索、评论（Giscus）     |


**假设**：单管理员、低并发（≤ 100 UV/日）、无协作与多租户。

### 2.2 User Stories & Acceptance Criteria



#### US-1：管理员登录

**Story**：As a 管理员, I want to 使用用户名密码登录后台, so that 只有我能修改内容。

**Acceptance Criteria**

- [ ] CLI `uv run python -m app.cli create-admin --username <name>` 可创建管理员；**禁止**内置 `admin/admin` 默认账号。
- [ ] `POST /api/v1/auth/login` 成功后在 HttpOnly Cookie 中写入 access + refresh token。
- [ ] 未登录访问 `/api/v1/admin/*` 返回 **401**。
- [ ] `POST /api/v1/auth/logout` 清除 Cookie；`GET /api/v1/auth/me` 返回当前用户。



#### US-2：写作与发布文章

**Story**：As a 管理员, I want to 在后台用 Markdown 写作并发布, so that 访客能阅读格式化内容。

**Acceptance Criteria**

- [ ] 管理端可创建/编辑/删除文章；支持 `draft` 与 `published` 状态。
- [ ] 保存或发布时，服务端将 `content_md` 渲染为 `content_html` 并持久化。
- [ ] 首次设为 `published` 且 `published_at` 为空时，自动写入当前东八区时间（`Asia/Shanghai`）。
- [ ] 公开 API 仅返回 `published` 文章；公开详情**不返回** `content_md`。
- [ ] 发布成功后触发 Next.js ISR revalidate，满足 SC-4。



#### US-3：访客浏览与发现内容

**Story**：As a 访客, I want to 浏览文章、标签与固定页面, so that 我能了解作者内容与项目。

**Acceptance Criteria**

- [ ] 前台路由可用：`/`、`/blog`、`/blog/[slug]`、`/tags/[slug]`、`/about`、`/projects`、`/links`、`/search`。
- [ ] 文章列表支持分页；标签页展示该标签下已发布文章。
- [ ] `/about`、`/projects` 由 Page 模型驱动；友链按 `sort_order` 排序展示。



#### US-4：搜索、订阅与 SEO

**Story**：As a 访客, I want to 搜索文章并通过 RSS 订阅, so that 我能快速找到并跟进更新。

**Acceptance Criteria**

- [ ] `GET /api/v1/public/search?q=` 使用 PostgreSQL 全文检索（`title`、`excerpt`、`content_md`）。
- [ ] RSS 与 `sitemap.xml` 至少一种实现路径可用（API 或 Next.js Route Handler，README 中注明选型）。
- [ ] 公开页含基础 Open Graph meta，满足 SC-2。



#### US-5：评论与访问统计

**Story**：As a 访客, I want to 在文章下评论, so that 我能与作者互动；As a 管理员, I want to 查看简单访问量, so that 我了解内容热度。

**Acceptance Criteria**

- [ ] 文章详情页嵌入 Giscus；`repo` / `repoId` 等仅来自前端环境变量。
- [ ] `POST /api/v1/public/pageviews` 记录 `path` 与可选 `referrer`。
- [ ] 管理端可查看按 path 聚合的访问计数（复杂报表非 MVP）。



#### US-6：部署与探活

**Story**：As a 管理员, I want to 在 VPS 上稳定运行博客, so that 访客可通过 HTTPS 访问。

**Acceptance Criteria**

- [ ] `GET /api/v1/public/health` 返回 `{"status":"ok"}`。
- [ ] 同域路由：`/` → Next.js `:3000`，`/api/` → FastAPI `:8000`（nginx 反代）。
- [ ] 生产环境 `COOKIE_SECURE=true`；`deploy/` 含 nginx 与 systemd 配置说明。



#### US-7：管理后台外观与公开站主题

**Story**：As a 管理员, I want to 在统一风格的后台中写作，并配置全站公开页配色, so that 后台好用且访客看到一致的视觉体验。

**Acceptance Criteria**

**管理后台壳层（`/admin` 登录后）**

- [ ] 布局为 **可折叠侧边栏 + 顶栏 + 主内容区**；顶栏含导航辅助、用户 **头像** 与账号相关入口。
- [ ] 视觉风格：**2px 扁平边框**、层次清晰；顶栏支持 **毛玻璃**（半透明 + 模糊）效果；主内容区 **全宽利用**（不在壳层内强制 `max-w-6xl` 等窄栏居中）。
- [ ] 主内容区与侧栏使用 **实色分层**（如 `--admin-sidebar` / `--admin-canvas`），避免大面积灰白、层次不清。
- [ ] 后台 **外观主题**（浅色/深色 + 预设 palette）在 **设置页** 配置，存浏览器 `localStorage`，**仅影响** `[data-admin-shell]`，各管理员可各自偏好。

**公开站主题（访客统一）**

- [ ] 公开页 **不提供** 访客主题切换控件；全站访客看到 **同一套** 公开站主题。
- [ ] 管理员在 **设置 → 公开站外观** 选择配色（浅色/深色 + 预设 palette，如墨纸/深林/冷灰/墨夜等）；保存后写入后端 **`site_settings`**（键值存储）。
- [ ] 公开 API：`GET /api/v1/public/site-theme`；管理 API：`GET/PATCH /api/v1/admin/site-theme`。
- [ ] 根布局服务端拉取公开站主题，渲染 `[data-site-shell]`、`data-site-palette` 及必要时 `dark` class；**不使用** 公开页 `localStorage` 存主题。
- [ ] 保存公开站主题后触发 ISR revalidate（含 cache tag，如 `site-theme`），满足 SC-7；开发环境保存后刷新即可见。
- [ ] 生产环境作者须配置 **ISR 回调相关环境变量**（前后端成对、值由作者自行生成，**不得**写入 PRD 或 Git）；未配置时文档与日志须提示「公开页可能延迟更新」。

**非目标（本 US 范围内不做）**

- 公开页主题市场、访客自选主题、每用户主题持久化。
- 在 PRD / README / 代码仓库中写入真实 `SECRET_KEY`、`DATABASE_URL` 密码、ISR 回调密钥等敏感值。



#### US-8：仓库文档与忽略规则

**Story**：As a 贡献者或 Agent, I want to 阅读统一文档并安全提交代码, so that 协作高效且密钥不泄漏。

**Acceptance Criteria**

- [ ] 根目录含 **`README.md`**（Monorepo 概览、shields、快速开始）、**`AGENT.md`**（AI/贡献者约定、主题 ISR、Git 规范）。
- [ ] **`docs/prd-xblog.md`** 纳入版本库，作为产品与验收的权威来源。
- [ ] `backend/README.md`、`frontend/README.md` 分别说明本目录开发与部署。
- [ ] **根 `.gitignore`** 汇总 Monorepo 忽略规则（含 Python 缓存 `.venv` / `.pytest_cache` / `.ruff_cache` / `.mypy_cache`、前端 `node_modules` / `.next`、`backend/uploads/` 用户文件等）；子目录 `.gitignore` 可与根规则等效互补。
- [ ] 环境模板仅用 `.env.example` / `.env.local.example` 占位，**禁止**提交真实 `.env`、`.env.local` 及用户上传内容。



### 2.3 Non-Goals

以下明确 **不在** MVP 或当前版本范围内：

- 多用户、角色权限、协作编辑、开放注册
- 插件系统、主题市场、可视化页面搭建器
- **访客在公开页切换主题**（公开站主题仅管理员后台统一配置）
- 微服务、Redis、消息队列、async SQLAlchemy
- 富文本 WYSIWYG 编辑器（MVP 仅 Markdown）
- 移动端 App / 小程序
- Agent 或脚本**代生成** `backend/`、`frontend/` 基础脚手架
- 演示站、Docker 一键包（Phase 2 可选）
- UI 多语言 i18n（MVP 不强制）

---



## 3. AI System Requirements

**不适用。** xblog MVP 不含 LLM 生成、智能摘要等 AI 功能。若 Phase 2 引入 AI 辅助写作，须单独增补 PRD 章节与评测标准。

---



## 4. Technical Specifications



### 4.1 Architecture Overview

```text
                    ┌─────────────┐
                    │   nginx     │
                    │  SSL / 静态  │
                    └──────┬──────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
    ┌──────▼──────┐                 ┌──────▼──────┐
    │  Next.js    │                 │  FastAPI    │
    │  :3000      │                 │  :8000      │
    │  frontend/  │                 │  backend/   │
    └──────┬──────┘                 └──────┬──────┘
           │         Cookie + fetch       │
           └───────────────┬──────────────┘
                           │
                    ┌──────▼──────┐
                    │ PostgreSQL  │
                    └─────────────┘

外部：Giscus（评论，前端嵌入）
```

**Monorepo 结构**

```text
xblog/
├── AGENT.md          # AI 助手与贡献者协作说明
├── README.md
├── .gitignore        # Monorepo 忽略规则（汇总前后端）
├── backend/          # create-fastapi 生成 + 博客业务扩展
├── frontend/         # create-next-app 初始化 + 页面与 admin
├── deploy/           # nginx · systemd
├── docs/
│   └── prd-xblog.md  # 本文档（纳入 Git）
└── LICENSE
```

**脚手架边界**


| 目录          | 初始化方式                  | 谁负责                  |
| ----------- | ---------------------- | -------------------- |
| `backend/`  | `create-fastapi`       | 作者本地执行；Agent 仅指导     |
| `frontend/` | `pnpm create next-app` | 作者本地执行；Agent 仅指导     |
| 业务代码        | 在骨架上扩展                 | 作者 + Agent 可按 PRD 协作 |


详细命令见 **附录 A**。

### 4.2 Technology Stack



#### 后端


| 类别       | 选型                                      |
| -------- | --------------------------------------- |
| 语言       | Python **3.14**                         |
| 框架       | FastAPI                                 |
| ORM      | **SQLModel**（同步会话；底层 SQLAlchemy 2.0）    |
| 迁移       | Alembic                                 |
| 配置       | pydantic-settings                       |
| 认证       | HttpOnly Cookie + JWT（access / refresh） |
| 数据库      | **PostgreSQL**（开发与生产均使用；**禁止 SQLite**）  |
| Markdown | `markdown` + Pygments                   |
| 工具链      | uv · ruff · mypy · pytest               |




#### 前端


| 类别   | 选型                                                   |
| ---- | ---------------------------------------------------- |
| 包管理  | **pnpm**（`pnpm-lock.yaml`；不用 npm / yarn）             |
| 框架   | Next.js App Router · React · TypeScript              |
| 样式 / UI | Tailwind CSS · **shadcn/ui**（Radix 组件；公开页与后台统一） |
| 主题 | **双轨**：公开站主题（DB + API，全站统一）· 后台主题（localStorage，仅 admin 壳层） |
| 暗色模式 | 公开站/后台各自配置；公开页跟随服务端下发的 `mode` + palette |
| 公开页  | React Server Components + ISR（默认 `revalidate: 3600`） |
| 后台   | Client Components；Markdown 编辑器 `next/dynamic` 懒加载    |
| 后台数据 | SWR（M2 起安装）                                          |
| 评论   | Giscus · `next/script` · `lazyOnload`                |




#### 部署（VPS）


| 组件     | 说明                        |
| ------ | ------------------------- |
| 反向代理   | nginx（SSL、`/uploads/` 静态） |
| API 进程 | uvicorn（systemd）       |
| Web 进程 | `next start`（systemd）  |
| 证书     | Let's Encrypt（文档说明，不内置脚本） |




### 4.3 Data Model

SQLModel 定义（`table=True`）；多对多通过 `post_tags` 关联表。


| 实体             | 关键字段                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Post**       | `title`, `slug`†, `content_md`, `content_html`, `excerpt`, `cover_url`, `status` (`draft`|`published`), `published_at`, 时间戳；M2M → Tag |
| **Tag**        | `name`†, `slug`†                                                                                                                      |
| **Page**       | `slug`† (`about`, `projects`), `title`, `content_md`, `content_html`, `updated_at`                                                    |
| **FriendLink** | `name`, `url`, `logo_url?`, `sort_order`                                                                                              |
| **PageView**   | `path`, `referrer?`, `visited_at`                                                                                                     |
| **User**       | `username`†, `password_hash`, `avatar_url?`, `created_at`                                                                                            |
| **SiteSetting** | `key`†, `value`（JSON 字符串）；MVP 用于 `site.theme.mode` / `site.theme.palette` 等站点级配置 |


† 表示唯一约束。

**API 序列化**：公开接口不暴露 `content_md`；管理接口返回完整字段。

### 4.4 Integration Points

**API 前缀**：`/api/v1`


| 方法        | 路径                          | 鉴权     | 说明       |
| --------- | --------------------------- | ------ | -------- |
| GET       | `/public/health`            | 否      | 探活       |
| GET       | `/public/posts`             | 否      | 已发布文章分页  |
| GET       | `/public/posts/{slug}`      | 否      | 文章详情     |
| GET       | `/public/tags/{slug}/posts` | 否      | 标签文章列表   |
| GET       | `/public/pages/{slug}`      | 否      | 固定页      |
| GET       | `/public/links`             | 否      | 友链列表     |
| GET       | `/public/search`            | 否      | 全文搜索     |
| POST      | `/public/pageviews`         | 否      | 记录访问     |
| GET       | `/public/site-theme`        | 否      | 公开站主题（mode + palette） |
| POST      | `/auth/login`               | 否      | 登录       |
| POST      | `/auth/logout`              | 是      | 登出       |
| POST      | `/auth/refresh`             | Cookie | 刷新 token |
| GET       | `/auth/me`                  | 是      | 当前用户     |
| *         | `/admin/posts`…             | 是      | 文章 CRUD  |
| GET/PATCH | `/admin/pages/{slug}`       | 是      | 固定页编辑    |
| *         | `/admin/links`…             | 是      | 友链 CRUD  |
| GET/PATCH | `/admin/site-theme`         | 是      | 公开站主题读写；保存后触发 ISR |


OpenAPI：`/docs`（FastAPI 自动生成）。Phase 2 可用 openapi-typescript 生成前端类型。

**ISR 与缓存（公开站主题 / 文章）**

- 内容或公开站主题变更后，后端调用前端 **`/api/revalidate`**（需共享密钥，由环境变量配置，**不写入仓库**）。
- 公开站主题在生产环境使用 **带 tag 的服务端缓存**；回调须失效对应 tag（Next.js 16+ 按框架要求传递 revalidate 参数）。
- 开发环境：主题 API 宜 **不缓存** 或短缓存，便于保存后刷新即见。

**前端环境变量**


| 变量                    | 用途                                              |
| --------------------- | ----------------------------------------------- |
| `BACKEND_URL`         | 服务端 fetch 与 Next.js `/api` rewrite 目标（开发默认本机 API 端口） |
| `NEXT_PUBLIC_API_URL` | 可选；与 `BACKEND_URL` 二选一或互补，见 frontend README |
| `NEXT_PUBLIC_SITE_URL` | 站点绝对 URL（sitemap、RSS、OG） |
| `REVALIDATE_SECRET`   | 与后端成对的 ISR 回调校验密钥（**作者自行生成，禁止提交 Git**） |
| Giscus 相关             | 仅前端 `.env.local`，不进后端                           |


**后端环境变量（补充）**

| 变量 | 用途 |
|------|------|
| `REVALIDATE_URL` | 前端 revalidate 路由完整 URL（如本机或生产域名下的 `/api/revalidate`） |
| `REVALIDATE_SECRET` | 与 frontend 相同密钥，供后端触发 ISR 时使用 |

占位与说明见 `backend/.env.example`；**禁止**在 PRD 中填写真实密钥、数据库密码或 API Key。


**路由映射（生产）**

```text
https://<domain>/              → Next.js :3000
https://<domain>/api/          → FastAPI  :8000
https://<domain>/uploads/      → nginx 静态目录（Phase 2 上传）
```



### 4.5 Security & Privacy

- 密钥、`DATABASE_URL`、JWT `SECRET_KEY` 仅来自环境变量；提供 `backend/.env.example`、`frontend/.env.local.example`；**禁止**提交 `.env` / `.env.local`。
- 密码 **bcrypt** 存储；JWT 存 **HttpOnly** Cookie；生产 `COOKIE_SECURE=true`。
- 管理 API 未授权返回 401/403；生产不向访客暴露堆栈详情。
- 博客正文与用户数据存 PostgreSQL；**私人草稿不得作为 fixture 提交 Git**。
- Giscus 依赖 GitHub；隐私策略在 README 中说明第三方评论服务。



### 4.6 Non-Functional Requirements


| 类别       | 要求                                                                    |
| -------- | --------------------------------------------------------------------- |
| **性能**   | 公开文章 ISR；Server Component 内独立 fetch 使用 `Promise.all`；后台编辑器不进公开 bundle |
| **SEO**  | 公开列表/详情禁止纯 CSR 首屏；须 SSR/ISR 输出完整 HTML                                 |
| **可维护性** | 根目录 + `backend/` + `frontend/` 各有一份 README；**`AGENT.md`** 供 Agent/贡献者速查；**`docs/prd-xblog.md`** 入 Git；通过第 1.3 节 SC-6～SC-8 |




### 4.7 Constraints & Assumptions

- 开发环境：Windows / macOS / Linux；生产：Linux VPS。
- 依赖：Python 3.14、uv、Node.js LTS、pnpm、create-fastapi CLI、PostgreSQL（本地实例或 Docker）。
- `DATABASE_URL` 格式：`postgresql+psycopg://...`；无 SQLite 回退。
- create-fastapi 默认栈若与 PRD 冲突，**以本 PRD 为准**；脚手架问题回馈 create-fastapi，不在 xblog 内 fork 模板。
- 开源定位：**先自用、代码公开**；README 满足 clone → 配置 → 部署，不追求模板产品化。

### 4.8 主题与后台外观（实现要点）

> 产品行为见 **US-7**；本节供实现与验收对齐。

| 维度 | 公开站 | 管理后台 |
|------|--------|----------|
| 配置入口 | `/admin/settings` → 公开站外观 | `/admin/settings` → 后台外观 |
| 持久化 | PostgreSQL `site_settings` | 浏览器 `localStorage`（键名见实现，如 `xblog-admin-theme-v2`） |
| DOM 作用域 | `[data-site-shell]` · `data-site-palette` | `[data-admin-shell]` |
| 访客可见 | 是，全站一致 | 否（仅登录后 admin 区域） |

**公开站 preset palette（MVP）**：至少支持 4 套命名预设（如墨纸、深林、冷灰、墨夜），每套含 light/dark 模式；具体 CSS 变量在 `globals.css` 与前端主题定义中维护。

**后台壳层 UI**：侧边栏导航（文章、页面、友链、用户、设置等）、顶栏（折叠侧栏、标题区、头像菜单）、主内容区全宽；设置页分区展示「公开站外观」与「后台外观」，避免混淆。

---



## 5. Risks & Roadmap



### 5.1 Phased Rollout


| 阶段               | 范围     | 产出                                                                         |
| ---------------- | ------ | -------------------------------------------------------------------------- |
| **M0**           | PRD 定稿 | 本文档 v2.0                                                                   |
| **M1**           | 后端 MVP | create-fastapi 生成 `backend/`；SQLModel、Alembic、auth、文章 public/admin API、CLI |
| **M2**           | 前端 MVP | 作者初始化 `frontend/`；公开页 ISR、admin 登录与文章 CRUD                                 |
| **M3**           | 内容与发现  | Page、FriendLink、搜索、RSS、sitemap、PageView                                    |
| **M4**           | 部署与开源  | `deploy/`、根 README、**AGENT.md**、`.gitignore` 汇总、VPS + HTTPS 跑通 SC-5～SC-8 |
| **M5 — Phase 2** | 增强     | openapi-typescript、标签 CRUD 页、封面上传、Umami、Docker Compose、Demo 站              |


**MVP Done**：满足第 1.3 节 SC-1～SC-8 与第 2.2 节全部 Acceptance Criteria（含 US-7、US-8）。

### 5.2 Technical Risks


| 风险                        | 影响                 | 缓解                                                     |
| ------------------------- | ------------------ | ------------------------------------------------------ |
| create-fastapi 与 PRD 栈不一致 | 返工对齐 SQLModel / PG | 生成后对照 4.2 节清单；问题 upstream 修复                           |
| 同域 Cookie 在开发环境跨端口失效      | 本地 admin 登录失败      | 开发用 `localhost` 统一域名；CORS + `credentials: include` 文档化 |
| ISR revalidate 遗漏         | 发布后前台不更新           | 发布 API 成功后强制调用 revalidate；纳入 SC-4                      |
| 公开站主题保存后不生效            | 访客仍见旧配色            | 配置成对 ISR 环境变量；主题走 tag 失效；开发环境 no-store；见 SC-7、US-7   |
| Next.js Data Cache 与 path revalidate 不同步 | 仅 revalidatePath 不够 | 主题变更同时 revalidateTag + layout；文档写入 AGENT.md              |
| PostgreSQL 全文检索中文分词弱      | 搜索体验差              | MVP 接受简单 `to_tsvector`；Phase 2 评估 pg_jieba 等           |
| Giscus 依赖 GitHub          | 国内访问不稳定            | README 说明；评论为可选配置                                      |
| 单人维护范围膨胀                  | 延期                 | 严格遵守 2.3 Non-Goals                                     |


---



## 6. 作者手动执行清单

本章列出 **仅作者可执行** 的操作。实现业务代码时 Agent 可协作，但表中「谁执行」为 **作者** 的步骤不得交由 Agent 代跑。

### 6.1 一次性：开发环境安装

在首次开发前，本机需已安装并可用：


| #   | 事项                                                                   | 验证命令（示例）                              |
| --- | -------------------------------------------------------------------- | ------------------------------------- |
| 1   | Python 3.14                                                          | `python --version`                    |
| 2   | [uv](https://docs.astral.sh/uv/)                                     | `uv --version`                        |
| 3   | Node.js LTS                                                          | `node --version`                      |
| 4   | pnpm                                                                 | `pnpm --version`                      |
| 5   | [create-fastapi](https://github.com/xiongxianzhu/create-fastapi) CLI | `create-fastapi --version` 或 `--help` |
| 6   | PostgreSQL（本地实例或 Docker）                                             | `psql --version` 且能连接                 |


**Windows / macOS 安装步骤见附录 B。** 全部装完后，按顺序执行附录 B 末尾的「安装验收命令」。

### 6.2 仓库与密钥


| #   | 事项             | 说明                                                                     |
| --- | -------------- | ---------------------------------------------------------------------- |
| 1   | 克隆 / 维护 Git 仓库 | 如 `git clone git@github.com:xiongxianzhu/xblog.git`                    |
| 2   | 复制后端环境文件       | `backend/.env.example` → `backend/.env`，修改 `SECRET_KEY`、`DATABASE_URL` |
| 3   | 复制前端环境文件       | `frontend/.env.local.example` → `frontend/.env.local`                  |
| 4   | 提交边界           | **禁止**将 `.env`、`.env.local`、私人文章数据、用户上传文件提交到 Git                              |
| 5   | 忽略规则           | 根 `.gitignore` 覆盖 `.venv`、`.pytest_cache`、`.ruff_cache`、`.mypy_cache`、`node_modules`、`.next`、`backend/uploads/*` 等；见 US-8 |
| 6   | 文档               | `docs/prd-xblog.md`、`AGENT.md`、各 README **应提交**，供 clone 后阅读 |




### 6.3 后端脚手架（M1 前）

```bash
cd xblog
create-fastapi backend --path ./backend
```

- 参数与可选模块以 **create-fastapi 官方文档** 为准。
- 生成后由作者（或在与 Agent 协作下）提交 `backend/` 到 Git。
- Agent **不得**代替执行上述命令或从零手写等价脚手架目录。



### 6.4 前端脚手架（M2 前）

```powershell
cd xblog
pnpm create next-app@latest frontend --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --turbopack
```

随后作者手动：


| #   | 事项                                                                              |
| --- | ------------------------------------------------------------------------------- |
| 1   | `cd frontend && pnpm dev`，确认 [http://localhost:3000](http://localhost:3000) 可访问 |
| 2   | 创建 `frontend/.env.local.example` 并复制为 `.env.local`                              |
| 3   | 确认根 `.gitignore` 忽略 `node_modules/`、`.next/` 及 Python 工具缓存（可与 US-8 根规则合并）                                    |
| 4   | 删除误生成的 `package-lock.json`（仅保留 `pnpm-lock.yaml`）                                |
| 5   | 初始化 **shadcn/ui**（见附录 A.2）                                                      |


详见 **附录 A.2**。

### 6.5 数据库（开发与生产）


| #   | 事项                | 说明                                                     |
| --- | ----------------- | ------------------------------------------------------ |
| 1   | 安装并启动 PostgreSQL  | 开发与生产均使用 PostgreSQL，**不用 SQLite**                      |
| 2   | 创建数据库与用户          | 例：`CREATE DATABASE xblog;` + 专用用户与权限                   |
| 3   | 配置 `DATABASE_URL` | `postgresql+psycopg://user:pass@host:5432/xblog`       |
| 4   | 执行迁移              | 在 `backend/`：`uv sync` 后 `uv run alembic upgrade head` |




### 6.6 创建管理员（本地 + 生产各一次）

```bash
cd backend
uv run python -m app.cli create-admin --username <你的用户名>
# 按提示输入密码；禁止 admin/admin
```

- 本地开发环境创建后用于 `/admin` 登录测试。
- **生产 VPS 部署完成后**需在生产环境再执行一次（或迁移已有用户数据）。



### 6.7 本地日常运行（开发调试）

每次开发会话，由作者手动启动（或使用自行配置的终端多开）：

**终端 1 — 后端**

```bash
cd backend
uv sync                                    # 依赖变更时
uv run uvicorn app.main:app --reload --port 8000
```

**终端 2 — 前端**

```bash
cd frontend
pnpm install                               # 依赖变更时
pnpm dev
```

**终端 3 — 数据库**（若未作为系统服务常驻）

确保 PostgreSQL 已启动。

验证：[http://localhost:8000/api/v1/public/health](http://localhost:8000/api/v1/public/health) 与 [http://localhost:3000](http://localhost:3000) 均可访问。

### 6.8 第三方：Giscus 评论（MVP 可选配置）


| #   | 事项                                      | 说明                                |
| --- | --------------------------------------- | --------------------------------- |
| 1   | 在 GitHub 启用 Discussions                 | 用于 Giscus 数据源                     |
| 2   | 在 [giscus.app](https://giscus.app) 生成配置 | 获取 `repo`、`repoId`、`categoryId` 等 |
| 3   | 写入 `frontend/.env.local`                | 仅前端环境变量，不写死后端                     |




### 6.9 生产部署（M4，VPS 上手动）

在 Linux VPS 上，作者需手动完成（配置模板可来自 `deploy/`，但**安装与启用**由作者执行）：


| #   | 事项                                               | 说明                                              |
| --- | ------------------------------------------------ | ----------------------------------------------- |
| 1   | 安装 PostgreSQL / 云数据库                             | 生产 `DATABASE_URL` 写入服务器 `backend/.env`          |
| 2   | 安装 Node.js、pnpm、Python 3.14、uv                   | 与开发栈一致                                          |
| 3   | `git pull` 获取代码                                  | 在服务器克隆或拉取 xblog                                 |
| 4   | 后端：`uv sync`、`alembic upgrade head`、create-admin | 同 §6.5、§6.6                                     |
| 5   | 前端：`pnpm install`、`pnpm build`                   | 生产构建产物                                          |
| 6   | 配置 **nginx**                                     | `/` → `:3000`，`/api/` → `:8000`，`/uploads/` 静态  |
| 7   | 配置 **systemd**                                | 守护 uvicorn 与 `next start`                       |
| 8   | **HTTPS**                                        | certbot / Let's Encrypt；设置 `COOKIE_SECURE=true` |
| 9   | **ISR 回调**                                     | 前后端配置成对的 revalidate 密钥与 URL（值由作者生成，不写进 PRD） |
| 10  | 冒烟测试                                             | 满足 §1.3 SC-5～SC-8                               |




### 6.10 Agent 可协作 vs 作者必做（边界）


| 作者必做                               | Agent 可协作                          |
| ---------------------------------- | ---------------------------------- |
| §6.1～§6.4 环境与脚手架命令                 | 在已有骨架上编写业务代码（模型、API、页面）            |
| §6.5～§6.7 数据库、迁移、本地启停              | 编写 Alembic 迁移文件、路由、组件（不代跑 migrate） |
| §6.8 Giscus 账号与 GitHub 配置          | 前端嵌入 Giscus 组件代码                   |
| §6.9 生产服务器安装与 nginx/systemd/SSL | 编写 `deploy/` 配置模板与 README 说明       |
| Git push、域名 DNS、服务器购买              | 文档与代码 Review                       |


---



## 附录 A：项目初始化（作者自行执行）

> 分阶段 checklist 见 **第 6 章**。Agent **不得**代跑以下命令或代写脚手架文件。



### A.1 后端（create-fastapi）

```bash
cd xblog
create-fastapi backend --path ./backend
# 具体参数以 create-fastapi 文档为准
```

生成后扩展：SQLModel 模型、Alembic 迁移、§4.4 API、`python -m app.cli` 管理命令。

### A.2 前端（create-next-app + pnpm）

**前置**：Node.js LTS、pnpm 已安装；当前目录为 xblog 根目录。

```powershell
pnpm create next-app@latest frontend --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --turbopack
```

**自检**

```bash
cd frontend && pnpm dev
# http://localhost:3000 可见默认页
```

**骨架阶段配置**

1. 新增 `frontend/.env.local.example`（提交 Git）：
  ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
  ```
2. 根 `.gitignore` 忽略 `frontend/node_modules/`、`.next/` 及 `backend/` 下 Python 缓存、`.venv`、`uploads/*`（保留 `.gitkeep`）；完整清单见 **US-8**。
3. 若存在 `package-lock.json`，删除，仅保留 `pnpm-lock.yaml`。

**初始化 shadcn/ui（方案 A：全站统一）**

在 `frontend/` 目录执行（交互项可与下表一致；**由作者手动执行**）：

```powershell
cd frontend
pnpm dlx shadcn@latest init
```

| 选项 | 建议 |
|------|------|
| Style | **New York** |
| Base color | **Zinc**（或 Slate） |
| CSS variables | **Yes** |
| `components.json` 路径 | 默认 `@/components` |

按需添加 MVP 组件（实现阶段）：

```powershell
pnpm dlx shadcn@latest add button input label card table form textarea dropdown-menu
```

公开文章页正文排版可配合 `@tailwindcss/typography` 的 `prose` 与 shadcn 布局组合。

**M2 再安装**：`swr`、Markdown 编辑器、`openapi-typescript`（见 Phase 2）。

---



## 附录 B：开发环境安装指南（Windows · macOS）

以下组件均为 **§6.1 作者手动安装**。生产 VPS（Linux）部署见 §6.9，本文不包含 Linux 服务器安装细节。

**推荐安装顺序**：Git → Python 3.14 → uv → Node.js → pnpm → PostgreSQL → create-fastapi

---



### B.1 Git


| 平台          | 安装方式                                                                              |
| ----------- | --------------------------------------------------------------------------------- |
| **Windows** | 下载 [Git for Windows](https://git-scm.com/download/win)，或 `winget install Git.Git` |
| **macOS**   | `xcode-select --install`，或 `brew install git`                                     |


验证：`git --version`

---



### B.2 Python 3.14


| 平台          | 安装方式                                                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Windows** | 1. [python.org](https://www.python.org/downloads/) 下载 3.14 安装包，**勾选 “Add python.exe to PATH”** 2. 或：`winget install Python.Python.3.14` |
| **macOS**   | 1. [python.org](https://www.python.org/downloads/) macOS 安装包 2. 或：`brew install python@3.14`（若 Homebrew 已提供该版本）                         |


验证：

```bash
python --version    # 应显示 Python 3.14.x
# Windows 若命令不可用，试：py -3.14 --version
```

> **说明**：后续 `uv` 也可代为下载 Python；若 `uv python install 3.14` 成功，本机系统 Python 非必须，但建议至少有一种方式能跑 `python --version` 便于排查。

---



### B.3 uv（Python 包与工具管理）


| 平台                      | 安装方式                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Windows（PowerShell）** | `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"` 或：`winget install astral-sh.uv` |
| **macOS**               | `curl -LsSf https://astral.sh/uv/install.sh | sh` 或：`brew install uv`                                                |


安装后 **重新打开终端**，验证：

```bash
uv --version
```

可选：让 uv 管理 Python 3.14：

```bash
uv python install 3.14
uv python list
```

---



### B.4 Node.js（LTS）


| 平台          | 安装方式                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------- |
| **Windows** | 1. [nodejs.org](https://nodejs.org/) 下载 **LTS** 安装包 2. 或：`winget install OpenJS.NodeJS.LTS` |
| **macOS**   | 1. [nodejs.org](https://nodejs.org/) LTS 安装包 2. 或：`brew install node`                       |


验证：

```bash
node --version    # 建议 v20+ 或 v22+ LTS
npm --version
```

---



### B.5 pnpm

需先完成 **B.4 Node.js**。


| 平台                      | 安装方式                                                           |
| ----------------------- | -------------------------------------------------------------- |
| **Windows / macOS（通用）** | `npm install -g pnpm`                                          |
| **macOS（可选）**           | `brew install pnpm`                                            |
| **通用（Corepack）**        | `corepack enable` 然后 `corepack prepare pnpm@latest --activate` |


验证：

```bash
pnpm --version
```

---



### B.6 PostgreSQL

开发与生产均使用 PostgreSQL。本地需一个可连接的实例（本机安装或 Docker 二选一）。

#### 方式 A：本机安装（推荐入门）


| 平台          | 安装方式                                                                                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Windows** | 1. [PostgreSQL 官方 Windows 安装器](https://www.postgresql.org/download/windows/)（选 16 或更高） 2. 安装时记住 **superuser 密码**（默认用户 `postgres`） 3. 或：`winget install PostgreSQL.PostgreSQL` |
| **macOS**   | `brew install postgresql@16` 首次启动：`brew services start postgresql@16` （可选 GUI：[Postgres.app](https://postgresapp.com/)）                                                       |


安装后确认服务已启动：


| 平台          | 说明                                                 |
| ----------- | -------------------------------------------------- |
| **Windows** | 服务名通常为 `postgresql-x64-16`；「服务」管理器中应为 **正在运行**     |
| **macOS**   | `brew services list` 中 `postgresql@16` 为 `started` |


验证：

```bash
psql --version
```



#### 方式 B：Docker（Windows / macOS 通用）

已安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/) 时：

```bash
docker run -d --name xblog-pg \
  -e POSTGRES_USER=xblog \
  -e POSTGRES_PASSWORD=你的密码 \
  -e POSTGRES_DB=xblog \
  -p 5432:5432 \
  postgres:16
```

（Windows CMD 可将 `\` 去掉，写成一行。）

对应 `DATABASE_URL`：

```env
DATABASE_URL=postgresql+psycopg://xblog:你的密码@localhost:5432/xblog
```



#### 创建数据库与用户（本机安装、非 Docker 默认库时）

**Windows**：打开「SQL Shell (psql)」或以 `postgres` 用户连接：

```powershell
psql -U postgres
```

**macOS**：

```bash
psql postgres
```

在 `psql` 中执行（密码请自行替换）：

```sql
CREATE USER xblog WITH PASSWORD '你的密码';
CREATE DATABASE xblog OWNER xblog;
GRANT ALL PRIVILEGES ON DATABASE xblog TO xblog;
\q
```

`backend/.env` 示例：

```env
DATABASE_URL=postgresql+psycopg://xblog:你的密码@localhost:5432/xblog
```

---



### B.7 create-fastapi CLI

需先完成 **B.3 uv**。安装方式与 [create-fastapi](https://github.com/xiongxianzhu/create-fastapi) 一致：


| 方式               | 命令                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------ |
| **GitHub（当前推荐）** | `uv tool install git+https://github.com/xiongxianzhu/create-fastapi.git`             |
| **更新 / 重装**      | `uv tool install --reinstall git+https://github.com/xiongxianzhu/create-fastapi.git` |
| **PyPI（若已发布）**   | `uv tool install create-fastapi`                                                     |


验证：

```bash
create-fastapi --help
```

---



### B.8 安装验收（全部完成后执行）

在新终端中逐条运行，**均应成功**：

```bash
git --version
python --version          # 或 py -3.14 --version（Windows）
uv --version
node --version
pnpm --version
psql --version
create-fastapi --help
```

PostgreSQL 连接（按你的用户名调整）：

```bash
psql -U xblog -d xblog -h localhost -c "SELECT 1;"
```

返回 `1` 即表示数据库可用。随后继续 **§6.3**（生成 backend）与 **§6.4**（生成 frontend）。

---



### B.9 常见问题


| 现象                   | Windows                                        | macOS                                                                                            |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `python` 找不到         | 重装 Python 并勾选 PATH；或使用 `py -3.14`              | `brew link python@3.14` 或检查 PATH                                                                 |
| `uv` 找不到             | 重启终端；检查 `%USERPROFILE%\.local\bin` 是否在 PATH    | 重启终端；检查 `~/.local/bin` 是否在 PATH                                                                  |
| `psql` 找不到           | 将 `C:\Program Files\PostgreSQL\16\bin` 加入 PATH | `echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc` 并 `source ~/.zshrc` |
| 连接 PostgreSQL 拒绝     | 确认服务已启动；检查端口 5432 是否被占用                        | `brew services restart postgresql@16`                                                            |
| `create-fastapi` 找不到 | `uv tool update-shell` 后重启终端                   | 同左                                                                                               |


---



## 附录 C：变更记录


| 版本   | 日期         | 说明                                                                |
| ---- | ---------- | ----------------------------------------------------------------- |
| v2.6 | 2026-07-05 | 新增 **US-7** 后台壳层与双轨主题、**US-8** 文档与 `.gitignore`；**SC-7/SC-8**；`SiteSetting` 与 site-theme API；ISR 主题缓存与 env 说明（不含敏感值） |
| v2.5 | 2026-07-05 | 前端 UI 定为 **shadcn/ui + Tailwind**（全站方案 A）；附录 A.2 补充 init 步骤 |
| v2.4 | 2026-07-05 | 生产进程管理由 supervisor 改为 **systemd**；新增 `deploy/systemd/` 示例 unit |
| v2.3 | 2026-07-05 | 新增文档顶部「技术栈速查」；补充根目录 README                                        |
| v2.2 | 2026-07-05 | 新增附录 B：Windows / macOS 开发环境安装指南                                   |
| v2.1 | 2026-07-05 | 新增 §1.4 概览与第 6 章「作者手动执行清单」                                        |
| v2.0 | 2026-07-05 | 按 Strict PRD Schema 重构；补充 User Stories、可度量 Success Criteria、风险与附录 |
| v1.3 | 2026-07-05 | 前后端脚手架由作者初始化；Agent 不代生成                                           |
| v1.2 | 2026-07-05 | `backend/` 由 create-fastapi 生成                                    |
| v1.1 | 2026-07-05 | Python 3.14 · SQLModel · 全 PG · pnpm                              |
| v1.0 | 2026-07-05 | 初版                                                                |



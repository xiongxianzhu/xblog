# xblog 产品需求文档（PRD）


| 字段   | 值                                       |
| ---- | --------------------------------------- |
| 产品   | xblog 个人博客                              |
| 仓库   | `git@github.com:xiongxianzhu/xblog.git` |
| 许可证  | MIT                                     |
| 文档版本 | v2.10 |
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
| 公开页 | React Server Components + ISR · **next-intl**（`app/[locale]/`） |
| 后台 | Client Components · Markdown 编辑器懒加载 · SWR · **无 locale 前缀**（语言存 cookie） |
| 主题 | 公开站 DB 统一配置（7 款 palette + 站点品牌）· 后台 localStorage · 双轨互不干扰 |
| 评论 | Giscus |
| AI 写作 | Phase 2：SSE 网关 · **AI Composer**（多 Skill）· Agent Skills |
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
| SC-8 | 仓库含 `AGENTS.md`、根/`backend`/`frontend` README、`docs/prd-xblog.md`、`CONTRIBUTING.md`、`llms.txt`；`.gitignore` 覆盖前后端产物 | 克隆后文档可读、无 `.env` 泄漏 |
| SC-9 | 文章详情页在配置 Giscus 环境变量后显示评论；未配置时有明确引导 | 配置 env → 访问 `/blog/[slug]` |

**Phase 2 — AI 写作**（见 §3、US-AI-*；设计 spec：`docs/superpowers/specs/2026-07-05-ai-writing-skills-design.md`）

| # | 指标 | 验收方式 |
|---|------|----------|
| SC-AI-1 | 管理员配置并激活至少 1 个模型提供商后，可在文章编辑页完成选区润色 | 选中文本 → 润色 → SSE 流式 → 替换选区 |
| SC-AI-2 | 上传不符合 [agentskills.io](https://agentskills.io/specification) 的 Skill 包时被拒绝 | 故意错误 frontmatter → 422 + 中文说明 |
| SC-AI-3 | P2 对话改稿与 P3 全文生成可用 | 见 US-AI-3 / US-AI-4 |
| SC-AI-4 | API 响应、日志、DB 不泄露 API Key | 抓包 / 列表接口仅 `has_api_key` |
| SC-AI-5 | 未激活任何提供商时 AI 入口禁用并引导至设置页 | 空配置 → 设置 → AI 模型 |

**Phase 2 — 内容与运维增强**（设计 spec 见 `docs/superpowers/specs/`）

| # | 指标 | 验收方式 |
|---|------|----------|
| SC-UP-1 | 关浏览器后 1 小时内未保存的本地上传最终被清理 | 上传封面/LOGO 后不保存 → `cleanup-uploads` → 文件不存在 |
| SC-UP-2 | 已保存 DB 引用的 managed 上传不被误删 | 已发布文章/友链引用 URL → CLI 后文件仍在 |
| SC-UP-3 | 取消/关弹窗/离开编辑页时未保存上传即时 DELETE | 前端走 `pending-upload-cleanup.ts` |
| SC-LG-1 | 密码登录失败达阈值后要求 Turnstile；找回密码有 IP 限流 | 见 US-1 · `login_guard.py` |
| SC-FL-1 | 友链公开页展示 LOGO 与简介，不展示 URL 文本 | 访问 `/links` 人工走查 |




### 1.4 作者手动执行清单（概览）

以下事项 **必须由作者本人在本机或 VPS 上手动完成**；Agent 仅提供说明或业务代码，**不得**代跑脚手架命令、代配基础设施或代管密钥。


| 类别    | 手动事项                                                      | 详见              |
| ----- | --------------------------------------------------------- | --------------- |
| 环境安装  | Python 3.14、uv、Node.js、pnpm、create-fastapi CLI、PostgreSQL | §6.1 · **附录 B** |
| 仓库与密钥 | `git clone` / `push`；复制并编辑 `backend/.env`、`frontend/.env`（不提交）     | §6.2            |
| 后端脚手架 | `create-fastapi` 生成 `backend/`                            | §6.3 · 附录 A.1   |
| 前端脚手架 | `pnpm create next-app` 生成 `frontend/`                     | §6.4 · 附录 A.2   |
| 数据库   | 安装/启动 PostgreSQL；建库建用户；`alembic upgrade`                  | §6.5            |
| 管理员   | `uv run python -m app.cli create-admin`（本地与生产各执行）                      | §6.6            |
| 本地运行  | `uv sync`、`uvicorn`；`pnpm dev`                            | §6.7            |
| 第三方   | Giscus 所需 GitHub Discussions 仓库与前端 env                    | §6.8            |
| AI 模型  | 在后台 **设置 → AI 模型** 自行添加提供商、填写 API Key 并 **激活**（Phase 2） | §3 · §6.2       |
| 生产部署  | nginx、systemd、HTTPS（certbot）、生产 env；可选 **cron `cleanup-uploads`** | §6.9            |


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
- [ ] **可选**：短信验证码登录（`POST /auth/sms/send-code`、`POST /auth/sms/login`）；GitHub / 微信 OAuth（`/auth/oauth/*`）；管理员在 **设置 → 登录方式** 开关各方式；未启用方式不在登录页展示。
- [ ] **Turnstile / 登录防护**（可选）：`GET /auth/login-guard` 按失败次数决定是否展示验证码；`POST /auth/login` 与找回密码校验 `turnstile_token`；配置 `TURNSTILE_*` 与 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`（设计见 `docs/superpowers/specs/2026-07-05-login-captcha-design.md`）。
- [ ] 个人资料可绑定手机号（`PATCH /auth/phone`）；OAuth 绑定/解绑见 `/auth/oauth/links`。
- [ ] 登录尝试写入 **`login_log`**（成功/失败、方式、IP）；见 **US-11**。



#### US-2：写作与发布文章

**Story**：As a 管理员, I want to 在后台用 Markdown 写作并发布, so that 访客能阅读格式化内容。

**Acceptance Criteria**

- [ ] 管理端可创建/编辑/删除文章；支持 `draft` 与 `published` 状态。
- [ ] 保存或发布时，服务端将 `content_md` 渲染为 `content_html` 并持久化。
- [ ] 首次设为 `published` 且 `published_at` 为空时，自动写入当前东八区时间（`Asia/Shanghai`）。
- [ ] 公开 API 仅返回 `published` 文章；公开详情**不返回** `content_md`。
- [ ] 发布成功后触发 Next.js ISR revalidate，满足 SC-4。
- [ ] **文章封面**（可选）：`cover_url` 支持外链或本地上传（`POST/DELETE /admin/posts/cover` → `uploads/covers/`）；列表/详情 **4:3** 展示；保存时若移除 managed 封面则删磁盘文件。
- [ ] **未保存封面上传**：取消/离开编辑页时前端即时 DELETE；关浏览器场景由 **`cleanup-uploads` CLI** 兜底（见 **US-10**）。
- [ ] 正文 **代码块**在公开页显示语言标签（`data-code-language`）。



#### US-3：访客浏览与发现内容

**Story**：As a 访客, I want to 浏览文章、标签与固定页面, so that 我能了解作者内容与项目。

**Acceptance Criteria**

- [ ] 前台路由可用（含 locale 前缀，如 `/zh-CN/blog`）：`/`、`/blog`、`/blog/[slug]`、`/tags/[slug]`、`/about`、`/projects`、`/links`、`/search`；默认 locale 可无前缀重定向。
- [ ] 公开页顶栏提供 **语言切换**（next-intl）；后台 `/admin/*` **无** locale 前缀，语言由 cookie 控制。
- [ ] 文章列表支持分页；标签页展示该标签下已发布文章。
- [ ] `/about`、`/projects` 由 Page 模型驱动；友链按 `sort_order` 排序展示。
- [ ] **友链**：公开页展示 **LOGO**（外链或本地上传）与可选 **简介**；**不展示** URL 文本；后台 LOGO **必填**（见 **US-12**）。



#### US-4：搜索、订阅与 SEO

**Story**：As a 访客, I want to 搜索文章并通过 RSS 订阅, so that 我能快速找到并跟进更新。

**Acceptance Criteria**

- [ ] `GET /api/v1/public/search?q=` 使用 PostgreSQL 全文检索（`title`、`excerpt`、`content_md`）。
- [ ] RSS 与 `sitemap.xml` 至少一种实现路径可用（API 或 Next.js Route Handler，README 中注明选型）。
- [ ] 公开页含基础 Open Graph meta，满足 SC-2。



#### US-5：评论与访问统计

**Story**：As a 访客, I want to 在文章下评论, so that 我能与作者互动；As a 管理员, I want to 查看简单访问量, so that 我了解内容热度。

**Acceptance Criteria**

- [ ] 文章详情页 `/blog/[slug]` 底部嵌入 **Giscus** 评论区（「评论」标题 + 组件）。
- [ ] `repo` / `repoId` / `category` / `categoryId` 等 **仅**来自前端环境变量（`NEXT_PUBLIC_GISCUS_*`），不写死后端、不提交 `frontend/.env`。
- [ ] 提供 `frontend/.env.example` 占位模板；未配置时显示中文引导（链到 giscus.app），而非静默空白。
- [ ] 支持 `data-mapping="pathname"`（可经 `NEXT_PUBLIC_GISCUS_MAPPING` 覆盖）；可选 `NEXT_PUBLIC_GISCUS_THEME`、`NEXT_PUBLIC_GISCUS_INPUT_POSITION`。
- [ ] 评论组件为 Client 端动态加载 `giscus.app/client.js`；可与公开站 `mode` 联动，或用 env 指定 Giscus 主题。
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
- [ ] 管理员在 **设置 → 公开站外观** 选择配色（浅色/深色 + **7 款** preset palette：墨纸 / 深林 / 冷灰 / 夜读 / 石墨 / 海境 / 暮玫）；可配置 **站点名称**、**副标题**（`site_tagline`）、**LOGO**、**备案号**（`site_icp_number`，公开页页脚链至 beian.miit.gov.cn）；保存后写入后端 **`site_settings`**（键值存储）。
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

- [ ] 根目录含 **`README.md`**（Monorepo 概览、shields、快速开始）、**`AGENTS.md`**（AI/贡献者约定、主题 ISR、Git 规范）、**`CONTRIBUTING.md`**（贡献流程）、**`llms.txt`**（LLM 仓库导航，[llms.txt 规范](https://llmstxt.org/)）。
- [ ] **`docs/prd-xblog.md`** 纳入版本库，作为产品与验收的权威来源；**`docs/git-workflow.md`** 说明分支、Commit、PR、Review 文化；**`docs/superpowers/`** 存放功能 design spec 与 implementation plan。
- [ ] `backend/README.md`、`frontend/README.md` 分别说明本目录开发与部署。
- [ ] **`.github/`** 含 PR 模板与 Issue 模板（Bug / 功能建议）。
- [ ] **根 `.gitignore`** 汇总 Monorepo 忽略规则（含 Python 缓存 `.venv` / `.pytest_cache` / `.ruff_cache` / `.mypy_cache`、前端 `node_modules` / `.next`、`backend/uploads/` 用户文件等）；子目录 `.gitignore` 可与根规则等效互补。
- [ ] 环境模板仅用 `backend/.env.example`、`frontend/.env.example` 占位，**禁止**提交真实 `backend/.env`、`frontend/.env` 及用户上传内容。



#### US-9：国际化与后台文案（Phase 2+）

**Story**：As a 访客, I want to 切换公开页语言, so that 我能用熟悉的语言阅读；As a 管理员, I want to 后台界面与公开站使用一致的语言选项, so that 写作与配置更顺手。

**Acceptance Criteria**

- [ ] 公开站支持 **zh-CN**、**zh-TW**、**en**（`frontend/messages/*.json`）；路由在 `app/[locale]/` 下，由 `proxy.ts` + next-intl 处理。
- [ ] 后台 `/admin/*` **不使用** URL locale 前缀；访问 `/{locale}/admin/*` 应重定向至 `/admin/*`；后台语言存 **`NEXT_LOCALE` cookie**，切换后刷新生效。
- [ ] 顶栏 **语言切换** 组件在公开站与后台均可用；后台按钮宽度与文案完整显示。



#### US-AI-1：模型提供商配置（Phase 2 · P1）

**Story**：As a 管理员, I want to 在后台添加并激活 LLM 提供商, so that AI 写作使用我自己的 Key 与模型。

**Acceptance Criteria**

- [ ] **设置 → AI 模型** 可 CRUD 提供商；字段含 `name`、`provider_type`（openai / deepseek / zhipu / minimax / openai_compatible）、`base_url`、`model`、**激活**（`enabled`）、**默认**（`is_default`）。
- [ ] API Key **仅**写入 PostgreSQL 加密字段；列表/详情返回 `has_api_key`，**永不**返回明文。
- [ ] 创建时 `provider_type` 可预填建议 `base_url`（用户可改）；**系统不内置**固定厂商实例或共享 Key。
- [ ] `POST /api/v1/admin/ai/providers/{id}/test` 用已存 Key 发最小 completion，返回成功或错误信息。
- [ ] 未激活任何提供商时，文章编辑页 AI 入口不可用并引导至设置页（SC-AI-5）。



#### US-AI-2：Agent Skills 管理（Phase 2 · P1）

**Story**：As a 管理员, I want to 上传与管理符合 agentskills.io 的 Skill, so that AI 写作遵循可复用的写作规范。

**Acceptance Criteria**

- [ ] **设置 → Skills** 支持上传 `.zip`、新建、编辑 `SKILL.md`、删除、启用/禁用。
- [ ] Skill 存于 `backend/uploads/skills/{name}/`，DB 存元数据；`name` / `description` 符合 [Agent Skills Specification](https://agentskills.io/specification)。
- [ ] 校验失败返回 **422** 与可读中文错误（SC-AI-2）。
- [ ] 可配置三场景默认 Skill：`polish`、`chat`、`generate`；未选手动 Skill 时走默认 + description 关键词推荐。
- [ ] MVP **不执行** Skill 内 `scripts/`，仅将 `SKILL.md` body 注入 system prompt。



#### US-AI-3：选区操作与对话改稿（Phase 2 · P1 / P2）

**Story**：As a 管理员, I want to 对 Markdown 选区或整篇对话进行 AI 辅助, so that 写作更高效。

**Acceptance Criteria**

- [ ] **P1**：文章 / 关于 / 作品集编辑页选区工具栏支持润色、扩写、缩写、改标题；`POST /api/v1/admin/ai/complete` 返回 **SSE** 流式结果（`delta` / `thinking` / `done` / `error`）；可预览后 **替换选区**。
- [ ] **P2**：编辑页右侧 **内嵌 AI 助手面板**（非 Sheet）支持多轮对话（`action=chat`），可展示 **思考过程**；**AI Composer**：Skill Chip、`/` 唤起多 Skill（每 Skill 仅选一次）、快捷按钮、输入区 **模型选择**（设计见 `docs/superpowers/specs/2026-07-05-ai-editor-composer-design.md`）。
- [ ] 后端 `complete` 支持 **`skill_ids` 多 Skill 合并** system prompt。
- [ ] 所有 AI 请求经后端网关；前端不持有 Key（SC-AI-4）。
- [ ] `ai_usage_log` 记录 action、token 用量与延迟，**不存** prompt 与文章正文。



#### US-AI-4：全文生成（Phase 2 · P3）

**Story**：As a 管理员, I want to 从主题与大纲生成 Markdown 草稿, so that 我能快速起稿。

**Acceptance Criteria**

- [ ] **P3**：AI 助手支持 `action=generate`（主题 + 可选大纲）；**全文生成**输入区足够大以便粘贴长大纲。
- [ ] 流式预览后可 **插入光标处** 或 **覆盖全文**（需确认）。
- [ ] 生成内容遵循 Skill 与基础 system 约束（Markdown、不编造外链等）。



#### US-10：本地上传与孤儿清理

**Story**：As a 管理员, I want to 先上传封面/LOGO 再保存表单, so that 编辑体验流畅；As a 运维者, I want to 自动清理未引用文件, so that 磁盘不会无限增长。

**Acceptance Criteria**

- [ ] Managed 上传目录：`uploads/covers/`（文章封面）、`uploads/link-logos/`（友链 LOGO）；URL 前缀 `/api/v1/uploads/covers/`、`/api/v1/uploads/link-logos/`。
- [ ] **即时清理**：取消、关弹窗、移除、重传、离开编辑页时，前端 `pending-upload-cleanup.ts` 调用对应 `DELETE` API（SC-UP-3）。
- [ ] **保存时清理**：PATCH 换图或置空时，后端删除旧 managed 文件（已有）。
- [ ] **兜底清理**：`uv run python -m app.cli cleanup-uploads [--max-age 3600] [--dry-run]` 仅扫描上述两目录 + 对比 DB 引用；非全盘扫描（SC-UP-1/2）。
- [ ] 生产建议 cron 每小时执行；设计见 `docs/superpowers/specs/2026-07-05-upload-orphan-cleanup-design.md`。



#### US-11：登录与操作审计

**Story**：As a 管理员, I want to 查看登录与后台操作记录, so that 我能追溯异常访问与变更。

**Acceptance Criteria**

- [ ] 表 **`login_log`**：记录登录方式、成功/失败、IP、User-Agent；密码/OAuth/短信登录路径均写入。
- [ ] 表 **`operation_log`**：记录管理端关键写操作（action、resource、IP）。
- [ ] `GET /api/v1/admin/logs/login`、`GET /api/v1/admin/logs/operations` 支持 **`page` / `page_size`** 分页（默认 20）。
- [ ] 前端 **`AdminPagination`** 组件与 API 客户端就绪；侧栏含日志入口（列表页 UI 可后续迭代）。



#### US-12：友链 LOGO 与简介

**Story**：As a 管理员, I want to 为友链配置 LOGO 与简介, so that 公开页更美观且信息完整。

**Acceptance Criteria**

- [ ] **`FriendLink`** 含 `logo_url`（必填）、`description`（可选，迁移 013）。
- [ ] `POST/DELETE /admin/links/logo` 本地上传至 `uploads/link-logos/`；外链 LOGO URL 亦允许。
- [ ] 后台列表展示 LOGO 缩略图；编辑表单 **2px 扁平** 风格，LOGO 上限 **5MB**。
- [ ] 公开 `/links` 展示 LOGO + 简介，**隐藏** URL 文本（SC-FL-1）。
- [ ] 未保存 LOGO 走 **US-10** 三层清理逻辑。



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
- 内容多语言（同一篇文章多 locale 版本并存；CMS 级翻译工作流）
- 访客侧 AI、公开 AI API、Skill 内 **scripts 服务端执行**（Phase 2 AI 亦不做）
- 多租户 / 多管理员独立 Key、自动发布、批量 SEO 生成

---



## 3. AI System Requirements

### 3.1 范围说明

| 能力 | MVP | Phase 2（AI 写作） |
|------|-----|-------------------|
| 站内 AI 写作 | 否 | 是（管理员后台） |
| 访客 AI | 否 | 否 |
| 仓库 **`llms.txt`** | 是（外部 LLM 文档索引，[llms.txt 规范](https://llmstxt.org/)） | 保持 |

**权威设计**：

| 主题 | Spec | Plan |
|------|------|------|
| AI 写作 Skill | `docs/superpowers/specs/2026-07-05-ai-writing-skills-design.md` | `docs/superpowers/plans/2026-07-05-ai-writing-skills-plan.md` |
| AI Composer | `docs/superpowers/specs/2026-07-05-ai-editor-composer-design.md` | —（随 Composer 实现归档） |
| 登录 Turnstile | `docs/superpowers/specs/2026-07-05-login-captcha-design.md` | `docs/superpowers/plans/2026-07-05-login-captcha-plan.md` |
| 上传孤儿清理 | `docs/superpowers/specs/2026-07-05-upload-orphan-cleanup-design.md` | `docs/superpowers/plans/2026-07-05-upload-orphan-cleanup-plan.md` |

### 3.2 架构原则

- **后端 AI 网关**：FastAPI 模块统一调用 LLM；前端经 Cookie 会话访问 `/api/v1/admin/ai/*`。
- **SSE 流式**：`POST /api/v1/admin/ai/complete` 返回 `text/event-stream`（`delta` / `thinking` / `done` / `error`）。
- **Key 隔离**：API Key 加密存 PostgreSQL；禁止出现在前端 env、Git、PRD、日志与 usage 表正文。
- **OpenAI 兼容为主**：Chat Completions 适配层覆盖 OpenAI、DeepSeek、智谱 GLM、MiniMax 及自定义 `base_url`。

### 3.3 模型提供商

- 管理员在 **设置 → AI 模型** **自行创建** 提供商，填写 `base_url`、`model`、API Key，并 **激活**（`enabled=true`）后可用。
- 可指定 **一个默认提供商**（`is_default`）；`complete` 未传 `provider_id` 时使用「已激活 + 默认」项。
- **无内置固定厂商**；`provider_type` 仅提供表单模板（建议 base URL），不预置 Key。

### 3.4 Agent Skills

- 目录包符合 [agentskills.io](https://agentskills.io/specification)：`SKILL.md` + 可选 `scripts/`、`references/`、`assets/`。
- 存储：`backend/uploads/skills/{name}/`；管理端上传 zip / 新建 / 编辑 / 删除。
- 选用策略：**场景默认**（polish / chat / generate）+ **description 关键词推荐** + **Composer 手动多选**（`skill_ids`）。
- 内置 Skill 含：`blog-chat-zh`、`blog-polish-zh`、`blog-generate-zh`、`blog-format-zh`（排版）、`blog-excerpt-zh`（摘要）。
- MVP 不执行 `scripts/`，仅注入 `SKILL.md` body 至 system prompt。

### 3.5 写作能力与分阶段

| 阶段 | 能力 | 关联 US |
|------|------|---------|
| **P1** | 提供商 + Skill + 选区润色/扩写/缩写/改标题 + SSE | US-AI-1、US-AI-2、US-AI-3 |
| **P2** | 侧边栏多轮对话 + **AI Composer** | US-AI-3 |
| **P3** | 主题/大纲 → 全文生成 | US-AI-4 |

### 3.6 数据与安全

| 表 / 资源 | 用途 |
|-----------|------|
| `ai_provider` | 提供商与加密 Key |
| `ai_skill` | Skill 元数据 |
| `ai_skill_default` | 三场景默认 Skill |
| `ai_usage_log` | 审计（无正文） |

| 环境变量 | 说明 |
|----------|------|
| `AI_KEY_ENCRYPTION_SECRET` | Key 加密（推荐生产独立配置） |
| `SECRET_KEY` | 未设上项时的加密回退 |

速率限制（MVP）：约 60 次/分钟/管理员。

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

外部：Giscus（评论，前端嵌入）；Phase 2：各 LLM 厂商 API（后端出站，Key 仅服务端）
```

**Monorepo 结构**

```text
xblog/
├── AGENTS.md          # AI 助手与贡献者协作说明
├── CONTRIBUTING.md   # 开源贡献与 Git 工作流入口
├── llms.txt          # LLM 仓库导航（llms.txt 规范）
├── README.md
├── .gitignore        # Monorepo 忽略规则（汇总前后端）
├── .github/          # PR / Issue 模板
├── backend/          # create-fastapi 生成 + 博客业务扩展
├── frontend/         # create-next-app 初始化 + 页面与 admin
├── deploy/           # nginx · systemd
├── docs/
│   ├── prd-xblog.md
│   └── git-workflow.md
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
| 评论   | Giscus · Client 动态加载 · 文章详情 `/blog/[slug]` · env 配置 |




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
| **FriendLink** | `name`, `url`, `logo_url`, `description?`, `sort_order`                                                                                              |
| **PageView**   | `path`, `referrer?`, `visited_at`                                                                                                     |
| **LoginLog**   | `username`, `method`, `success`, `failure_reason?`, `ip_address?`, `user_agent?`, `created_at`                                       |
| **OperationLog** | `username`, `action`, `resource_type?`, `resource_id?`, `detail?`, `ip_address?`, `created_at`                                     |
| **User**       | `username`†, `password_hash`, `phone?`, `avatar_url?`, `created_at`                                                                                            |
| **SiteSetting** | `key`†, `value`（JSON 字符串）；含 `site.theme.*`、`site.brand.name` / `tagline` / `logo_url` / **`icp_number`** 等 |


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
| GET       | `/public/site-theme`        | 否      | 公开站主题（mode + palette + 站点品牌） |
| POST      | `/auth/login`               | 否      | 用户名密码登录（含 Turnstile token）       |
| GET       | `/auth/login-guard`         | 否      | 登录页是否必填 Turnstile       |
| GET       | `/auth/login-methods`       | 否      | 已启用的登录方式     |
| POST      | `/auth/sms/send-code`       | 否      | 发送短信验证码       |
| POST      | `/auth/sms/login`           | 否      | 短信验证码登录       |
| GET       | `/auth/oauth/providers`     | 否      | OAuth 提供商列表     |
| GET/POST  | `/auth/oauth/*`             | 否/是   | GitHub / 微信 OAuth 与绑定 |
| POST      | `/auth/logout`              | 是      | 登出       |
| POST      | `/auth/refresh`             | Cookie | 刷新 token |
| GET       | `/auth/me`                  | 是      | 当前用户     |
| PATCH     | `/auth/phone`               | 是      | 绑定手机号   |
| *         | `/admin/posts`…             | 是      | 文章 CRUD · 封面上传     |
| POST/DELETE | `/admin/posts/cover`      | 是      | 文章封面上传/删除        |
| POST/DELETE | `/admin/links/logo`       | 是      | 友链 LOGO 上传/删除      |
| GET       | `/admin/logs/login`         | 是      | 登录审计（分页）         |
| GET       | `/admin/logs/operations`    | 是      | 操作审计（分页）         |
| GET/PATCH | `/admin/auth-settings`      | 是      | 登录方式开关 |
| *         | `/admin/ai/providers`…      | 是      | AI 提供商 / Skill / SSE complete |
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
| Giscus 相关             | 仅前端 `frontend/.env`（模板见 `frontend/.env.example`），不进后端 |
| `NEXT_PUBLIC_GISCUS_REPO` | GitHub 仓库，如 `owner/repo` |
| `NEXT_PUBLIC_GISCUS_REPO_ID` | giscus.app 生成的 `R_…` |
| `NEXT_PUBLIC_GISCUS_CATEGORY` | Discussions 分类名 |
| `NEXT_PUBLIC_GISCUS_CATEGORY_ID` | giscus.app 生成的 `DIC_…` |
| `NEXT_PUBLIC_GISCUS_MAPPING` | 可选，默认 `pathname` |
| `NEXT_PUBLIC_GISCUS_THEME` | 可选，Giscus 主题名（覆盖公开站联动时） |
| `NEXT_PUBLIC_GISCUS_INPUT_POSITION` | 可选，`top` / `bottom` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile 站点 Key（与 backend 一致） |

| 变量 | 用途 |
|------|------|
| `REVALIDATE_URL` | 前端 revalidate 路由完整 URL（如本机或生产域名下的 `/api/revalidate`） |
| `REVALIDATE_SECRET` | 与 frontend 相同密钥，供后端触发 ISR 时使用 |
| `AI_KEY_ENCRYPTION_SECRET` | AI 提供商 Key 加密（留空则派生自 `SECRET_KEY`） |
| `GITHUB_*` / `WECHAT_*` | OAuth 客户端凭据（可选） |
| `SMS_PROVIDER` 等 | 短信验证码（开发默认 `dev`，验证码写日志） |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile（与 frontend 公钥一致） |
| `LOGIN_CAPTCHA_AFTER_FAILURES` 等 | 登录失败触发验证码 · 限流 |
| `UPLOAD_DIR` | 上传根目录（`covers/`、`link-logos/`、Skill 包等） |

占位与说明见 `backend/.env.example`；**禁止**在 PRD 中填写真实密钥、数据库密码或 API Key。


**路由映射（生产）**

```text
https://<domain>/              → Next.js :3000
https://<domain>/api/          → FastAPI  :8000
https://<domain>/uploads/      → nginx 静态或 FastAPI 挂载（covers/ · link-logos/ · skills/）
```



### 4.5 Security & Privacy

- 密钥、`DATABASE_URL`、JWT `SECRET_KEY` 仅来自环境变量；提供 `backend/.env.example`、`frontend/.env.example`；**禁止**提交 `backend/.env` / `frontend/.env`。
- 密码 **bcrypt** 存储；JWT 存 **HttpOnly** Cookie；生产 `COOKIE_SECURE=true`。
- 管理 API 未授权返回 401/403；生产不向访客暴露堆栈详情。
- 博客正文与用户数据存 PostgreSQL；**私人草稿不得作为 fixture 提交 Git**。
- Giscus 依赖 GitHub；隐私策略在 README 中说明第三方评论服务。



### 4.6 Non-Functional Requirements


| 类别       | 要求                                                                    |
| -------- | --------------------------------------------------------------------- |
| **性能**   | 公开文章 ISR；Server Component 内独立 fetch 使用 `Promise.all`；后台编辑器不进公开 bundle |
| **SEO**  | 公开列表/详情禁止纯 CSR 首屏；须 SSR/ISR 输出完整 HTML                                 |
| **可维护性** | 根目录 + `backend/` + `frontend/` 各有一份 README；**`AGENTS.md`**、**`CONTRIBUTING.md`**、**`llms.txt`**；**`docs/git-workflow.md`**；通过第 1.3 节 SC-6～SC-9 |




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

**公开站 preset palette**：**7 款**统一 ID（`editorial` / `forest` / `slate` / `ink` / `graphite` / `ocean` / `rose`），公开站与后台各提供相同 7 款选项；每套含 light/dark 模式。CSS 变量在 `globals.css` 与 `frontend/lib/themes.ts` 维护。

**站点品牌**：`site_name`、`site_tagline`（副标题）、`site_logo_url`、**`site_icp_number`**（备案号，公开页页脚）经 `GET/PATCH /admin/site-theme` 与公开 API 下发。

**后台壳层 UI**：侧边栏导航（文章、页面、友链、用户、设置等）、顶栏（折叠侧栏、毛玻璃、标题区、**头像**菜单）、主内容区 **全宽**；设置页分区展示「公开站外观」与「后台外观」，避免混淆。

**Giscus 评论**：实现于 `frontend/components/giscus.tsx`；文章页 `frontend/app/blog/[slug]/page.tsx` 引入；配置说明见 `frontend/.env.example` 与 §6.8。

---



## 5. Risks & Roadmap



### 5.1 Phased Rollout


| 阶段               | 范围     | 产出                                                                         |
| ---------------- | ------ | -------------------------------------------------------------------------- |
| **M0**           | PRD 定稿 | 本文档 v2.0                                                                   |
| **M1**           | 后端 MVP | create-fastapi 生成 `backend/`；SQLModel、Alembic、auth、文章 public/admin API、CLI |
| **M2**           | 前端 MVP | 作者初始化 `frontend/`；公开页 ISR、admin 登录与文章 CRUD                                 |
| **M3**           | 内容与发现  | Page、FriendLink、搜索、RSS、sitemap、PageView                                    |
| **M4**           | 部署与开源  | `deploy/`、文档体系（README / AGENT / CONTRIBUTING / llms.txt / git-workflow）、`.github` 模板、VPS + HTTPS 跑通 SC-5～SC-9 |
| **M5 — Phase 2a** | AI 写作 P1 | 提供商 CRUD + 激活 + test；Skill 管理 + 校验；选区 AI + SSE；SC-AI-1/2/4/5 · **已实现** |
| **M6 — Phase 2b** | AI 写作 P2/P3 + 增强 | 内嵌 AI 助手 + Composer + 思考流；全文生成；i18n；短信/OAuth/Turnstile；7 款主题与站点品牌 · **已实现** |
| **M7 — Phase 2c** | 内容与运维 | 封面上传 · 友链 LOGO/简介 · 上传孤儿清理 · 审计日志 API · 备案号 · **已实现（部分）** |
| **M8 — 待定** | 后续 | 审计日志列表 UI · openapi-typescript · 标签 CRUD 页 · Umami · Docker Compose · Demo 站 |


**MVP Done**：满足第 1.3 节 SC-1～SC-9 与第 2.2 节 US-1～US-8 Acceptance Criteria。

**Phase 2 AI Done**：满足 SC-AI-1～SC-AI-5 与 US-AI-1～US-AI-4（按 P1→P3 分阶段验收）。

**Phase 2 增强 Done（v2.10）**：满足 SC-UP-*、SC-LG-1、SC-FL-1 与 US-10～US-12（审计日志 **列表 UI** 见 M8）。

### 5.2 Technical Risks


| 风险                        | 影响                 | 缓解                                                     |
| ------------------------- | ------------------ | ------------------------------------------------------ |
| create-fastapi 与 PRD 栈不一致 | 返工对齐 SQLModel / PG | 生成后对照 4.2 节清单；问题 upstream 修复                           |
| 同域 Cookie 在开发环境跨端口失效      | 本地 admin 登录失败      | 开发用 `localhost` 统一域名；CORS + `credentials: include` 文档化 |
| ISR revalidate 遗漏         | 发布后前台不更新           | 发布 API 成功后强制调用 revalidate；纳入 SC-4                      |
| 公开站主题保存后不生效            | 访客仍见旧配色            | 配置成对 ISR 环境变量；主题走 tag 失效；开发环境 no-store；见 SC-7、US-7   |
| Next.js Data Cache 与 path revalidate 不同步 | 仅 revalidatePath 不够 | 主题变更同时 revalidateTag + layout；文档写入 AGENTS.md              |
| PostgreSQL 全文检索中文分词弱      | 搜索体验差              | MVP 接受简单 `to_tsvector`；Phase 2 评估 pg_jieba 等           |
| Giscus 依赖 GitHub          | 国内访问不稳定            | README 说明；评论为可选配置                                      |
| 单人维护范围膨胀                  | 延期                 | 严格遵守 2.3 Non-Goals                                     |
| LLM 厂商 API 变更 / 限流        | AI 写作不可用         | OpenAI 兼容层 + 用户自配多提供商；test 端点；usage 日志 |
| API Key 泄漏                    | 费用与安全风险          | 加密存储、响应脱敏、禁止前端 Key；见 SC-AI-4                  |
| 上传孤儿文件残留              | 磁盘占满              | 前端 pending DELETE + `cleanup-uploads` cron；见 US-10、SC-UP-* |
| Turnstile 配置不一致          | 无法登录              | 对齐前后端 Key 与后台登录方式开关；见 SC-LG-1                    |


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
| 2   | 复制后端环境文件       | `backend/.env.example` → `backend/.env`，修改 `SECRET_KEY`、`DATABASE_URL`；Phase 2 AI 可选 `AI_KEY_ENCRYPTION_SECRET` |
| 3   | 复制前端环境文件       | `frontend/.env.example` → `frontend/.env`                  |
| 4   | 提交边界           | **禁止**将 `backend/.env`、`frontend/.env`、私人文章数据、用户上传文件提交到 Git                              |
| 5   | 忽略规则           | 根 `.gitignore` 覆盖 `.venv`、`.pytest_cache`、`.ruff_cache`、`.mypy_cache`、`node_modules`、`.next`、`backend/uploads/*` 等；见 US-8 |
| 6   | 文档               | `docs/prd-xblog.md`、`AGENTS.md`、各 README **应提交**，供 clone 后阅读 |




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
| 2   | 复制 `frontend/.env.example` → `frontend/.env`                              |
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
| 1   | 在 GitHub 仓库启用 **Discussions**                 | 可与主仓库 `xblog` 同库，或独立 `xblog-comments` 分类 |
| 2   | 在 [giscus.app](https://giscus.app/zh-CN) 生成配置 | 获取 `repo`、`repoId`、`category`、`categoryId` |
| 3   | 复制 `frontend/.env.example` → `frontend/.env` 并填写 | `NEXT_PUBLIC_GISCUS_*`；**勿提交** `frontend/.env` |
| 4   | 重启 `pnpm dev`；生产环境改 env 后须重新 `pnpm build` | `NEXT_PUBLIC_*` 在构建时注入 |




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
| 10  | **上传清理 cron**（推荐）                         | 每小时 `uv run python -m app.cli cleanup-uploads`（见 backend README） |
| 11  | 冒烟测试                                             | 满足 §1.3 SC-5～SC-8                               |




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

1. 维护 `frontend/.env.example`（提交 Git），作者复制为 `frontend/.env`：
  ```env
   BACKEND_URL=http://localhost:8000
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   REVALIDATE_SECRET=change-me-revalidate
   # NEXT_PUBLIC_GISCUS_* 见 .env.example 完整列表
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
| v2.10 | 2026-07-05 | **US-10～12**（上传三层清理、审计日志、友链 LOGO/简介）；**SC-UP/LG/FL**；**US-7** 备案号；**US-AI-3** AI Composer；数据模型 **LoginLog/OperationLog**；API 路由与 **M7/M8** 路线图；关联 superpowers spec 索引 |
| v2.9 | 2026-07-05 | 同步实现：**US-9** i18n（公开站 `[locale]`、后台 cookie）；**US-1** 短信/OAuth；**US-7** 7 款 palette + 站点品牌；**US-AI-3** 内嵌 AI 面板 + thinking SSE；关于/作品集 AI；Non-Goals 调整内容多语言 |
| v2.8 | 2026-07-05 | **Phase 2 AI 写作**：§3 AI System Requirements；**US-AI-1～4**、**SC-AI-1～5**；路线图 **M5/M6/M7**；关联 design spec 与 implementation plan |
| v2.7 | 2026-07-05 | 同步 **Giscus** 实现细节与 env 清单；**US-8** 扩展 CONTRIBUTING / git-workflow / llms.txt / `.github` 模板；**SC-9**；§3 明确 llms.txt 定位 |
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



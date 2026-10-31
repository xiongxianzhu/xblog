# AGENTS.md

xblog 编码助手与贡献者协作规范。

[项目说明](README.md) · [PRD](docs/prd.md) · [贡献指南](CONTRIBUTING.md) · [Git 工作流](docs/git-workflow.md) · [后端](backend/README.md) · [前端](frontend/README.md)

## 项目结构

xblog 是自托管个人博客 Monorepo。

| 目录 | 职责 |
| --- | --- |
| `backend/` | FastAPI、PostgreSQL、JWT Cookie、Markdown 渲染 |
| `frontend/` | Next.js 公开页与管理后台 |
| `deploy/` | nginx、systemd 配置示例 |
| `docs/` | 需求、接口、数据库、部署与任务文档 |
| `docs/superpowers/` | 功能设计与实施计划 |

后端按 `models`、`schemas`、`services`、`api/v1` 分层；迁移在 `backend/alembic/`，测试在 `backend/tests/`。前端页面在 `app/`，组件在 `components/`，请求与公共逻辑在 `lib/`。

## 工作约束

- 编码前阅读 [PRD](docs/prd.md) 相关章节，明确改动范围：公开页、后台、API、迁移或部署。
- 开发和生产数据库使用 PostgreSQL，不以 SQLite 替代。现有内存测试不能替代 PostgreSQL 验收。
- 只改任务相关内容，不顺手重构，不增加推测性抽象。
- 沿用现有命名、目录、shadcn/ui 和 Tailwind 风格。
- 公开页优先 Server Component；后台交互使用 Client Component 和 SWR。
- 内容变更需检查 ISR 刷新链路，复用现有 revalidate 实现。
- 新增数据库字段必须提供 Alembic 迁移，不只修改模型。
- 用户未要求时，不主动新增 Markdown 文档。
- 不提交 `.env`、密钥、真实用户数据或上传文件；上传目录仅保留 `.gitkeep`。

## 本地开发与检查

环境要求：Python 3.14+、uv、Node.js 20.9+、pnpm 9+、PostgreSQL。

在 `backend/` 执行：

```bash
make install
make setup
# 编辑 .env：SECRET_KEY、DATABASE_URL
make migrate
make dev
```

API 默认监听 `127.0.0.1:10242`；健康检查为 `/api/v1/public/health`，接口文档为 `/docs`。健康检查只验证进程响应。

在 `frontend/` 执行：

```bash
pnpm install
pnpm dev
```

前端默认监听 `localhost:10241`。[next.config.ts](frontend/next.config.ts) 将 `/api/*` 代理到 `BACKEND_URL`。

提交前执行对应检查，分别在各目录运行：

```bash
# backend/
make check

# frontend/
pnpm lint
pnpm build
```

`make check` 包含 Ruff、mypy 和 pytest。未执行的检查应注明，不将代码或测试文件存在视为验收通过。

## API 分层

路由入口：[backend/app/api/v1/router.py](backend/app/api/v1/router.py)。完整契约见 [api.md](docs/api.md)。

| 前缀 | 认证 | 用途 |
| --- | --- | --- |
| `/api/v1/public/*` | 无 | 公开文章、搜索、友链、主题与访问上报 |
| `/api/v1/auth/*` | 按接口要求 | 登录、Cookie 会话、短信、OAuth、个人资料 |
| `/api/v1/admin/*` | 管理员 Cookie | 内容管理、用户、站点设置、AI 网关 |

内容管理写操作放在 admin，不向 public 新增内容增删改接口。现有匿名 pageviews 上报不授权公开内容写入。

## 主题与缓存

公开站与后台主题独立，不能互相覆盖。

| 范围 | 存储 | DOM 作用域 |
| --- | --- | --- |
| 公开站 | `site_settings`，包含主题、名称、副标题、LOGO、备案号 | `[data-site-shell]`、`data-site-palette` |
| 后台 | localStorage：`xblog-admin-theme-v2` | `[data-admin-shell]` |

两者使用相同的 7 款配色 ID。公开站不使用访客 localStorage 保存主题。

保存公开主题的链路：后台 PATCH → 数据库 → 后端调用 `/api/revalidate` → Next.js 失效 `site-theme` tag 与布局缓存。

- 开发环境每次读取主题，保存后刷新即可。
- 生产环境必须配置双端一致的 `REVALIDATE_SECRET`，`REVALIDATE_URL` 直连 Next.js；否则可能保留旧缓存。
- 回调使用 `revalidateTag(tag, "max")`，保留第二个参数。

| 文件 | 职责 |
| --- | --- |
| [frontend/lib/site-theme.ts](frontend/lib/site-theme.ts) | 服务端主题读取与缓存 |
| [frontend/lib/themes.ts](frontend/lib/themes.ts) | 配色定义 |
| [frontend/app/api/revalidate/route.ts](frontend/app/api/revalidate/route.ts) | 缓存失效回调 |
| [backend/app/services/revalidate.py](backend/app/services/revalidate.py) | 发送回调 |
| [backend/app/services/site_settings.py](backend/app/services/site_settings.py) | 主题与品牌配置 |

## 国际化

- 公开页位于 `frontend/app/[locale]/`，由 URL locale 和 next-intl 解析语言。
- 后台位于 `/admin/*`，不加 `[locale]`，语言读取 `NEXT_LOCALE` cookie。
- `frontend/proxy.ts` 将 `/{locale}/admin/*` 重定向到 `/admin/*`，并为后台请求注入 `x-pathname`。
- 文案位于 `frontend/messages/{zh-CN,zh-TW,en}.json`；切换逻辑见 `locale-switcher.tsx`、`locale-actions.ts`。

## 功能修改入口

下表后端路径相对 `backend/app/`，前端路径相对 `frontend/`；组件简称可在 `components/` 下定位。

| 功能 | 后端入口 | 前端入口 |
| --- | --- | --- |
| 文章封面 | `api/v1/endpoints/admin/posts.py`、`services/uploads.py` | `post-cover-editor.tsx`、`pending-upload-cleanup.ts` |
| 友链 LOGO 与简介 | `api/v1/endpoints/admin/links.py`、`models/friend_link.py` | `friend-link-logo-editor.tsx`、`app/[locale]/links/page.tsx` |
| 标签 | `services/posts.py`：`sync_tags` | `app/[locale]/tags/[slug]/page.tsx`、`decodeRouteParam` |
| 上传清理 | `services/upload_cleanup.py`、`cli.py` | `lib/pending-upload-cleanup.ts` |
| 代码块语言 | — | `lib/prose-code-blocks.ts`，读取 `data-code-language` |
| 文章目录 | — | `lib/article-headings.ts`：`prepareArticleContent`、`article-toc.tsx` |
| 备案号 | `services/site_settings.py`：`site_icp_number` | `site-footer.tsx`、`public/beian-ghs.png` |
| 评论 | — | `giscus.tsx` |
| 编辑底栏 | — | `post-editor-form.tsx`、`.admin-editor-actions` |
| 登录防护 | `services/login_guard.py`、`services/auth_settings.py` | `admin-login-screen.tsx`、`admin-turnstile.tsx` |
| 审计日志 | `services/audit_logs.py`、`api/v1/endpoints/admin/logs.py` | `admin-pagination.tsx`、`lib/api.ts`；菜单存在不代表列表页已实现 |

### 上传与清理

封面和友链 LOGO 的清理分三层：

1. 取消、关闭弹窗或离开编辑页时，前端删除未保存上传。
2. 保存替换或移除图片时，后端按具体接口逻辑清理旧 managed 文件。
3. 浏览器关闭或崩溃留下的孤儿文件，由 CLI 定时清理。

```bash
# backend/
uv run python -m app.cli cleanup-uploads --max-age 3600 --dry-run
```

仅扫描 `uploads/covers/`、`uploads/link-logos/`，分别核对 `posts.cover_url`、`friend_links.logo_url`；不扩展为全盘清理。默认 TTL 为 3600 秒，实际清理时间还受定时周期影响。编辑器“移除”只改变表单，不代表已保存到数据库。

图片展示使用 `resolvePublicAssetUrl`；中文标签 slug 需编码和解码。相关测试：`test_post_cover.py`、`test_post_tags.py`、`test_upload_cleanup.py`。设计见 [上传清理说明](docs/superpowers/specs/2026-07-05-upload-orphan-cleanup-design.md)。

### Giscus

`giscus.app/client.js` 会清空 `.giscus` 子节点后插入 iframe。宽度对齐使用插入后的包装层和 `[data-site-shell] .giscus > div`；iframe 内部样式需自定义主题 CSS URL，父页 `.gsc-*` 选择器不会生效。

### Turnstile

配置后端 `TURNSTILE_*` 与前端 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`，再在后台登录方式设置中启用。防护启用时，密码失败达到阈值后要求验证，找回密码始终要求验证。前端通过 `GET /api/v1/auth/login-guard?username=` 决定是否展示验证码。

### AI 助手

- 网关：`backend/app/services/ai/gateway.py`；接口：`POST /api/v1/admin/ai/complete`。
- SSE 事件：`delta`、`thinking`、`done`、`error`；支持 `skill_ids` 多 Skill。
- 前端 BFF：`frontend/app/api/v1/admin/ai/complete/route.ts`；生产请求是否经过 BFF 由 nginx 路由决定。
- 组件：`ai-composer.tsx`、`editor-ai-assistant-layout.tsx`、`ai-assistant-panel.tsx`。
- 内置 Skill：`blog-chat-zh`、`blog-polish-zh`、`blog-generate-zh`、`blog-format-zh`、`blog-excerpt-zh`。
- 默认 Skill 存于 `ai_skill_default`，修改时同步检查设置页。设计见 [AI Composer](docs/superpowers/specs/2026-07-05-ai-editor-composer-design.md)。

## 常见改动流程

| 任务 | 必查内容 |
| --- | --- |
| 新增 API 字段 | 模型、schema、服务、路由、必要迁移、前端类型与请求、对应页面及测试 |
| 新增公开页 | `app/[locale]/<route>/page.tsx`、metadata、sitemap、三种语言文案、site 样式变量 |
| 新增后台菜单 | `lib/admin-nav.ts`、`app/admin/(shell)/<page>/page.tsx`、管理接口与 Cookie 权限 |

## 配置与部署

环境变量以 [后端模板](backend/.env.example)、[前端模板](frontend/.env.example) 和配置代码为准。详细步骤见 [deployment.md](docs/deployment.md)。

- 默认目录 `/home/appuser/xblog`，服务用户和用户组 `appuser`。
- 生产依赖使用 `uv sync --frozen --no-dev`；迁移使用 `uv run --frozen --no-dev alembic upgrade head`。
- API 常驻进程使用 `uv run --no-sync uvicorn`，前端构建后使用 `/usr/local/bin/pnpm start`，由 systemd 管理。
- nginx 将 `/` 转发至 10241，`/api/` 转发至 10242；ISR 回调使用 `http://127.0.0.1:10241/api/revalidate`。
- 生产启用 HTTPS、`COOKIE_SECURE=true`，使用强随机 `SECRET_KEY`；前后端 `REVALIDATE_SECRET` 保持一致。
- AI 加密配置需随数据库备份保留；更换密钥前确认旧 Key 的恢复方案。
- 按需配置 OAuth、SMTP、Giscus、Turnstile。短信 aliyun 分支目前仅记录日志，不视为生产发送能力。
- 配置上传清理 cron，并验证数据库、上传文件和配置的配套备份恢复。

模板见 [systemd 部署](deploy/systemd/README.md)。不要把模板存在视为服务已部署。

## Git 规范

- 未经用户明确要求，不执行 `git commit` 或 `git push`。
- 用户明确调用 `git-commit` Skill 时，提交当前任务相关改动后推送当前分支。
- 只提交任务相关改动，不混入用户的其他修改。
- 分支按类型命名：`feat/`、`fix/`、`docs/`、`refactor/`、`chore/`、`test/`、`ci/`、`build/`。
- Commit 使用 Conventional Commits，描述用简体中文，例如 `fix(frontend): 修复评论区宽度`。
- PR 从 `main` 分支开始，完成本地检查后使用 [PR 模板](.github/PULL_REQUEST_TEMPLATE.md)，按项目流程 Squash merge。

数据库字段变更需新增迁移：`make revision MSG="描述"`，检查生成内容后再按授权执行 `make migrate`。完整协作流程见 [贡献指南](CONTRIBUTING.md) 和 [Git 工作流](docs/git-workflow.md)。

# AGENTS.md

xblog 编码助手与贡献者协作规范。

[项目说明](README.md) · [PRD](docs/prd.md) · [技术栈](docs/tech-stack.md) · [部署](docs/deployment.md) · [贡献指南](CONTRIBUTING.md)

## 项目结构

| 目录 | 职责 |
| --- | --- |
| apps/web | Next.js 公开站、RSC/ISR、next-intl、SEO、RSS/sitemap |
| apps/admin | React + Vite + Ant Design 管理端，生产静态 SPA |
| apps/api | FastAPI、PostgreSQL、异步 SQLModel、认证和 AI 网关 |
| packages/contracts | 双端共享 DTO，不引入 UI/框架依赖 |
| deploy | nginx、systemd 示例 |
| docs | 需求、接口、数据库、部署、任务与设计记录 |

前端使用根 pnpm workspace 和统一锁文件；Python 依赖与 uv.lock 在 apps/api。版本以清单与锁文件为准，运行时为 Node 26.13.0 LTS、pnpm 12.16.1、Python 3.14 系列。

## 工作约束

- 编码前阅读相关需求和实际源码，明确改动属于公开站、管理端、API、迁移还是部署。
- 只做任务所需变更，不顺手重构，不引入推测性抽象。
- 开发和生产使用 PostgreSQL；内存 SQLite 测试不能替代 PostgreSQL 验收。
- 新增数据库字段必须提供 Alembic 迁移，保留迁移历史。
- 公开站保留现有 Tailwind/shadcn 风格；管理端使用 Ant Design，业务图标统一 lucide-react。
- web 优先 Server Component；admin 使用客户端懒加载路由和 SWR。重型编辑器、Markdown、Mermaid 按需加载。
- 不让 web 引入 admin 源码、Ant Design 或后台样式；共享包不承载页面与框架逻辑。
- 不提交实际 .env、密钥、用户数据、上传文件及构建缓存；上传目录只跟踪 .gitkeep。
- 用户未要求时不新增 Markdown 文档。测试和构建是否通过以实际结果为准。

## 开发与检查

从仓库根目录安装前端依赖并分别启动：

```bash
pnpm install --frozen-lockfile
pnpm dev:web
pnpm dev:admin
pnpm dev:api
```

API 首次配置、数据库迁移和管理员初始化见 [apps/api/README.md](apps/api/README.md)。三应用分别为 10241、10243、10242；联调使用 [dev.conf](deploy/nginx/dev.conf) 的统一入口 10240，浏览器跨端导航和 OAuth 均通过该入口。

前端统一检查：

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

Biome 负责格式、lint 与导入，TypeScript 独立检查类型。不要为通过检查全局关闭规则；确需例外时在具体位置说明原因。后端在 apps/api 执行 `make check`，包含 Ruff、mypy、pytest；测试必须隔离数据库、上传目录和环境配置。

## API 与数据

路由入口：[router.py](apps/api/app/api/v1/router.py)。契约见 [api.md](docs/api.md)，表结构见 [database.md](docs/database.md)。

| 前缀 | 认证 | 用途 |
| --- | --- | --- |
| /api/v1/public/* | 无 | 公开文章、搜索、友链、主题、访问上报 |
| /api/v1/auth/* | 按接口要求 | 登录、Cookie 会话、OAuth、短信、资料 |
| /api/v1/admin/* | 管理员 Cookie | 内容、用户、配置、AI |

内容管理写操作放 admin；现有匿名 pageviews 上报不授权新增公开内容写入。JWT 保持 HttpOnly Cookie，不迁到浏览器 localStorage。生产同域 nginx 转发 API；管理端 AI SSE 直接调用后端，不再依赖 Next BFF。

## 语言与主题隔离

- web：URL locale + next-intl，SITE_LOCALE 记录公开语言。
- admin：React Router basename=/admin，use-intl + Ant ConfigProvider，ADMIN_LOCALE 记录后台语言。
- 两端入口使用普通跨应用链接；公开站去 /admin/，后台返回 /。禁止将当前后台语言注入公开 URL，反之亦然。
- 旧 /{locale}/admin/* 仅去掉前缀重定向，不修改 Cookie。
- 公开主题由 site_settings 与 API 决定，作用于 data-site-shell；后台沿用 xblog-admin-theme-v2 的 7 款配色和明暗模式，Ant token 与公开样式独立。

## 内容缓存刷新

保存公开内容时先 commit，再通知 web 的 `/api/revalidate`。失败事务不得触发刷新；回调失败须可从日志定位，不应误称内容未保存。

- 固定页、友链刷新对应路径；回调覆盖默认路径和 zh-CN/zh-TW/en。
- 已发布文章变更影响列表、标签、旧 slug 和邻接文章，使用布局失效覆盖。
- 主题 tag 使用 `revalidateTag(tag, { expire: 0 })`，下一次请求不继续使用旧主题。
- 已打开页面仍需刷新；缓存失效不等于向浏览器主动推送。
- 开发主题读取不缓存，生产需配置双端一致的 REVALIDATE_SECRET。REVALIDATE_URL 直连 `http://127.0.0.1:10241/api/revalidate`。

实现入口：[回调](apps/web/app/api/revalidate/route.ts)、[后端通知](apps/api/app/services/revalidate.py)、[公开主题缓存](apps/web/lib/site-theme.ts)。

## 功能修改入口

| 功能 | 后端 | 管理端 / 公开站 |
| --- | --- | --- |
| 文章、标签、封面 | apps/api/app/api/v1/endpoints/admin/posts.py、services/posts.py | apps/admin/src/components/admin/post-editor-form.tsx |
| 固定页 | apps/api/app/api/v1/endpoints/admin/pages.py | admin 的 static-page-editor；web 的 about/projects |
| 友链 | apps/api/app/api/v1/endpoints/admin/links.py | admin 友链页及 friend-link-logo-editor |
| 登录防护 | apps/api/app/services/login_guard.py | admin-login-screen、admin-turnstile |
| 审计日志 | apps/api/app/services/audit_logs.py | apps/admin/src/app/admin/(shell)/logs |
| AI 写作 | apps/api/app/services/ai/gateway.py | ai-composer、ai-assistant-panel、ai-selection-toolbar |
| 代码块、目录、图表 | 后端渲染 Markdown | web/lib/prose-code-blocks、article-headings、mermaid-diagram |

自定义 Skill 元数据在数据库，正文在上传目录；内置 Skill 随仓库分发。内置虚拟 ID 不得写入引用 ai_skill 的数据库外键。SSE 保留 delta/thinking/done/error 和多 Skill 逻辑，不在浏览器持有模型 Key。

## 上传与字体

未保存封面/友链 LOGO 在取消、关闭或离页时即时清理；保存替换时清理旧 managed 文件；崩溃遗留由 CLI 兜底。只扫描 covers、link-logos，并核对数据库引用：

```bash
uv run --directory apps/api python -m app.cli cleanup-uploads --max-age 3600 --dry-run
```

不要扩展为全上传目录删除。目录迁移时核对实际 UPLOAD_DIR 和 Skill 路径，数据库与磁盘操作不构成原子事务。

字体本地分发并保留 OFL 许可证，公开站使用 next/font/local；不要恢复构建时 Google Fonts 下载。Giscus iframe 内部样式需自定义主题 URL，父页 .gsc-* 选择器无效。

## 部署约定

- 仓库默认 `/home/appuser/xblog`；服务用户和组 appuser。
- API unit 工作目录 apps/api，使用 `/home/appuser/.local/bin/uv run --no-sync uvicorn`，监听 127.0.0.1:10242。
- web unit 工作目录 apps/web，使用 `/usr/local/bin/pnpm start`，端口 10241，不添加 -H。
- admin 构建到 apps/admin/dist，由 nginx 托管 /admin/；SPA 页面深链接回退，静态资源缺失返回 404，不运行 Vite preview 作为生产服务。
- 只公开 80/443；10241/10242/10243 不对公网开放。启用 HTTPS 和 COOKIE_SECURE=true。
- .env、上传文件、数据库与 AI 加密密钥共同备份；环境示例不能当生产配置。
- Turnstile 在 Cloudflare 控制台配置，再设置 API Key 与后台开关；管理端可选 VITE_TURNSTILE_SITE_KEY。短信 aliyun 目前只记录日志，不视为真实发送能力。

完整操作见 [deployment.md](docs/deployment.md)。不因配置文件存在就声称已部署。

## Git 规范

- 未经用户明确要求，不执行 git commit 或 git push。
- 用户明确调用 `git-commit` Skill 时，提交当前任务相关改动后推送当前分支。
- 只提交任务相关变更，保留用户其他未提交修改。
- 分支使用 feat/、fix/、docs/、refactor/、chore/、test/、ci/、build/。
- Commit 使用 Conventional Commits，描述用简体中文。
- PR 使用 [模板](.github/PULL_REQUEST_TEMPLATE.md)，按 [Git 工作流](docs/git-workflow.md) 完成本地检查和 Squash merge。

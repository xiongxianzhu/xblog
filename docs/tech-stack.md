# xblog 技术栈

本文记录当前工作区的技术用途、声明约束与锁定版本，不代表服务器已安装版本。更新日期：2026-10-31。部署操作见 [部署文档](deployment.md)，接口契约见 [API 文档](api.md)，需求见 [PRD](prd.md)。

## 1. 运行环境与版本依据

| 技术 | 版本或约束 | 项目用途 | 依据 |
| --- | --- | --- | --- |
| Python | 声明 >=3.14 | 后端与运维 CLI | [pyproject.toml](../backend/pyproject.toml) |
| Node.js | Next.js 锁定包要求 >=20.9.0；项目未固定 Node 版本 | 前端构建与 next start | [pnpm-lock.yaml](../frontend/pnpm-lock.yaml) 中 next 的 engines |
| uv | 未锁定工具版本 | 管理 Python 虚拟环境与 frozen 安装 | [Makefile](../backend/Makefile)、[uv.lock](../backend/uv.lock) |
| pnpm | 项目约定 >=9；锁文件格式 9.0，未设 packageManager 精确版本 | 前端依赖安装与命令入口 | [AGENTS.md](../AGENTS.md)、[package.json](../frontend/package.json) |
| PostgreSQL | 未锁定主版本 | 开发和生产关系数据库 | [数据库会话](../backend/app/db/session.py)、[环境模板](../backend/.env.example) |

下面的“锁定”均指仓库锁文件解析结果。未运行版本升级，也未根据系统当前安装版本推导最低要求。

## 2. 后端

版本来源统一为 [pyproject.toml](../backend/pyproject.toml) 与 [uv.lock](../backend/uv.lock)。

| 技术 | 声明范围；锁定版本 | 项目用途 |
| --- | --- | --- |
| FastAPI | >=0.138.1,<1.0.0；0.139.0 | /api/v1 路由、依赖注入、参数校验与 OpenAPI |
| Uvicorn | >=0.49.0；0.50.0 | ASGI 服务；生产 systemd 模板使用 4 worker |
| SQLModel | >=0.0.39,<1.0.0；0.0.39 | 数据模型、查询和异步会话 |
| SQLAlchemy | 传递依赖；2.0.51 | 异步 engine 与事务 |
| asyncpg | >=0.31.0；0.31.0 | PostgreSQL 异步驱动 |
| Alembic | >=1.18.5；1.18.5 | 数据库迁移，当前 revision 链到 `014_post_pinned` |
| Pydantic | 传递依赖；2.13.4 | 请求、响应模型校验 |
| pydantic-settings | >=2.14.2；2.14.2 | 环境变量和 .env 类型化配置 |
| PyJWT / bcrypt | >=2.9 / >=4.0；2.13.0 / 5.0.0 | JWT 会话与密码哈希 |
| cryptography | >=44.0；49.0.0 | Fernet 加密模型 API Key |
| Markdown / Pygments | >=3.7 / >=2.18；3.10.2 / 2.20.0 | 将文章 Markdown 渲染为 HTML 并高亮代码 |
| HTTPX | >=0.28；0.28.1 | ISR 回调、OAuth、模型 API 等出站请求 |
| PyYAML | >=6.0；6.0.3 | 解析 Skill frontmatter |

关键实现边界：

- 数据库使用 `create_async_engine`、SQLModel `AsyncSession`；请求依赖在成功时提交、失败时回滚。PRD 技术速查中的“同步 ORM”与当前代码不一致，这里以 [实际会话实现](../backend/app/db/session.py) 为准。
- 普通 JSON 经 [响应中间件](../backend/app/core/response.py) 包装成 `code/msg/data`；SSE、OAuth 重定向和静态上传文件不套成功 JSON 外壳。声明 204 的接口转换为 HTTP 200。
- 认证使用 HttpOnly Cookie 中的 access/refresh JWT；当前用户依赖同时检查账号启用状态。当前没有独立 RBAC 角色层。
- [搜索实现](../backend/app/api/v1/endpoints/public/search.py) 使用 ILIKE 与标签关联查询，不是 PRD 原计划中的 PostgreSQL 全文检索。
- [AI 网关](../backend/app/services/ai/gateway.py) 通过 SSE 输出 delta、thinking、done，路由把流内 HTTPException 转为 error；模型 Key 不随查询接口返回。限流为进程内状态，不是全局计数器。

## 3. 前端

版本来源统一为 [package.json](../frontend/package.json) 与 [pnpm-lock.yaml](../frontend/pnpm-lock.yaml)。

| 技术 | 声明范围；锁定版本 | 项目用途 |
| --- | --- | --- |
| Next.js | 精确 16.2.10；16.2.10 | App Router、Server Components、ISR、Route Handler |
| React / React DOM | 精确 19.2.4；19.2.4 | 页面渲染和后台交互 |
| TypeScript | ^5.7；5.7.2 | 前端类型检查，属于开发依赖 |
| Tailwind CSS / PostCSS 插件 | ^4；4.3.2 | 主题变量、样式编译 |
| shadcn/ui / Radix UI | shadcn 为仓库组件源码，无统一运行包版本；Radix 分包锁定 | Dialog、Select、Tabs 等 UI 组件；配置采用 new-york、RSC、CSS variables |
| next-intl | ^4.13.1；4.13.1 | zh-CN、zh-TW、en 文案和 locale 路由 |
| SWR | ^2.4.2；2.4.2 | 后台客户端数据请求与缓存 |
| react-markdown | ^10.1.0；10.1.0 | 客户端 Markdown 渲染 |
| remark-gfm / rehype-raw | ^4.0.1 / ^7.0.0；4.0.1 / 7.0.0 | GFM 扩展和原始 HTML 处理 |
| Mermaid | ^11.16.0；11.16.0 | Markdown 图表渲染 |
| Lucide React | ^1.23.0；1.23.0 | 界面图标 |
| Sonner | ^2.0.7；2.0.7 | 操作提示 |

源码约定见 [components.json](../frontend/components.json) 和 [前端说明](../frontend/README.md)：

- 公开站位于 `app/[locale]/`，服务端渲染并使用 ISR；后台 `/admin/*` 无 locale 前缀，依赖 Client Components 和 SWR。`NEXT_LOCALE` cookie 决定后台语言。
- [next.config.ts](../frontend/next.config.ts) 将 `/api/*` rewrite 到后端；同时存在 Next.js 的 ISR 回调和 AI BFF。最终入口行为还取决于 nginx，不能仅凭 rewrite 判断生产请求流向。
- 公开主题由数据库配置并在 `[data-site-shell]` 下生效；后台偏好存 localStorage 的 `xblog-admin-theme-v2`，仅作用于 `[data-admin-shell]`。两者支持 7 款配色且互不覆盖。
- [站点主题缓存](../frontend/lib/site-theme.ts) 开发环境不缓存，生产使用 `site-theme` tag、3600 秒有效期；保存后由后端通知 [回调处理器](../frontend/app/api/revalidate/route.ts) 执行失效。
- `NEXT_PUBLIC_*` 配置用于浏览器与构建产物；修改后应重新构建。配置不包含可公开的后端密钥。

## 4. 数据、基础设施与可选服务

| 技术 / 机制 | 版本依据 | 用途与启用条件 |
| --- | --- | --- |
| PostgreSQL | 项目只限定数据库类型，未锁主版本 | 文章、标签、用户、站点设置、模型配置、审计与访问统计 |
| 本地文件系统 | 非软件依赖版本 | UPLOAD_DIR 保存头像、站点 LOGO、封面、友链 LOGO、自定义 Skill；与数据库共同备份 |
| nginx | 仓库无版本锁定 | 同域反代、上传限制与 SSE 转发；模板 HTTPS 需自行配置 |
| systemd | 依赖 Linux 宿主环境，未锁版本 | xblog-api、xblog-web 的进程启动、重启与日志 |
| TLS / Let's Encrypt | 仓库提供配置示例，非已部署证明 | 生产 HTTPS 和 Secure Cookie；证书签发与续期由运维配置 |
| Giscus | 浏览器动态脚本，未在包锁文件固定版本 | 基于 GitHub Discussions 的可选评论；依赖 NEXT_PUBLIC_GISCUS_* |
| Cloudflare Turnstile | 外部服务，仓库未锁版本 | 可选登录防护；需双端 Key 和后台开关 |
| GitHub / 微信 OAuth | 外部服务，仓库未锁版本 | 可选账号授权登录与绑定；需应用凭据和回调设置 |
| SMTP | 标准邮件服务；实际提供商未固定 | 密码重置邮件；由后端环境变量配置 |
| OpenAI 兼容模型 API | 模型与 URL 由用户配置，未锁定 | AI 写作；provider_type 支持 openai、deepseek、zhipu、minimax、openai_compatible |
| cron | 宿主系统工具，未锁版本 | 定时运行 cleanup-uploads；仅清理过期且未引用的封面和友链 LOGO |

当前没有把 Redis、消息队列、对象存储或容器编排作为运行前提。短信模块虽然有 `aliyun` 配置入口，但 [发送实现](../backend/app/services/sms_service.py) 仍只记录日志，不能列为已接通的生产服务。

## 5. 开发与质量工具

| 工具 | 声明范围；锁定版本 | 检查入口 |
| --- | --- | --- |
| Ruff | >=0.6；0.15.20 | backend：uv run ruff check . |
| mypy | >=1.11；2.1.0 | backend：uv run mypy；启用 Pydantic 插件 |
| pytest | >=8.0；9.1.1 | backend：uv run pytest |
| ESLint | ^9；9.39.4 | frontend：pnpm lint |
| eslint-config-next | 16.2.10；16.2.10 | 与 Next.js 精确版本同步 |
| Next.js 构建 | 16.2.10 | frontend：pnpm build |
| aiosqlite | >=0.20；0.22.1，仅开发组 | 当前测试夹具的内存数据库 |

后端完整质量入口是 `make check`；不使用 make 时按表逐项执行。前端入口是 `pnpm lint`、`pnpm build`。命令存在不代表本次或 CI 已通过。

项目约定开发和生产只使用 PostgreSQL，但 [当前测试夹具](../backend/tests/conftest.py) 确实使用 SQLite 内存库。它仅是测试实现现状，不能作为部署替代，也不能证明 PostgreSQL 的迁移、约束或查询行为已验证。

## 6. 维护约束

- 依赖变更同时维护清单和锁文件；生产使用 `uv sync --frozen --no-dev`、`pnpm install --frozen-lockfile`。不要把声明下限写成实际安装版本。
- 数据库字段变更必须提供 Alembic 迁移，并核对旧应用与新结构的兼容性；当前迁移来源见 [versions](../backend/alembic/versions/)。
- 修改 Markdown 或 HTML 渲染链路时，同时检查公开页、编辑预览和 AI 输出；`rehype-raw` 是 HTML 解析能力，不能据此宣称输入已消毒。
- 更换 AI 加密配置前保留原密钥并规划旧 Key 的迁移；只备份数据库不足以恢复加密配置与上传文件。
- 升级框架或部署运行时前，重新核对锁文件约束、构建、认证 Cookie、ISR、SSE 与上传行为；本文不宣称所列版本是外部产品的最新版本。

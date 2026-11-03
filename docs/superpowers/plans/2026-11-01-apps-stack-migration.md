# xblog apps 技术栈迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 将已批准的三应用架构落为可构建、可验证的项目，保留现有博客与管理业务。

**Architecture:** apps/web 保留 Next.js 公开站及 ISR；apps/admin 使用 Vite、React Router、Ant Design；apps/api 保留 FastAPI 与 PostgreSQL。共享业务 DTO 不依赖 UI 框架，两个前端各自管理样式和语言。

**Tech Stack:** 目标版本及验收边界以 [已批准设计](../specs/2026-11-01-apps-stack-migration-design.md) 为准。

用户于 2026-11-01 明确要求执行。执行分支 refactor/apps-stack-migration；未经单独要求不 commit/push。现有 README、部署说明、浮层和 Popover 未提交变更已保存差异快照，迁移时保留实际内容。

## Task 1：依赖兼容门禁

- [x] 保存 Git 差异、当前状态和版本快照；建立迁移分支。
- [x] 在临时项目安装设计指定稳定版本，不修改仓库 manifest。
- [x] 最小 Next 页面使用本地字体/next-intl、最小 Vite 页面使用 Ant Design/use-intl；分别执行 build 与 TypeScript 检查。
- [x] 检查 TS7 是否支持现有脚本使用的 transpileModule；若不支持，测试加载改为 esbuild。
- [x] 只有兼容验证成功后进行目录迁移；任何版本冲突记录具体错误，不跳过类型/peer 检查。

## Task 2：工作区与目录

Files：根 package.json、pnpm-workspace.yaml、pnpm-lock.yaml、.npmrc、biome.json；apps/web；apps/api；packages/contracts。

- [x] 把 backend 业务文件、迁移、配置与测试移到 apps/api，把 frontend 移到 apps/web。保留实际 .env、uploads 和所有未提交修改；旧生成目录不作为源码迁移依据。
- [x] 根 packageManager 固定 pnpm@12.16.1；workspace 包括 apps/web、apps/admin、packages/*。
- [x] web 包名 @xblog/web，admin 包名 @xblog/admin，contracts 包名 @xblog/contracts。
- [x] 根脚本 build/typecheck 使用 pnpm -r --if-present，check 使用 biome check；API 用 uv sync --project apps/api。
- [x] 重建依赖与锁文件，核对实际 .env 内容未被覆盖，uploads 引用不因工作目录变化丢失。

## Task 3：管理端应用边界

Files：apps/admin/package.json、index.html、vite.config.ts、tsconfig.json、src/main.tsx、src/app.tsx、src/providers.tsx、src/lib/api.ts、src/lib/navigation.tsx、src/i18n/。

- [x] Vite base=/admin/、开发端口 10243，React Router basename=/admin。
- [x] 建立 lazy 路由表，覆盖登录、重置密码、仪表盘、文章列表/新建/编辑、关于/作品集、友链、用户、资料、密码、设置、AI 模型/Skill、两类日志及旧设置重定向。
- [x] API 使用同源 /api/v1 与 credentials:include，保留 envelope、refresh 重试和 SSE 流解析，不使用浏览器 token 存储。
- [x] use-intl 复用三语言消息；ADMIN_LOCALE 只影响 admin，返回站点使用原生同源根链接。
- [x] ConfigProvider + App 统一主题、提示和弹窗上下文，保留 7 款主题与 xblog-admin-theme-v2。
- [x] 用 mock API 浏览器检查登录跳转、无会话拦截、各深链接和三语言往返，不请求真实第三方。

## Task 4：Ant Design 管理界面

Files：apps/admin/src/pages/、src/components/、src/styles.css。

- [x] 用 Ant Layout/Menu/Drawer 建壳层，用 Form/Input/Select/Button/Table/Pagination/Modal/Upload 等替换管理端 shadcn/Radix；业务图标使用 Lucide。
- [x] 保留文章/固定页编辑、标签、封面、友链、用户、资料、登录防护、公开主题设置及日志字段与分页。
- [x] 保留 Markdown 编辑器、预览、目录/代码块、上传取消/离开清理与图片服务 URL。
- [x] 迁移 AI 提供商、Skill、选区操作、聊天/思考、全文生成和确认覆盖；选项浮层使用不裁剪的弹层容器。
- [x] 验证没有 Next.js 专属 import、Server Actions、react-icons 或业务 @ant-design/icons；没有 admin 对 apps/web 的源文件导入。

## Task 5：公开站与工具链

Files：apps/web/app、components、lib、proxy.ts、scripts；根 Biome 与共享 DTO。

- [x] 保留 RSC、ISR、RSS、sitemap、SEO、公开国际化及本地字体。移除后台路由和仅后台使用的组件/依赖。
- [x] 公开链接直接去 /admin/，旧 locale/admin 路径只去语言前缀；独立测试两端 Cookie。
- [x] Biome 检查只覆盖实际源码/配置，排除生成物与第三方许可证；修复实际问题，不靠全局禁用规则抹平错误。
- [x] 保留 tsc 独立检查；现有脚本测试适配新目录与编译工具。
- [x] 执行 pnpm check、pnpm typecheck、pnpm build，以及缓存、语言与字体回归。

## Task 6：后端升级与测试

Files：apps/api/pyproject.toml、uv.lock、app/、tests/。

- [x] 在设计的兼容范围升级当前依赖，保留 API 路径与 schema，SQLAlchemy 由 uv 解析。
- [x] TestClient 与 HTTP 客户端变化只改必要适配；保留密码、JWT、加密 Key、上传和数据库提交后刷新逻辑。
- [x] 执行 Ruff、mypy、隔离 pytest 和已有 unittest。测试数据库与上传目录必须隔离，不读取或改写生产数据。
- [x] PostgreSQL 迁移验收无环境时明确列为未验证，不以 SQLite 测试结果替代。

## Task 7：部署与收尾

Files：deploy/nginx/xblog.conf、deploy/nginx/dev.conf、deploy/systemd/*.service、docs/deployment.md、AGENTS.md、README.md、docs/tech-stack.md、docs/tasks.md、llms.txt。

- [x] API/web unit 使用 apps 新路径；admin 为静态 dist，nginx /admin/ SPA 回退与静态资产 404 分开。
- [x] 开发入口 10240 按 /admin、/api、其余路由转发到 10243、10242、10241，保留 HMR Upgrade。
- [x] 更新 cron、环境示例、上传存储迁移说明和全部当前路径引用；旧历史设计不伪装成已实施。
- [x] 两端生产构建通过后浏览器检查桌面/窄屏、主题、语言、日志深链、AI 浮层、内容保存与返回；记录实际结果和环境限制。
- [x] 审查最终 diff，确认无真实 .env、uploads、缓存、node_modules、.next、dist；不执行线上发布或自动提交。

## 完成记录（2026-11-01）

代码迁移与本地验证已完成，未提交、未推送、未操作线上服务。此前 README、部署说明和 Skill 浮层修改的内容已保留并合并到对应新目录；旧生成环境留在原目录或 .migration-cache，不属于新应用源码，也不纳入 Git。

- 目标 Node 26.13.0、pnpm 12.16.1；冻结安装通过。
- 根 Biome check 通过（0 errors，23 条既有样式 !important/特异性等 warnings，未全局禁用规则）。
- 两端 TypeScript 检查、Next.js/Vite 生产构建通过；Mermaid/ELK 按需加载 chunk 有体积警告，未抬高阈值隐藏。
- 公开站缓存失效、语言隔离、订阅分页/请求超时脚本通过；后台导航 basename 与偏好 Cookie 测试通过。
- 后台 31 项 mock 浏览器断言通过，另验证长页侧栏可见/折叠、小屏抽屉及本地可变字重。
- 真实 nginx 隔离测试通过：管理深链接、静态资源404及类型、API/公开站分流、旧locale后台重定向；真实Next+静态admin同域往返保持双端Cookie。
- API Ruff通过，mypy113源文件通过；最终 pytest78 passed、9 subtests passed。一次默认pytest临时目录遇Windows权限冲突，换独立basetemp/cache后通过。
- 独立PostgreSQL18.4从空库迁移到014，通过认证、提交后可见性、CASCADE/SET NULL和AI日志；临时实例已停止。
- 修复已复现的内置Skill用量外键：内置Skill日志写NULL，自定义Skill保持真实UUID，SSE标识不变，无schema变化。

未执行项属于发布环境验收：真实域名证书、现网.env/上传文件迁移、真实OAuth/SMTP/Turnstile/模型、生产数据库已有数据升级及恢复演练。请按deployment.md在发布窗口执行，不能把本地mock/空库验证视作上线完成。

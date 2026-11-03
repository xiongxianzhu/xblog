# xblog apps 目录与技术栈迁移方案

日期：2026-11-01。状态：用户已批准执行，本地代码迁移与验证已完成，未发布生产。用户已选择后台独立为 React + Vite + Ant Design，公开站保留 Next.js。

## 1. 目标与边界

- 前台 `apps/web`：Next.js、React、TypeScript，保留公开站设计、SSR、SEO、ISR、RSS、sitemap、三语言与本地字体。
- 后台 `apps/admin`：React + Vite + Ant Design，保留全部现有管理能力，语言和主题偏好与前台独立。
- API `apps/api`：保留 FastAPI、PostgreSQL、SQLModel 异步访问和 Alembic 迁移历史。
- 两个前端采用同一稳定版 React/React DOM、TypeScript 和 Lucide；Biome 管理格式、lint 和导入，类型检查独立执行。
- 不复制参考平台的聊天端、知识库、Redis、向量库、任务队列或模型编排。此次不新增业务功能，不重置数据，不把迁移本身当作生产发布。

参考附件只提供选型思路，其中的版本和“已完成”状态不属于 xblog。当前源码仍在 `frontend/`、`backend/`，管理端仍使用 Next.js 与 shadcn/Radix；现状见 [技术栈](../../tech-stack.md)。

## 2. 已选择的架构

| 方案 | 收益 | 代价 | 决定 |
| --- | --- | --- | --- |
| 三应用：web/admin/api | 前台与管理端独立依赖、构建和发布；Ant Design 不进入公开站 | 后台路由、Server Actions、语言与部署需要拆分 | 用户已选择 |
| 单个 Next.js web + api | 迁移小，现有后台路由保留 | 两端仍共用构建发布，客户端依赖边界需长期维护 | 不采用 |

应用目录（已落地）：

```text
xblog/
├── apps/
│   ├── web/           # Next.js 公开站、ISR 回调、RSS、sitemap、本地字体
│   ├── admin/         # React + Vite，Ant Design，basename /admin
│   └── api/           # FastAPI、Alembic、tests、uv.lock
├── packages/
│   └── contracts/     # 必要的共享 DTO；不依赖 React、Next.js 或 Ant Design
├── package.json       # private、packageManager、工作区检查入口
├── pnpm-workspace.yaml
├── pnpm-lock.yaml     # 前端统一锁文件
├── .npmrc
├── biome.json
├── deploy/
└── docs/
```

`packages/contracts` 只承接确实由双端使用的类型，不为抽象而提前拆 UI 库。前端使用 pnpm workspace；Python 项目单独保留 `apps/api/uv.lock`。禁止 web 通过 barrel 导入 admin 的 UI；不要将整个旧 frontend 原样复制为两个应用。

## 3. 目标版本快照

以下为 2026-11-01 查询官方 npm `latest` / PyPI 稳定登记的结果，初稿未执行组合安装；现已完成，结果见实施计划。后续升级前重查，排除 alpha/beta/rc/canary/dev。明确锁定通过验证的版本，不在 manifest 中保留浮动 latest。不能通过忽略 peer 冲突或跳过类型检查来实现“追新”。

### 前端

| 包 | 目标稳定版 | 用途 / 约束 | 来源 |
| --- | --- | --- | --- |
| `typescript` | 7.0.2 | 两端独立类型检查；TS 7 编译器 API 兼容性是前置门禁 | [npm](https://registry.npmjs.org/typescript/latest) |
| `react` | 19.3.1 | 两端组件运行时 | [npm](https://registry.npmjs.org/react/latest) |
| `react-dom` | 19.3.1 | 与 React 保持相同版本 | [npm](https://registry.npmjs.org/react-dom/latest) |
| `next` | 16.4.3 | 仅 web；Node >=20.9，React peer 接受 19.x | [npm](https://registry.npmjs.org/next/latest) |
| `antd` | 6.6.8 | 仅 admin；React peer >=18 | [npm](https://registry.npmjs.org/antd/latest) |
| `@biomejs/biome` | 2.6.4 | 统一前端格式、lint、导入整理，不替代类型检查 | [npm](https://registry.npmjs.org/@biomejs%2Fbiome/latest) |
| `lucide-react` | 1.66.0 | 两端业务图标唯一来源 | [npm](https://registry.npmjs.org/lucide-react/latest) |
| `vite` | 8.3.5 | 仅 admin；Node ^20.19 或 >=22.12 | [npm](https://registry.npmjs.org/vite/latest) |
| `@vitejs/plugin-react` | 6.1.2 | 与 Vite 8 配套；可选编译器插件按需启用 | [npm](https://registry.npmjs.org/@vitejs%2Fplugin-react/latest) |
| `react-router-dom` | 7.18.5 | admin 路由与受保护入口 | [npm](https://registry.npmjs.org/react-router-dom/latest) |
| `pnpm` | 12.16.1 | 根 packageManager 固定版本 | [npm](https://registry.npmjs.org/pnpm/latest) |
| `next-intl` | 4.14.9 | 仅 web 路由国际化 | [npm](https://registry.npmjs.org/next-intl/latest) |
| `swr` | 2.5.1 | 先沿用现有数据请求与缓存，避免同时更换数据层 | [npm](https://registry.npmjs.org/swr/latest) |
| `@types/react` | 19.3.0 | 对应 React 19 类型 | [npm](https://registry.npmjs.org/@types%2Freact/latest) |
| `@types/react-dom` | 19.3.0 | 对应 React DOM 类型 | [npm](https://registry.npmjs.org/@types%2Freact-dom/latest) |
| `use-intl` | 4.14.9 | admin 的 IntlProvider/hooks；复用现有消息 JSON，脱离 Next.js server API | [npm](https://registry.npmjs.org/use-intl/latest) |

### 后端

| 包 | 目标稳定版 | 来源 |
| --- | --- | --- |
| `fastapi` | 0.162.0 | [PyPI](https://pypi.org/pypi/fastapi/json) |
| `uvicorn` | 0.54.0 | [PyPI](https://pypi.org/pypi/uvicorn/json) |
| `pydantic` | 2.14.2 | [PyPI](https://pypi.org/pypi/pydantic/json) |
| `pydantic-settings` | 2.16.2 | [PyPI](https://pypi.org/pypi/pydantic-settings/json) |
| `sqlmodel` | 0.0.48 | [PyPI](https://pypi.org/pypi/sqlmodel/json) |
| `alembic` | 1.20.1 | [PyPI](https://pypi.org/pypi/alembic/json) |
| `asyncpg` | 0.32.0 | [PyPI](https://pypi.org/pypi/asyncpg/json) |
| `ruff` | 0.17.3 | [PyPI](https://pypi.org/pypi/ruff/json) |
| `mypy` | 2.4.1 | [PyPI](https://pypi.org/pypi/mypy/json) |
| `pytest` | 9.2.0 | [PyPI](https://pypi.org/pypi/pytest/json) |
| `uv` | 0.13.6 | [PyPI](https://pypi.org/pypi/uv/json) |

Node 目标为 **26.13.0 LTS（Lithium，2026-10-28 发布）**，按 [官方发布清单](https://nodejs.org/dist/index.json) 核实，开发、CI、构建机保持一致；27.0.0-alpha 不采用。Python 先保持仓库 3.14 系列，实施时核实稳定补丁及是否需要升级解释器；暂不把前端重构与 Python 次版本迁移绑定。数据库继续 PostgreSQL，目录迁移不同时升级生产数据库主版本；如需升级，另行演练备份恢复和迁移兼容，不把 apt 默认版本视为已验证版本。

SQLModel 0.0.48 当前声明 `SQLAlchemy>=2.0.14,<2.2.0`，SQLAlchemy 当前稳定版为 **2.1.6**，在该声明范围内，列为候选并由 uv 实际解析验证；不能照搬附件旧版本的 `<2.1.0` 限制。其余现有依赖按批次重新核实，尤其 bcrypt、cryptography、JWT、Markdown、HTTPX 与 TestClient 的接口；未核实的包不写成“最新已锁定”。

### 必须先验证的兼容点

- TypeScript 5.7 → 7.0.2：复核 tsconfig 的废弃选项、模块解析、原生二进制支持和 Next.js 类型生成。现有 `scripts/test-revalidate.cjs`、`test-locale-isolation.cjs` 使用 `typescript.transpileModule`，不得假设新版本仍提供相同 JS API；迁移为构建器支持的测试加载方式或先编译后测。禁止 `ignoreBuildErrors`，若 Next 当前稳定版不能兼容 TS 7，记录阻塞并重新确认方案，不静默降级目标。
- React/React DOM 使用 19.3.1；Ant Design、Next.js、Lucide 的声明范围覆盖该版本，但这只是 metadata 核对，不是运行验证。
- Biome 替代 ESLint 的工作流，不声称规则一一等价。审计原 React Hooks、Next、可访问性规则，将缺失检查用 TypeScript、组件测试或浏览器验收补齐；门禁通过后移除 ESLint 配置及依赖。
- React Compiler 不是本次目标，不因新插件列为可选 peer 就自动引入。

## 4. 路由、认证与语言

| 对外路径 | 目标 | 迁移要求 |
| --- | --- | --- |
| `/`、`/zh-TW/*`、`/en/*` | Next.js web，10241 | 保留默认语言 as-needed 路由与 SEO |
| `/admin`、`/admin/*` | nginx 托管 admin/dist | Vite base=/admin/，Router basename=/admin；深链接回退到 admin/index.html |
| `/api/v1/*` | FastAPI，10242 | 路径、Cookie、错误封装与上传地址保持 |
| `/api/revalidate` | 内网 web:10241 | 保留受密钥保护的回调；后端提交后触发，各语言失效 |
| `/api/v1/admin/ai/complete` | FastAPI SSE | 生产直接代理，禁用缓冲；迁移后不依赖 Next BFF |

管理端开发服务器建议 10243；生产交付静态文件，不把 `vite preview` 当服务，不新增常驻 admin systemd。nginx `/admin` 精确跳转到 `/admin/`，`/admin/` 使用 SPA 回退；资产不存在应 404，不把 JS 请求错误回退成 HTML。具体 root/alias 写法留实施者结合实际发布目录验证。

开发联调使用统一入口 `http://localhost:10240`（本地 nginx）：`/admin`、`/admin/*` 转到 Vite 10243，`/api/v1/*` 转到 API 10242，其余转到 Next.js 10241。浏览器只从 10240 进入，因此 `/admin/`、返回 `/` 和 OAuth 回调都落在同一入口；Cookie 不按端口隔离，不能用切换端口代替偏好隔离。

联调后端 `FRONTEND_URL=http://localhost:10240`、开发 Cookie Secure=false；web `NEXT_PUBLIC_SITE_URL=http://localhost:10240`。`BACKEND_URL` 仍直连 10242，`REVALIDATE_URL` 仍直连 10241。联调 GitHub/微信应用回调应与 10240 地址匹配，使用开发应用配置，不覆盖生产凭据。

Vite 使用 base=/admin/，HMR 客户端指向 10240 的 `/admin/` 专用 WebSocket 路径，代理需支持 Upgrade；Next.js 的 `/_next/` 与 HMR 请求转到 web。具体 HMR 子路径由实施时确定并两端一致验证，不依赖客户端绕过统一入口访问 10243。

MIG-03～04 的统一入口暂将 `/admin` 路由到旧 web；从 MIG-05 起本地/预发布入口切到新 admin 做验收，生产直到 MIG-09 才切换。单独访问 10241/10243 仅用于组件开发，不作为跨端导航/OAuth 验收方式。生产继续同域 HTTPS，JWT 保持 HttpOnly，不迁移为 localStorage token。后台页面保护只负责交互，API 必须继续校验用户。

- `ADMIN_LOCALE` 只影响 admin，`SITE_LOCALE` 只影响 web。Vite 端不再调用 Next Server Action，改为独立偏好写入逻辑；这两个偏好 Cookie 不含认证信息。
- 公开站进入后台用普通 `/admin/` 链接；后台返回站点使用 `/`，由 SITE_LOCALE 解析；不注入当前后台语言。旧 `/{locale}/admin/*` 仅重定向，不修改任一偏好。
- 管理端 ConfigProvider 的 locale 与 use-intl 同步；日期组件也需对应语言。偏好未设置时默认 zh-CN，不继承公开站 locale。
- GitHub/微信回调仍为 `/api/v1/auth/oauth/{provider}/callback`，FRONTEND_URL 保留公网域名。回调后的 `/admin/dashboard`、`/admin/profile` 与 `/admin/reset-password` 由 SPA 处理，保留查询参数；迁移不改变凭据。

## 5. Ant Design、图标与样式边界

管理端按 ConfigProvider + App 建立主题、语言、Message/Modal/Notification 上下文。7 款后台配色及明暗模式映射到 Ant Design token，保留 `xblog-admin-theme-v2` 偏好；公开站主题仍从数据库读取，不能由后台 token 改写。

逐模块替换后台 shadcn/Radix 控件：布局/导航、表单与校验、表格分页、弹窗与提示、上传、主题设置、AI 输入与浮层。不要只安装 antd 而把现有控件保留不迁移；也不要为使用 Ant Design 重写 Markdown 业务和 SSE 协议。自定义编辑器、预览、AI Composer 保留业务逻辑，改为组件化适配。

Lucide 统一业务可见图标，替换当前 react-icons 的 GitHub/微信图标为可识别的 Lucide 图标加明确文字；不承诺 Lucide 包含所有品牌标识。Ant Design 组件允许的 icon/suffixIcon/expandIcon 等接口统一注入 Lucide；组件内部实现依赖可能包含 Ant 图标，业务代码不直接引入 @ant-design/icons，不强行篡改组件内部 DOM。

公开站继续 Tailwind + 现有组件风格，不强制改用 Ant Design；web 可保留实际使用的 shadcn/Radix。两应用各自加载样式；不要在共享入口导入 Ant reset 或后台 CSS。本地 Noto Sans SC、Noto Serif SC、Geist Mono 及 OFL 许可证保留，web 继续 next/font/local；admin 按实际字体用途引用本地资源，不重新引入构建时 Google Fonts 下载。

## 6. 数据、性能与质量

采用 vercel-react-best-practices：web 保留 RSC 优先、并行独立请求和明确的缓存边界；admin 使用客户端路由分包，重型 Markdown/Mermaid/AI 编辑器按需加载。Lucide 显式命名导入，检查产物不包含整套图标。保留 SWR，不同时迁移为 TanStack Query/Axios，参考平台的这些选择不是此次要求。

请求缓存沿用已修复的数据库提交后失效；保存、撤回、删除、改 slug、关于/作品集、友链和主题都要回归。公开页面不能因 admin 拆分丢失 ISR 回调。用户已打开的页面不承诺自动推送刷新。

前端统一命令意图：Biome check、独立 TypeScript 类型检查、单元/组件测试、双端生产 build、浏览器流程。ESLint 原有失败项先归类修复，不通过删除工具将它们当作已解决。TypeScript 编译产物、dist、.next、node_modules 和实际 .env 不提交。

## 7. 分阶段迁移清单

以下保留批准的执行顺序，实际完成与验证记录见 [实施计划](../plans/2026-11-01-apps-stack-migration.md)。各阶段单独提交、记录结果，失败停在当前阶段。

| 编号 | 阶段与依赖 | 交付 | 验收与回退边界 |
| --- | --- | --- | --- |
| MIG-01 | 基线；无依赖 | 明确当前提交、全部未提交改动归属、接口/路由/语言/主题/上传/SSE 快照 | 先处理现有 Skill 浮层、部署、README 改动，不混入迁移；保存当前可发布构建和数据备份 |
| MIG-02 | 兼容验证；依赖 01 | 在隔离分支验证目标版本安装、TS7、Next16、React19、Vite8、Ant6、Biome | 双端最小构建、tsc、SSE 客户端可行；锁定版本、原生依赖架构与 Node LTS 无冲突。失败不进行目录迁移 |
| MIG-03 | 机械移动；依赖 02 | backend → apps/api；frontend → apps/web；根 pnpm workspace 与脚本 | 此阶段旧 /admin 仍留在 web，功能与现版相同；重建 .venv/node_modules，不搬旧虚拟环境；全引用扫描 |
| MIG-04 | 工具链；依赖 03 | 应用已验证版本，根 Biome，独立 tsconfig，脚本测试适配 | 格式化与语义修复分提交；新门禁通过再移除 ESLint；锁文件由工具生成 |
| MIG-05 | admin 骨架；依赖 04 | apps/admin、Router、Ant Provider、语言/主题、同源 API 客户端、认证守卫 | 登录/退出/刷新、错误态、OAuth/SMS/Turnstile/重置密码、三语言独立通过；公网继续旧后台 |
| MIG-06 | 后台业务；依赖 05 | 仪表盘、文章/固定页、标签交互、友链、用户/资料、登录与操作日志、设置 | 与现后台逐页验收；上传取消/离页清理、日志分页、确认弹窗、窄屏与键盘可用 |
| MIG-07 | AI 与 UI 完整性；依赖 06 | 提供商/Skill 管理、默认 Skill、流式对话/思考/全文生成、选区替换、Lucide 统一 | SSE 不缓冲、不错误重试；Skill 浮层不裁剪，焦点/键盘/主题保持；响应与浏览器产物不含 Key |
| MIG-08 | 后端依赖批次升级；依赖 03，可与 UI 阶段分别开展 | 最新兼容 Python 包与 uv.lock | PostgreSQL 集成、迁移、认证、加密 Key、上传、限流及流式测试；不重置库、不丢历史 migration，不擅自改变密码哈希 |
| MIG-09 | 发布切换；依赖 06/07/08 | nginx /admin 静态路由、web/api unit 新路径、内部回调与 cron | 在预发布验收后同一发布窗口切换；旧 Next /admin 路由确认无依赖后删除，外部 URL 不变；冷启动与深链接通过 |
| MIG-10 | 收尾；依赖 09 | 更新 AGENTS、README、技术栈、部署、API、数据库、tasks 与 llms 导航 | 全链接无旧运行路径；标记实际验证的版本与日期；旧目录、废弃组件、依赖清理后双端重建 |

阶段 03 的移动不改 schema。确认上传目录：`UPLOAD_DIR=uploads` 随工作目录变化后将指向 apps/api/uploads，必须显式迁移/挂载现有文件，或使用稳定绝对目录；同时核对 ai_skill.storage_path 是否保存相对/绝对旧路径。数据库、上传文件和加密密钥必须配套，不能仅复制应用代码。

根 .npmrc 保留 npmmirror 源；npm 官方登记用于版本核验，镜像用于安装。前端只保留根统一锁文件，API 保留 uv.lock；不要混用旧 frontend 下的锁文件。gitignore 同时匹配新产物并明确放行后台 logs 路由源码，不能重演日志页面被忽略的问题。

## 8. 部署与回滚

生产根目录仍 `/home/appuser/xblog`，账号仍 appuser。web unit 工作目录改 apps/web，使用 `/usr/local/bin/pnpm --filter <web包名> start` 或在 apps/web 执行 pnpm start；API unit 工作目录改 apps/api，uv 路径保持 `/home/appuser/.local/bin/uv`。确切包名由实施阶段固定并统一说明。

前台继续 10241、API 10242；admin 10243 仅用于开发，不新开公网端口。nginx 静态管理员路径必须可读，缺失资产不能触发 SPA 回退；API 和上传路径始终优先转到 FastAPI。证书、域名、OAuth 应用及 /api/revalidate 内网目标不因目录变化重配为其他域名。

回滚保留旧应用、旧 .next、后台 dist、锁文件、unit/nginx 和原配置；若数据库无变化可切回旧应用与路由。后端升级若产生 schema 或数据变更，单独评估迁移可逆性；不得以强制降级、删除新目录或清空数据作为自动回滚。切换前停止写入并做完整备份和独立恢复演练。

## 9. 决策状态与交付边界

用户已确认：先做方案与迁移计划、三应用拆分、管理端 Ant Design、最新稳定 TypeScript/React、Biome、Lucide、公开端保留 Next.js。

本方案采用的实施建议：SWR 继续使用、admin 用 use-intl、生产静态托管、开发端口 10243、本地联调统一入口 10240、前台保留现有 UI 风格。这些建议可在设计审阅时调整。目标版本只完成登记与 peer 范围核对，尚无组合安装/运行保证。

本文可作为分阶段迁移范围和验收清单；开始实施前需确认方案并完成 MIG-02。细化到逐文件改动的实施计划应以该兼容验证结果为依据，不预先承诺全部最新版本零修改可用。初稿阶段未修改代码；用户批准后已实施本地迁移，仍未提交、推送或操作线上环境。

复核记录：独立审阅指出双端分端口开发时相对导航和 OAuth 会落错应用；已补充本地 10240 统一代理入口、环境变量、HMR 与迁移期切换规则。未遗留需要猜测的跨端访问方式。

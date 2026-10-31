# xblog 开发与验收任务

本清单依据当前工作区的 [PRD v2.10](prd.md)、源码、迁移和已有测试整理，核对日期：2026-10-31。用于区分“代码已存在”和“验收已完成”，不代表发布或生产状态。本次仅完善文档，不实施下列功能变更。

## 1. 状态与证据口径

| 状态 | 含义 |
| --- | --- |
| 已完成（静态核对） | 交付物存在，且该项验收可通过本次静态检查完成；不代表功能运行验收 |
| 已实现，待验收 | 源码具备对应路径；测试文件存在时列为证据，但本次未执行，不能标记测试通过 |
| 部分实现 | 已有部分交付，仍存在具体缺口 |
| 待处理 | 已由需求或源码差异确认的工作，尚未完成 |
| 待决定 | PRD 后续候选或需求与实现冲突，需先确定是否实施及目标行为 |
| 待环境验收 | 依赖 PostgreSQL、真实第三方配置或部署环境，仓库代码不足以证明完成 |

本次做了源码检索、14 个迁移定义的离线解析、16 表/113 字段与模型对照，以及文档格式和本地链接检查。未连接数据库，未执行迁移、后端测试、前端 lint/build、浏览器功能验收或生产操作。

PRD 内原有未勾选验收项及 M5/M6“已实现”文字保留其历史含义，不直接转换成这里的“已完成”。既有 M0–M8 编号保持不变；下面的功能、数据库、验收编号用于后续稳定追踪，不代表已有 Issue 编号。

## 2. 既有里程碑核对

| 里程碑 | 当前状态 | 依据与剩余范围 |
| --- | --- | --- |
| M0：PRD | 已完成（静态核对） | 当前 [prd.md](prd.md) 为 v2.10；旧路径引用尚需统一，见 DOC-02 |
| M1：后端 MVP | 已实现，待验收 | API、SQLModel、迁移与 CLI 存在；迁移一致性和 PostgreSQL 验收见 DB-01、QA-02 |
| M2：前端 MVP | 已实现，待验收 | 公开页、登录、后台文章编辑已存在；缺本次构建和浏览器验收记录 |
| M3：内容与发现 | 部分实现 | 固定页、友链、RSS、sitemap、访问统计已实现；搜索为 ILIKE，与全文检索需求不同 |
| M4：部署与开源 | 部分实现 | nginx/systemd、贡献规范与模板存在；VPS、HTTPS、备份恢复、SC-5～SC-9 未验证 |
| M5：AI P1 | 已实现，待验收 | 提供商、Skill、选区与 SSE 代码及测试存在；真实模型与 PostgreSQL 用量日志仍待验收 |
| M6：AI P2/P3 与增强 | 部分实现 | 对话、生成、Composer、i18n、主题、OAuth、Turnstile 已有代码；真实短信发送未完成，OAuth 解绑未发现实现 |
| M7：内容与运维增强 | 部分实现 | 上传清理、LOGO、备案号、审计 API 存在；操作审计覆盖和运行验收未完成 |
| M8：后续候选 | 待决定 / 部分待处理 | 日志列表页缺失；其余原 PRD 候选见第 6 节，不自动纳入本批开发 |

## 3. 已实现功能的验收账本

下表“验收”是后续完成条件，不是本次已执行结果。仅有测试名称不等于已经满足该条件。

### 认证与账号

| 编号 | 状态 | 交付物与证据 | 剩余验收 |
| --- | --- | --- | --- |
| AUTH-01 | 已实现，待验收 | [auth.py](../backend/app/api/v1/endpoints/auth.py)、[会话处理](../backend/app/api/auth_session.py)；test_auth_login、test_auth_logout、test_health | 用户名/邮箱/手机号登录，Cookie 刷新和退出；无效会话管理接口 401，禁用用户 403 |
| AUTH-02 | 已实现，待验收 | [用户服务](../backend/app/services/users.py)、[资料页面](../frontend/app/admin/(shell)/profile/page.tsx)；test_admin_users、test_auth_profile、test_auth_email | 修改/清空资料、邮箱冲突、出生日期限制；唯一管理员保护符合代码规则 |
| AUTH-03 | 已实现，待验收 | [密码重置服务](../backend/app/services/password_reset_service.py)、[OAuth 路由](../backend/app/api/v1/endpoints/auth_oauth.py)；test_auth_oauth | 用真实 SMTP 验证单次令牌、过期和密码重置；完成 GitHub/微信成功与失败回调，不将 mock 测试当第三方联通验收 |
| AUTH-04 | 已实现，待验收 | [login_guard.py](../backend/app/services/login_guard.py)、[Turnstile 组件](../frontend/components/admin/admin-turnstile.tsx)；test_login_guard | 开关和 Key 生效，失败阈值触发验证码、锁定及找回密码限流；真实 Turnstile 校验可用 |
| AUTH-05 | 部分实现 | [sms_service.py](../backend/app/services/sms_service.py)、test_auth_sms | 验证码存储、校验和登录有实现；dev/aliyun 均只记日志，真实发送缺口见 GAP-02 |
| AUTH-06 | 部分实现 | OAuth start/bind/callback 和 GET /oauth/links 已实现；PRD US-1 同时提到解绑 | 当前未发现解绑路由或页面操作；先按 GAP-03 确定需求再验收 |

测试名称均指 [backend/tests](../backend/tests/) 内对应 `.py` 文件。CLI [create-admin/reset-password/seed-pages](../backend/app/cli.py) 已有实现；本次未创建账号或初始化真实数据。

### 内容、公开站与主题

| 编号 | 状态 | 交付物与证据 | 剩余验收 |
| --- | --- | --- | --- |
| CONTENT-01 | 已实现，待验收 | [文章 API](../backend/app/api/v1/endpoints/admin/posts.py)、[文章服务](../backend/app/services/posts.py)、[编辑器](../frontend/components/admin/post-editor-form.tsx)；test_public_posts、test_admin_post_stats | 草稿/发布 CRUD、公开页过滤、Markdown 渲染和首次发布时间；SC-1 写作流程用时需实测 |
| CONTENT-02 | 已实现，待验收 | 标签同步、置顶及上一篇/下一篇逻辑；test_post_tags、test_post_pinned、test_post_neighbors | 标签中文 URL、重复标签处理、置顶排序和取消发布后的状态；确认真实 PostgreSQL 删除关联行为 |
| CONTENT-03 | 已实现，待验收 | [固定页 API](../backend/app/api/v1/endpoints/admin/pages.py)、[固定页编辑器](../frontend/components/admin/static-page-editor.tsx)、about/projects 页面 | CLI 初始化后编辑固定页，HTML 和公开页同步；没有任意新建固定页 API，不扩大验收范围 |
| CONTENT-04 | 已实现，待验收 | [友链 API](../backend/app/api/v1/endpoints/admin/links.py)、[友链后台](../frontend/app/admin/(shell)/links/page.tsx)、公开 links 页面 | 创建 LOGO 必填、简介、排序、公开页隐藏 URL 文本；修改/清空图片的文件清理与数据库引用一致 |
| CONTENT-05 | 已实现，待验收 | [上传服务](../backend/app/services/uploads.py)、[待保存清理](../frontend/lib/pending-upload-cleanup.ts)、[孤儿清理](../backend/app/services/upload_cleanup.py)；test_post_cover、test_upload_cleanup | 图片类型和 5 MiB 上限；取消/离页即时清理；TTL、引用保护、dry-run 和 cron 实际运行。每小时 cron 不能保证精确在 1 小时内删除 |
| SITE-01 | 已实现，待验收 | [公开路由](../frontend/app/[locale]/)、[proxy.ts](../frontend/proxy.ts)、[语言配置](../frontend/i18n/) | zh-CN/zh-TW/en 切换；locale/admin 重定向，后台 NEXT_LOCALE cookie；移动端和键盘走查 |
| SITE-02 | 已实现，待验收 | [主题服务](../backend/app/services/site_settings.py)、[主题缓存](../frontend/lib/site-theme.ts)、[主题配置](../frontend/lib/themes.ts)；test_posts_per_page | 7 款配色、品牌/LOGO/备案号、分页；公开主题与后台 localStorage 独立；生产 ISR 另见 QA-04 |
| SITE-03 | 已实现，待验收 | [搜索 API](../backend/app/api/v1/endpoints/public/search.py)、test_search | 现有 ILIKE 搜索匹配中文标题与标签、跳过草稿；不据此宣称 PostgreSQL 全文检索或 P95 指标达标 |
| SITE-04 | 已实现，待验收 | [RSS](../frontend/app/rss.xml/route.ts)、[sitemap](../frontend/app/sitemap.ts)、[文章详情](../frontend/app/[locale]/blog/[slug]/page.tsx) | 实际 HTML metadata、Open Graph、正式域名绝对 URL，以及订阅条目；核对 SC-2 |
| SITE-05 | 已实现，待验收 | [Giscus](../frontend/components/giscus.tsx)、[访问上报](../frontend/components/page-view-tracker.tsx)、[后台仪表盘](../frontend/app/admin/(shell)/dashboard/page.tsx) | 未配置评论时提示，真实 Discussions 配置后 iframe 可用；访问上报和按 path 聚合数据吻合 |

### AI 与审计

| 编号 | 状态 | 交付物与证据 | 剩余验收 |
| --- | --- | --- | --- |
| AI-01 | 已实现，待验收 | [提供商服务](../backend/app/services/ai/providers.py)、[加密模块](../backend/app/services/ai/crypto.py)、[配置 UI](../frontend/components/admin/ai-provider-settings.tsx)；test_ai_crypto、test_ai_api | CRUD、启用/默认、实际连接测试；响应不返回明文 api_key；默认与并发约束按 DB-01 复核 |
| AI-02 | 已实现，待验收 | [Skill 服务](../backend/app/services/ai/skills.py)、[包校验](../backend/app/services/ai/skills_io.py)、[内置 Skill](../backend/app/services/ai/builtin_skills.py)；test_ai_skills_validate、test_ai_api | 合法 ZIP、新建/编辑/删除、非法名称 422、内置只读、三场景默认；文件与数据库失败路径一致 |
| AI-03 | 已实现，待验收 | [网关](../backend/app/services/ai/gateway.py)、[SSE 路由](../backend/app/api/v1/endpoints/admin/ai_complete.py)、[选区工具栏](../frontend/components/admin/ai-selection-toolbar.tsx) | 润色/扩写/缩写/标题流式结果、失败提示、选区替换；内置 Skill 用量日志先处理 DB-02 |
| AI-04 | 已实现，待验收 | [助手面板](../frontend/components/admin/ai-assistant-panel.tsx)、[Composer](../frontend/components/admin/ai-composer.tsx)；test_ai_chat | 多轮对话、thinking、最多 5 个去重 Skill、模型选择；全文生成可插入或覆盖，覆盖需确认；真实模型验收见 QA-05 |
| AUDIT-01 | 已实现，待验收 | [登录审计](../backend/app/services/audit_logs.py)、[日志 API](../backend/app/api/v1/endpoints/admin/logs.py) | 密码/短信/OAuth 成功失败记录、用户删除后保留日志；分页总数与顺序；长标识问题见 DB-03 |
| AUDIT-02 | 部分实现 | record_operation 当前调用仅位于 [用户管理路由](../backend/app/api/v1/endpoints/admin/users.py) | 不能宣称已记录全部管理端关键写操作；范围与补齐见 GAP-04 |
| AUDIT-03 | 部分实现 | [菜单](../frontend/lib/admin-nav.ts) 已有两类日志入口，[API 客户端](../frontend/lib/api.ts) 和 AdminPagination 已存在 | 当前 app/admin 没有 logs/login、logs/operations 页面；按 GAP-05 补齐，不将导航存在记作页面完成 |

## 4. 已确认差异与待处理项

以下项目来自现有需求或源码差异，不表示已授权本次修改业务实现。顺序优先考虑数据一致性和已有功能闭环，不设未经确认的负责人或截止日期。

| 编号 | 状态 | 工作范围与依据 | 完成条件 / 依赖 |
| --- | --- | --- | --- |
| DB-01 | 待处理 | 对齐 [数据库文档第 6 节](database.md#6-模型与迁移差异) 的模型/迁移差异：正文类型、级联、短信时间可空、唯一性布局、日志索引与默认值 | 先确认目标结构，再修改模型/新增必要迁移；隔离 PostgreSQL 从旧版本迁移后与 metadata 对照无非预期差异，不直接改历史迁移来隐藏差异 |
| DB-02 | 待处理（静态发现，待复现） | 网关将首个内置 Skill 的派生 UUID 写入 ai_usage_log.skill_id，但该列外键指向仅保存自定义 Skill 的 ai_skill | 在迁移建成的 PostgreSQL 重现内置 Skill 成功调用后的提交路径；修正记录方式并覆盖自定义、内置、无 Skill、多 Skill；done 事件不能替代日志提交成功，依赖 QA-02 |
| DB-03 | 待处理（静态发现，待复现） | 登录输入 username 最长 255，login_log.username 最长 64；普通超长用户名或邮箱输入可能无法记录日志 | 在 PostgreSQL 验证 65–255 字符的合法输入与失败登录；确定保留/截断/扩容规则，必要时新增迁移；不能因记日志而使登录流程返回 500 |
| GAP-01 | 待决定 | PRD US-4 要求 PostgreSQL 全文检索，当前实现是 ILIKE | 确认保留现状并更新需求，或按已确认目标实现全文检索；两种选择均需按 SC-3 做 1000 篇数据下的 P95 验收 |
| GAP-02 | 待处理 | aliyun 分支尚未调用短信发送 API，见 sms_service.py | 完成真实提供商调用及错误处理，或明确保留为开发能力并修正产品承诺；生产发送回执和接收验证通过后才能标为完成 |
| GAP-03 | 待决定 | PRD US-1 提及 OAuth 解绑，但已注册接口仅含提供商查询、绑定状态、start/bind/callback | 确认是否保留解绑需求；若实施，明确授权和避免失去登录方式的规则，并提供前后端和测试；依赖 AUTH-03 |
| GAP-04 | 待处理 | US-11 的“管理端关键写操作”未完整覆盖，当前只有用户启用/禁用/删除 | 先列出应记录的关键操作，逐项接入并验证 actor/resource/IP/失败行为；不记录密码、Key 或正文；依赖 AUDIT-01 |
| GAP-05 | 待处理 | 原 M8 日志列表 UI；导航已有，但实际页面缺失 | 新增两个列表页，复用分页与 API，覆盖加载/空列表/错误/未登录状态；菜单可到达，页码与总数一致；依赖 AUDIT-01 |
| DOC-01 | 已完成（静态核对） | 本次完善 database.md 与 tasks.md；前一批 api.md、deployment.md、tech-stack.md 已落盘 | 两个目标文档完成字段覆盖、依据与链接检查；不代表前一批跨文档事实永远同步 |
| DOC-02 | 待处理 | 工作区 PRD 已改为 docs/prd.md，但 AGENTS.md、CONTRIBUTING.md、llms.txt、README.md 仍有旧路径引用 | 保留用户当前重命名结果，单独统一导航与文案并检查链接；本次不改这些文件 |
| DOC-03 | 待处理 | PRD 仍包含同步 ORM、未包装健康响应、旧模型类型清单等历史描述；当前 provider_type 已含 glm_coding、anthropic，部分技术说明仍只列 5 类 | 基于当前模型、路由和产品决策统一相关文档；不把代码新增值反向当成已通过生产验收 |

DB-02、DB-03 是明确的代码与数据库约束不匹配线索，但本次没有触发真实数据库错误，不写成已复现故障。对外 API 契约发生变更时同步维护 [api.md](api.md)。

## 5. 质量与环境验收

| 编号 | 状态 | 任务与执行范围 | 完成条件 / 依赖 |
| --- | --- | --- | --- |
| QA-01 | 待环境验收 | 后端 make check 或逐项 ruff/mypy/pytest；前端 pnpm lint、pnpm build | 记录命令、代码版本、环境和实际结果；失败记录为未完成，不能只看测试文件存在；本次未运行 |
| QA-02 | 待环境验收 | 在独立 PostgreSQL 验证迁移链及关键约束 | 从空库和待升级版本迁移到 014_post_pinned；验证 CASCADE/SET NULL、唯一性、长度、非空及应用插入默认；模型差异先按 DB-01 定案 |
| QA-03 | 待环境验收 | 执行公开站/后台浏览器流程 | 登录→草稿→封面/标签→发布→公开阅读；固定页、友链、主题、i18n、评论；记录 SC-1/SC-2 证据及设备视口 |
| QA-04 | 待环境验收 | 在生产模式核验 ISR 和内容变化 | 配置双端 REVALIDATE_SECRET、直连 Next.js 的 REVALIDATE_URL；验证发布、主题以及撤回/删除/改 slug 后页面结果，记录可见延迟；不只检查回调返回 200 |
| QA-05 | 待环境验收 | 真实模型、SMTP、OAuth、Turnstile；短信在 GAP-02 完成后验收 | 分别测试成功、失败和未配置路径；确认浏览器不暴露 Key，SSE 可增量显示，AI 日志能提交；依赖 DB-02、AUTH-03/04、AI-01～04 |
| QA-06 | 待环境验收 | SC-3 搜索性能 | 记录 PostgreSQL 版本、数据规模、查询样本、并发和 P95；1000 篇已发布文章目标 <=500ms；依赖 GAP-01 的方案确认 |
| OPS-01 | 待环境验收 | 按 [部署文档](deployment.md) 验证 VPS、HTTPS、Cookie、nginx、systemd | API 健康、数据库内容接口、公开页和受保护后台均符合预期；health 仅证明进程响应 |
| OPS-02 | 待环境验收 | 配置上传清理 cron 并验证 | dry-run 核对无误后由操作者配置；保留引用文件、删除过期孤儿，记录任务日志与实际周期；依赖 CONTENT-05 |
| OPS-03 | 待环境验收 | 数据库、上传目录和密钥配置的配套备份与恢复演练 | 在独立环境恢复并验证文章、图片、Skill、AI Key；明确备份后数据损失边界，不以 pg_restore --list 代替完整恢复 |

现有测试使用 SQLite 内存库和模型 create_all，见 [conftest.py](../backend/tests/conftest.py)；没有因此把 SQLite 列为开发/生产目标。QA-01 即使通过，也不能替代 QA-02 的 PostgreSQL 迁移与外键验收。仓库当前未发现 `.github/workflows/` 自动检查配置，不能声称 CI 门禁已运行。

## 6. 原 PRD 的后续候选

这些项目沿用 M8，未自动升级为承诺交付。与已确认的日志列表缺口不同，实施前先决定是否需要。

| 编号 | 状态 | 候选项 | 当前证据与启动条件 |
| --- | --- | --- | --- |
| M8-TYPE | 待决定 | openapi-typescript | 前端类型/API 客户端为仓库维护，package.json 未声明该工具；确认是否改为生成及更新流程 |
| M8-TAG | 待决定 | 标签独立 CRUD 页 | 现有标签由文章同步创建；没有独立管理路由和页面，需先定义删除和引用行为 |
| M8-ANALYTICS | 待决定 | Umami | 已有 PageView 自建统计；未发现 Umami 接入，先决定是否替代或并存 |
| M8-CONTAINER | 待决定 | Docker Compose | 当前部署为 systemd/nginx；PRD Non-Goals 也将一键包排除在 MVP 外，需另定范围 |
| M8-DEMO | 待决定 | Demo 站 | 仓库不能证明演示站存在；需明确隔离数据、账号和运行责任后再实施 |

## 7. 更新本清单的规则

功能完成后补充实际验证证据再改状态，不因代码合并、测试文件新增或 PRD 的“已实现”标注自动勾选。可复用现有编号记录变化；不重编号历史任务，也不把尚未决定的候选项当作当前阻塞。

若实现或产品范围发生变化，同时核对 [数据库结构](database.md)、[接口文档](api.md)、[部署文档](deployment.md) 和 [PRD](prd.md) 的对应职责。本文记录的待办不授权自动部署、迁移、发送消息或修改真实账号。

# xblog 技术栈

更新日期：2026-11-01。本文依据当前工作区清单与锁文件，不代表服务器已更新。迁移进度见 [实施计划](superpowers/plans/2026-11-01-apps-stack-migration.md)，部署见 [deployment.md](deployment.md)。

## 1. 应用与运行时

| 部分 | 路径 | 职责 |
| --- | --- | --- |
| 公开站 | apps/web | Next.js、RSC、ISR、SEO、RSS、sitemap、next-intl |
| 管理后台 | apps/admin | React + Vite + Ant Design、React Router；生产静态 SPA |
| API | apps/api | FastAPI、异步 SQLModel/SQLAlchemy、PostgreSQL |
| 共享契约 | packages/contracts | 业务 DTO 类型，无 React/Next/Ant Design 依赖 |
| 前端工具链 | 仓库根目录 | pnpm workspace、统一锁文件、Biome、TypeScript |

Node 固定为 `.node-version` 中的 **26.13.0 LTS**，根 packageManager 为 **pnpm 12.16.1**。Python 声明 >=3.14，`.python-version` 保持 3.14 系列，验证环境为 3.14.6。PostgreSQL 主版本未由仓库锁定，目录迁移不升级线上数据库。

版本从官方 npm/PyPI stable 登记核实后精确写入清单；前端解析见 [pnpm-lock.yaml](../pnpm-lock.yaml)，API 解析见 [uv.lock](../apps/api/uv.lock)。不采用 alpha/beta/rc/canary，不把锁定版本当作线上运行版本。

## 2. 前端

| 技术 | 声明/锁定版本 | 用途 |
| --- | --- | --- |
| React / React DOM | 19.3.1 | 双端组件运行时，版本一致 |
| TypeScript | 7.0.2 | 独立类型检查，Next 使用 TS7 CLI |
| Next.js | 16.4.3 | 仅公开站服务、SSR/ISR 与 Route Handler |
| Vite / React 插件 | 8.3.5 / 6.1.2 | 管理端开发与静态构建 |
| Ant Design | 6.6.8 | 后台布局、控件、表格、表单、弹层和主题 token |
| React Router | 7.18.5 | 后台 basename=/admin，业务路由懒加载 |
| Lucide React | 1.66.0 | 双端业务图标 |
| Biome | 2.6.4 | 格式、lint、导入整理，替代 ESLint |
| next-intl / use-intl | 4.14.9 / 4.14.9 | 公开 URL 国际化 / 后台独立语言 Provider |
| SWR | 2.5.1 | 后台请求与缓存，未同时改为其他数据层 |
| Tailwind CSS | 4.3.3 | 公开站样式、后台必要布局与编辑器样式 |
| Mermaid | 12.2.0 | 按需加载正文图表 |
| react-markdown | 10.1.0 | 后台 Markdown 预览 |
| remark-gfm / rehype-raw | 4.0.1 / 7.0.0 | 后台 GFM 与 HTML 处理，不等于内容已消毒 |
| esbuild | 0.28.2 | 测试脚本转译，替代 TS7 不再提供的 transpileModule |

依据：[web 清单](../apps/web/package.json)、[admin 清单](../apps/admin/package.json)、[根清单](../package.json)。公开站保留实际使用的 shadcn/Radix 控件；后台控件由 Ant Design 实现，不导入 Next.js 或 Radix。业务图标只使用 Lucide，不直接引入 react-icons 或 @ant-design/icons；Ant Design 内部依赖不等同于业务选用另一套图标。

三款本地字体 Noto Sans SC、Noto Serif SC、Geist Mono 及 OFL 许可证保留在 [web/app/fonts](../apps/web/app/fonts/)。公开站使用 next/font/local，后台引用本地资源，构建不请求 Google Fonts。

## 3. 后端

| 技术 | 锁定版本 | 用途 |
| --- | --- | --- |
| fastapi | 0.162.0 | API/OpenAPI |
| uvicorn | 0.54.0 | ASGI 服务 |
| pydantic | 2.14.2 | 请求响应校验 |
| pydantic-settings | 2.16.2 | 环境配置 |
| sqlmodel | 0.0.48 | 模型和异步会话 |
| sqlalchemy | 2.1.6 | 引擎、事务与表达式 |
| alembic | 1.20.1 | 数据库迁移 |
| asyncpg | 0.32.0 | PostgreSQL 驱动 |
| pyjwt | 2.15.1 | JWT 会话 |
| bcrypt | 5.0.0 | 密码哈希 |
| cryptography | 50.0.2 | Fernet 加密模型 Key |
| httpx | 0.28.1 | 业务 HTTP/SSE 出站 |
| markdown | 3.11.2 | Markdown 转 HTML |
| pygments | 2.21.0 | 代码高亮 |
| pyyaml | 6.0.3 | Skill frontmatter |
| ruff | 0.17.3 | 格式、导入与静态检查 |
| mypy | 2.4.1 | Python 类型检查 |
| pytest | 9.2.0 | 回归测试 |

依据：[pyproject.toml](../apps/api/pyproject.toml)。SQLModel 0.0.48 允许 SQLAlchemy >=2.0.14,<2.2.0，当前解析 2.1.6。HTTPX 业务客户端仍为 0.28.1；框架测试另解析 HTTPX2，TestClient 已通过本地回归。

认证仍为 HttpOnly Cookie + JWT，密码哈希与 Key 加密方案不变。普通 JSON 使用 code/msg/data，SSE、重定向及上传文件不套普通成功外壳。内容提交成功后才触发缓存失效；失败不通知刷新。搜索仍为 ILIKE 与标签关联查询，本次不引入全文索引。

数据库结构和迁移历史未更改，见 [database.md](database.md)。API 测试强制隔离配置、测试库和上传目录，不读取实际 .env；内存 SQLite 测试不替代 PostgreSQL 迁移验收。

## 4. 部署与配置边界

| 入口 | 目标 |
| --- | --- |
| 公开站、RSS、sitemap | Next.js 10241 |
| /admin/ 生产 | nginx 读取 apps/admin/dist；页面深链接回退，缺失资产 404 |
| /admin/ 开发 | Vite 10243，base=/admin/ |
| /api/v1/* | FastAPI 10242，含上传与 AI SSE |
| /api/revalidate | 内网 Next.js 10241，密钥校验 |
| 本地联调入口 | nginx 10240，统一前后台导航、Cookie、OAuth |

API/web 使用 systemd，管理端生产不运行 Vite preview。nginx 负责 HTTPS 与 SSE 无缓冲代理。迁移后检查 UPLOAD_DIR 和 Skill 存储路径；数据库、上传文件和密钥配置共同备份。

公开站 SITE_LOCALE 与后台 ADMIN_LOCALE 独立，跨应用使用普通链接。公开主题来自数据库，后台沿用 xblog-admin-theme-v2 的 7 款主题偏好；Ant token 不影响公开站。

可选服务包括 Giscus、GitHub/微信 OAuth、SMTP、Turnstile 和用户配置的模型 API。短信 aliyun 分支仍只记日志，不列为生产发送能力。本次不引入 Redis、Celery、对象存储或容器编排。

## 5. 检查与维护

从仓库根目录执行：

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
uv run --directory apps/api ruff check .
uv run --directory apps/api mypy
uv run --directory apps/api pytest
```

Biome 由 [biome.json](../biome.json) 管理，不替代 TypeScript 检查。可信管理员 HTML、动态外链图片、DOM 增强时机使用局部且有理由的规则说明，不全局关闭检查。迁移期间已有样式特异性等警告在记录中说明，不冒充零诊断。

已完成隔离的目标依赖构建与 TS7 类型错误负例验证；完整工作区验证结果见实施计划。未连接生产 PostgreSQL、未运行生产迁移，外部 OAuth、短信、模型服务仍需对应环境验收。

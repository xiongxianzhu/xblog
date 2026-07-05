<p align="center">
  <a href="../README.md"><img src="https://img.shields.io/badge/Monorepo-xblog-181717?style=for-the-badge&logo=github&logoColor=white" alt="xblog Monorepo"/></a>
  <a href="https://github.com/xiongxianzhu/xblog/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License MIT"/></a>
</p>

<h1 align="center">xblog API</h1>

<p align="center">
  <strong>FastAPI 后端 · REST API · PostgreSQL</strong><br/>
  <sub>由 <a href="https://github.com/xiongxianzhu/create-fastapi">create-fastapi</a> 脚手架生成并扩展</sub>
</p>

<p align="center">
  <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/Python-3.14-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-0.138+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/></a>
  <a href="https://www.uvicorn.org/"><img src="https://img.shields.io/badge/uvicorn-0.49+-4051B5?style=for-the-badge" alt="uvicorn"/></a>
  <a href="https://github.com/fastapi/sqlmodel"><img src="https://img.shields.io/badge/SQLModel-0.0.39+-059669?style=for-the-badge&logo=fastapi&logoColor=white" alt="SQLModel"/></a>
</p>

<p align="center">
  <a href="https://docs.pydantic.dev/"><img src="https://img.shields.io/badge/Pydantic-2-E92063?style=for-the-badge&logo=pydantic&logoColor=white" alt="Pydantic"/></a>
  <a href="https://github.com/astral-sh/uv"><img src="https://img.shields.io/badge/uv-DE5FE9?style=for-the-badge&logo=uv&logoColor=white" alt="uv"/></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-16+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/></a>
</p>

<p align="center">
  <a href="../README.md"><b>Monorepo 首页</b></a>
  &nbsp;·&nbsp;
  <a href="../AGENTS.md"><b>AGENTS.md</b></a>
  &nbsp;·&nbsp;
  <a href="../docs/prd-xblog.md"><b>PRD</b></a>
  &nbsp;·&nbsp;
  <a href="../frontend/README.md"><b>前端文档</b></a>
</p>

<p align="center"><sub>— · — · —</sub></p>

---

## 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [FastAPI CLI](#fastapi-cli)
- [环境变量](#环境变量)
- [API 路由](#api-路由)
- [常用命令](#常用命令)
- [目录结构](#目录结构)
- [数据库迁移](#数据库迁移)
- [生产部署](#生产部署)
- [故障排查](#故障排查)

---

## 概述

<p align="center"><sub>本目录提供 xblog 的全部 REST API</sub></p>

| | 模块 | 能力 |
|:-:|:---|:---|
| 📝 | 内容 | 文章 / 页面 CRUD · **封面上传** · **标签自动创建** |
| 🔍 | 发现 | 全文搜索 |
| 🔗 | 友链 | 友链 CRUD · **LOGO 本地上传** · 简介字段 |
| 📊 | 统计 | 访问计数 · **登录/操作审计日志**（分页 API） |
| 🔐 | 认证 | Cookie + JWT · 短信验证码 · OAuth · **Turnstile / login-guard** |
| 🤖 | AI | 提供商 CRUD · Skill 管理 · 多 Skill SSE complete |
| 🎨 | 外观 | 公开站主题 + 站点品牌（名称/副标题/LOGO/**备案号**） |
| 🧹 | 维护 | **`cleanup-uploads` CLI** · 孤儿封面/LOGO 兜底清理 |

<p align="center"><sub>前端通过同域 <code>/api/v1/*</code> 访问 · 开发时由 Next.js rewrite 到本服务</sub></p>

---

## 快速开始

```bash
make install && make setup && make migrate && make dev
```

<details>
<summary><strong>手动步骤</strong></summary>

```bash
uv sync
cp .env.example .env
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

</details>

<p align="center"><sub>Swagger UI → <a href="http://127.0.0.1:8000/docs"><code>http://127.0.0.1:8000/docs</code></a> · 健康检查 <code>GET /api/v1/public/health</code></sub></p>

---

## FastAPI CLI

<p align="center"><sub><code>pyproject.toml</code> → <code>[tool.fastapi] entrypoint = "app.main:app"</code></sub></p>

```bash
uv run fastapi dev                              # 开发（热重载）
uv run fastapi dev --host 0.0.0.0 --port 8080   # 自定义端口
uv run fastapi run --host 127.0.0.1 --port 8000 --workers 4  # 生产
```

<p align="center">生产推荐 systemd → <a href="../deploy/systemd/README.md"><b>deploy/systemd/</b></a></p>

---

## 环境变量

<p align="center"><sub>复制 <a href=".env.example"><code>.env.example</code></a> → <code>.env</code></sub></p>

| 变量 | 必填 | 说明 |
|------|:----:|------|
| `SECRET_KEY` | ✅ | JWT 签名；生产用随机强密钥 |
| `DATABASE_URL` | ✅ | `postgresql+asyncpg://user:pass@host:5432/xblog` |
| `APP_ENV` | | 默认 `development` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | | JWT 访问令牌有效期 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | | 刷新令牌有效期 |
| `CORS_ORIGINS` | 开发 | 默认 `http://localhost:3000` |
| `COOKIE_SECURE` / `COOKIE_DOMAIN` | 生产 | HTTPS 与 Cookie 域 |
| `REVALIDATE_SECRET` | 生产 | 与 `frontend/.env` 一致 |
| `REVALIDATE_URL` | 生产 | 如 `http://localhost:3000/api/revalidate` |
| `UPLOAD_DIR` | | 上传根目录，默认 `uploads`（Skill 包、**封面** `covers/`、**友链 LOGO** `link-logos/`） |
| `AI_KEY_ENCRYPTION_SECRET` | | AI 写作 Key 加密；留空则派生自 `SECRET_KEY` |
| `FRONTEND_URL` | OAuth | 回调跳转目标，如 `http://localhost:3000` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | | GitHub OAuth（可选） |
| `WECHAT_APP_ID` / `WECHAT_APP_SECRET` | | 微信 OAuth（可选） |
| `SMS_PROVIDER` | | 短信：`dev`（开发，验证码写日志）或 `aliyun` |
| `SMS_CODE_EXPIRE_MINUTES` | | 验证码有效期 |
| `SMS_SEND_INTERVAL_SECONDS` | | 同号发送间隔 |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | | Cloudflare Turnstile（与 frontend 公钥一致） |
| `LOGIN_CAPTCHA_AFTER_FAILURES` | | 密码登录失败 N 次后要求 Turnstile（默认 3） |
| `LOGIN_MAX_FAILURES_PER_WINDOW` | | 同 IP/用户名失败上限（默认 10 / 15 分钟） |
| `FORGOT_PASSWORD_MAX_PER_WINDOW` | | 找回密码窗口内次数上限 |

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

> ⚠️ `.env` 已被 `.gitignore` 忽略，切勿提交到 Git。

---

## API 路由

<p align="center"><sub>入口 → <a href="app/api/v1/router.py"><code>app/api/v1/router.py</code></a></sub></p>

| 前缀 | 认证 | 示例 |
|------|:----:|------|
| `/api/v1/public/*` | — | 文章、搜索、`/public/site-theme`（含品牌字段） |
| `/api/v1/auth/*` | 登录流 | 登录、刷新、登出、短信、OAuth、资料 |
| `/api/v1/admin/*` | 管理员 Cookie | CRUD、用户、`/admin/auth-settings`、站点主题 |
| `/api/v1/admin/ai/*` | 管理员 Cookie | 提供商、Skill、`POST …/complete`（SSE） |

<details>
<summary><strong>auth 与 AI 路由摘要</strong></summary>

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/auth/login-methods` | 已启用登录方式 |
| GET | `/auth/login-guard` | 登录页 Turnstile 是否必填（按失败次数 / 找回密码） |
| POST | `/auth/sms/send-code` · `/auth/sms/login` | 短信验证码 |
| GET/POST | `/auth/oauth/*` | GitHub / 微信 OAuth 与绑定 |
| GET/PATCH | `/admin/auth-settings` | 登录方式开关 |
| * | `/admin/ai/providers` | AI 提供商 CRUD + test |
| * | `/admin/ai/skills` | Skill 上传与管理 |
| POST | `/admin/ai/complete` | SSE 流式（`delta` / `thinking` / `done`） |
| POST | `/admin/posts/cover` | 上传文章封面 → `/api/v1/uploads/covers/…` |
| DELETE | `/admin/posts/cover?cover_url=…` | 删除已上传封面文件（管理用） |
| POST | `/admin/links/logo` | 上传友链 LOGO → `/api/v1/uploads/link-logos/…` |
| DELETE | `/admin/links/logo?logo_url=…` | 删除已上传友链 LOGO（管理用） |
| GET | `/admin/logs/login` | 登录日志（`page` · `page_size`，默认 20） |
| GET | `/admin/logs/operations` | 操作日志（分页） |

</details>

> **标签**：保存文章时 `tag_slugs` 不存在会自动 `get_or_create_tag`（支持中文 slug）。  
> **封面 / LOGO**：先上传、后保存；PATCH 换图或置空时删旧 managed 文件；未保存孤儿由前端 DELETE + `cleanup-uploads` CLI 兜底（见下方维护小节）。

> **写操作只出现在 admin 路由**，public 路由保持只读。

---

## 常用命令

| 场景 | 命令 |
|------|------|
| 📖 帮助 | `make help` |
| 👤 管理 | `uv run python -m app.cli create-admin` · `reset-password` · `seed-pages` |
| 🚀 开发 | `make dev` · `uv run fastapi dev` |
| 🗄 迁移 | `make revision MSG="描述"` → `make migrate` |
| ✅ 质量 | `make lint` · `make typecheck` · `make test` · `make check` |
| 📦 生产依赖 | `make prod-install` |
| 🧹 上传清理 | `uv run python -m app.cli cleanup-uploads [--max-age 3600] [--dry-run]` |

<p align="center"><sub>要求 Python <b>3.14+</b>（见 <code>.python-version</code>）</sub></p>

### 维护：上传孤儿文件清理

先上传、后保存模式下，用户关浏览器可能留下未引用文件。前端会尽力即时 DELETE；`cleanup-uploads` 为服务端兜底，仅扫描 `uploads/covers/` 与 `uploads/link-logos/`，对比 `posts.cover_url` / `friend_links.logo_url`，删除**未引用且超过 `--max-age`（默认 3600 秒）** 的文件。

```bash
uv run python -m app.cli cleanup-uploads --dry-run   # 预览
uv run python -m app.cli cleanup-uploads               # 实际删除
```

生产建议 cron 每小时执行一次：

```cron
0 * * * * cd /path/to/xblog/backend && uv run python -m app.cli cleanup-uploads >> /var/log/xblog-cleanup.log 2>&1
```

---

## 目录结构

```text
app/
├── cli.py               # create-admin · cleanup-uploads 等维护命令
├── main.py              # 应用入口 · 静态文件挂载
├── api/v1/              # public · admin · auth · ai endpoints
├── core/                # config · security · exceptions
├── db/                  # session
├── models/              # SQLModel 表定义
├── schemas/             # Pydantic 入参/出参
├── services/            # posts · uploads · upload_cleanup · audit_logs · login_guard · ai/ …
├── data/builtin_skills/ # 内置 Agent Skills（含 format · excerpt）
alembic/                 # 001 初始 … 013 friend_link_description
tests/                   # pytest（含 test_post_cover · test_upload_cleanup · test_login_guard）
uploads/                 # Skill 包 · covers/ · link-logos/（gitignore）
Makefile
```

---

## 数据库迁移

```bash
# 修改 models 后
make revision MSG="add foo column"
make migrate
```

<p align="center"><sub>生产部署前 <b>必须</b>执行 <code>uv run alembic upgrade head</code></sub></p>

---

## 生产部署

```text
① uv sync --frozen --no-dev && alembic upgrade head
② systemd: uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
③ nginx 反代 /api/ → :8000
```

| 资源 | 路径 |
|------|------|
| systemd | [`deploy/systemd/xblog-api.service`](../deploy/systemd/xblog-api.service) |
| nginx | [`deploy/nginx/backend.conf`](deploy/nginx/backend.conf) |
| 说明 | [`deploy/systemd/README.md`](../deploy/systemd/README.md) |

---

## 故障排查

| 问题 | 处理 |
|------|------|
| `alembic upgrade` 失败 | 检查 PostgreSQL 运行状态与 `DATABASE_URL` |
| 主题保存后公开页不变 | 确认 `REVALIDATE_SECRET`、`REVALIDATE_URL`；查日志 Skip ISR revalidate |
| CORS 错误 | 将前端 origin 加入 `CORS_ORIGINS` |
| 上传文件 404 | 确认 `uploads/` 可写；封面 `/api/v1/uploads/covers/` · LOGO `/api/v1/uploads/link-logos/` |
| 磁盘残留未保存上传 | 配置 cron 跑 `cleanup-uploads`；开发可用 `--dry-run` 预览 |
| 封面保存后仍显示旧图 | ISR 缓存 | 生产检查 `REVALIDATE_SECRET`；开发硬刷新 |
| AI complete 401 | 确认已登录且至少激活一个 AI 提供商 |
| 短信 dev 模式 | 查看 uvicorn 日志中的验证码；生产需配置 `SMS_PROVIDER=aliyun` |
| Turnstile 无法登录 | 前后端 Key 不一致或未在后台启用 | 对齐 `TURNSTILE_*` 与 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`；**设置 → 登录方式** |

---

<p align="center">
  <sub><a href="../LICENSE"><b>MIT License</b></a></sub>
</p>

# xblog 部署文档

本文说明仓库提供的 Linux VPS 部署方式：PostgreSQL + FastAPI + Next.js + nginx + systemd。配置与命令按当前源码静态核对，未在生产服务器执行。更新日期：2026-10-31。

## 1. 部署约定与前置条件

示例仓库路径为 `/home/appuser/xblog`，域名为 `blog.example.com`，服务账号沿用模板中的 `appuser`。执行前统一替换为实际值。应用安装、构建与迁移由具备目录和数据库权限的部署账号执行；安装服务、修改 nginx 和重启服务需要系统管理权限。

| 组件 | 要求与用途 |
| --- | --- |
| Python / uv | Python >=3.14；uv 按 backend/uv.lock 安装依赖 |
| Node.js / pnpm | 锁定 Next.js 要求 Node.js >=20.9.0；项目约定 pnpm >=9，未固定具体包管理器版本 |
| PostgreSQL | 开发和生产目标数据库；主版本未在仓库锁定，部署前确认目标实例和备份工具兼容 |
| nginx / systemd | nginx 负责入口与 TLS，systemd 运行两个应用进程 |
| DNS / 网络 | 域名指向服务器；公开 80/443，10241/10242 仅监听回环；数据库仅向所需应用开放 |
| 持久化 | PostgreSQL、backend/uploads/、前后端环境文件；发布版本时保留并备份 |

详细版本依据见 [技术栈](tech-stack.md)。现有 [systemd 模板](../deploy/systemd/) 与 [nginx 模板](../deploy/nginx/xblog.conf) 是部署起点，不是已启用的生产配置。

| 请求 | 目标 |
| --- | --- |
| `/`、公开页、`/admin/*` | `127.0.0.1:10241`，Next.js |
| `/api/v1/*`、`/api/v1/uploads/*` | `127.0.0.1:10242`，FastAPI |
| `/api/revalidate` | Next.js 专有回调，应通过内网 `127.0.0.1:10241` 调用 |

模板中的 `/api/` 会转给 FastAPI，因此不能直接把 `REVALIDATE_URL` 设置成公网域名下的 `/api/revalidate`。该模板下 AI complete 直接进入 FastAPI；前端同路径 BFF 并不经过生产入口。后端 `/docs`、`/openapi.json` 也不会由根路径代理自动公开。

### 1.1. 安装系统依赖与 PostgreSQL

以下安装主路径适用于 Ubuntu 22.04+ / Debian 12+，使用发行版软件包；先确认系统：

```bash
cat /etc/os-release
```

在具备 sudo 权限的运维账号下执行：

```bash
sudo apt update
sudo apt install -y git curl ca-certificates openssl postgresql postgresql-client postgresql-contrib
sudo systemctl enable --now postgresql
sudo systemctl status postgresql --no-pager
pg_lsclusters
pg_isready -h 127.0.0.1 -p 5432
sudo -u postgres psql -X -d postgres -c "SELECT version();"
```

预期 `pg_lsclusters` 中目标集群为 online，端口为 5432，`pg_isready` 显示 accepting connections，SQL 返回实际服务端版本。Debian/Ubuntu 的 postgresql 总服务可能显示 active (exited)，不能只凭该状态判断数据库进程就绪。若集群存在但未启动，可执行 `sudo pg_ctlcluster <主版本> <集群名> start`，两个参数取自 `pg_lsclusters`；已有数据目录不要重新 initdb。

仓库未固定 PostgreSQL 主版本，安装结果取决于发行版。若需要指定主版本，按 PostgreSQL 官方 [Ubuntu](https://www.postgresql.org/download/linux/ubuntu/) 或 [Debian](https://www.postgresql.org/download/linux/debian/) 安装说明使用官方仓库，并在迁移前核对版本与备份兼容性。

Alibaba Cloud Linux 等使用 dnf 的发行版不适用本节 apt 命令。其他发行版应先按对应安装方式准备数据库，再继续本文的建用户、建库和部署步骤。远程数据库只需在应用机安装对应 PostgreSQL 客户端，无需启动本地数据库服务。

### 1.2. 创建部署账号

继续在运维账号下执行；已有 appuser 时只检查，不重新创建或修改其权限：

```bash
id appuser || sudo useradd --create-home --user-group --shell /bin/bash appuser
getent passwd appuser
getent group appuser
```

预期用户和同名组存在，家目录为 `/home/appuser`。项目默认放在 `/home/appuser/xblog`，应由 appuser 读取和维护；系统服务管理仍由具备 sudo 权限的运维账号执行，不要求给 appuser 额外 sudo 权限。

### 1.3. 安装 uv 与 Python 3.14

使用 uv 管理 Python，按 [uv 安装说明](https://docs.astral.sh/uv/getting-started/installation/) 和 [Python 管理说明](https://docs.astral.sh/uv/guides/install-python/) 执行。先切换到应用账号，避免解释器安装到 root 家目录导致服务账号无法访问：

```bash
sudo -iu appuser
curl -LsSf https://astral.sh/uv/install.sh | sh
. "$HOME/.local/bin/env"
uv --version
command -v uv
uv python install 3.14
uv python find 3.14
uv run --no-project --python 3.14 python --version
exit
```

预期 uv 可执行，解释器为 Python 3.14.x；项目的 `backend/.python-version` 指定 3.14。无需替换系统 Python，也无需通过 apt 安装 Python 3.14。uv 安装器会提供适合当前平台的程序；记录实际 uv 和 Python 补丁版本用于部署追踪。

默认用户级安装的 uv 路径为 `/home/appuser/.local/bin/uv`，本文 unit 和 cron 已统一使用该路径。若自定义安装位置，以 appuser 下 `command -v uv` 的结果为准，并同步调整配置。systemd 不加载交互 shell 的 PATH，因此 ExecStart 使用绝对路径。

完成这些步骤后，再准备项目代码、填写第 2 节配置，并按第 3.1 节创建数据库用户和数据库。Node.js、pnpm 与 nginx 仍需满足前置条件，本节只安装 uv、Python 和 PostgreSQL。

## 2. 配置

首次部署时，从仓库根目录执行，已有配置不会被覆盖：

```bash
cd /home/appuser/xblog
test -f backend/.env || cp backend/.env.example backend/.env
test -f frontend/.env || cp frontend/.env.example frontend/.env
```

编辑两个 `.env` 后再安装和启动。不要把模板中的占位密钥用于生产；环境文件仅向部署和服务账号开放读取权限，不提交 Git。

### 后端

来源：[环境模板](../backend/.env.example)、[配置定义](../backend/app/core/config.py)。相对上传目录基于后端进程工作目录解析。

| 名称 | 生产配置 | 默认值 / 说明 |
| --- | --- | --- |
| APP_ENV | production | 默认 development；生产禁用开发 SQL echo |
| SECRET_KEY | 必填，独立生成强随机值 | 无默认值；JWT 签名 |
| DATABASE_URL | 必填，实际数据库账号与地址 | `postgresql+asyncpg://用户:密码@主机:5432/数据库`；不要使用模板密码 |
| COOKIE_SECURE | true | 默认 false；启用后登录依赖 HTTPS |
| COOKIE_DOMAIN | 通常留空 | host-only；仅需跨子域时设置匹配域名 |
| CORS_ORIGINS | 实际站点 Origin | 默认 http://localhost:10241；多项逗号分隔 |
| FRONTEND_URL | https://blog.example.com | OAuth 和密码重置跳转目标 |
| REVALIDATE_SECRET | 与前端一致的独立随机值 | 不填则跳过刷新 |
| REVALIDATE_URL | http://127.0.0.1:10241/api/revalidate | 直连 Next.js，避免被 nginx 转发到后端 |
| UPLOAD_DIR | uploads 或绝对持久化路径 | 默认 uploads，服务账号必须可写 |
| AI_KEY_ENCRYPTION_SECRET | 使用 AI 时建议独立设置并备份 | 配置类支持，但环境模板未列出；不填则使用 SECRET_KEY 派生加密密钥 |
| ACCESS_TOKEN_EXPIRE_MINUTES | 按需 | 默认 30 |
| REFRESH_TOKEN_EXPIRE_DAYS | 按需 | 默认 7 |

更换 AI 加密密钥（或其回退的 SECRET_KEY）后，旧模型密钥无法直接解密。轮换前保留原配置并制定重新录入方案；数据库备份必须与密钥配置配套保存。

### 前端

来源：[环境模板](../frontend/.env.example)。首次构建前完成这些配置；修改 `NEXT_PUBLIC_*` 后重新构建并重启，不能仅修改 systemd 环境。修改 `BACKEND_URL` 也应重新构建，以更新 rewrite 目标。

| 名称 | 配置 | 用途 |
| --- | --- | --- |
| BACKEND_URL | http://127.0.0.1:10242 | 服务端请求与开发代理的后端地址 |
| NEXT_PUBLIC_SITE_URL | https://blog.example.com | sitemap、RSS、Open Graph 的绝对地址 |
| REVALIDATE_SECRET | 与后端完全一致 | ISR 回调校验 |
| NEXT_PUBLIC_TURNSTILE_SITE_KEY | 启用防护时填写 | 与后端公开 Site Key 一致 |
| NEXT_PUBLIC_GISCUS_REPO / REPO_ID / CATEGORY / CATEGORY_ID | 启用评论时填写 | GitHub Discussions 仓库与分类，完整变量名均以 NEXT_PUBLIC_GISCUS_ 开头 |
| NEXT_PUBLIC_GISCUS_MAPPING / INPUT_POSITION / THEME | 按模板配置 | 评论映射、输入框位置、主题 |

### 可选服务

- GitHub / 微信：配置 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET` 或 `WECHAT_APP_ID`、`WECHAT_APP_SECRET`，第三方回调指向站点 `/api/v1/auth/oauth/github/callback` 或 `/api/v1/auth/oauth/wechat/callback`，再在后台启用对应方式并绑定账号。
- SMTP：配置 `SMTP_HOST`、`SMTP_PORT`（默认 587）、`SMTP_USER`、`SMTP_PASSWORD`、`SMTP_FROM`、`SMTP_USE_TLS`（默认 true）；用于找回密码，重置令牌默认有效 60 分钟。
- Turnstile：配置后端 `TURNSTILE_SITE_KEY`、`TURNSTILE_SECRET_KEY` 和前端 Site Key，并在后台设置启用。失败阈值与限流配置见环境模板。
- 短信：当前 `SMS_PROVIDER=dev` 和 `aliyun` 分支均只写日志；阿里云真实发送尚未实现。填写阿里云配置不代表已具备生产短信登录，生产应保持该登录方式关闭。
- AI：在后台添加提供商、录入自己的 Key、测试并启用。没有预置共享密钥；自定义 Skill 文件位于上传目录中，需持久化。

## 3. 首次部署

### 3.1. 准备代码与数据库

获取已确认的代码版本到 `/home/appuser/xblog`。以下命令适用于本机已安装并启动 PostgreSQL、存在 `postgres` 系统账号的 Linux 服务器。远程或托管数据库应使用提供方的管理员连接方式执行 SQL。

**创建数据库账号并设置密码**

数据库账号和库名均使用 `xblog`；它与运行应用的 Linux 账号 `appuser`、博客后台管理员是三类不同账号。首先在服务器终端进入 PostgreSQL 管理会话：

```bash
sudo -u postgres psql -X -d postgres
```

在 `psql` 提示符下逐条执行；`\password` 会要求输入并确认密码，不将明文密码写进 SQL：

```psql
\set ON_ERROR_STOP on
CREATE ROLE xblog WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
\password xblog
CREATE DATABASE xblog OWNER xblog ENCODING 'UTF8' TEMPLATE template0;
\connect xblog
GRANT USAGE, CREATE ON SCHEMA public TO xblog;
\quit
```

应用账号拥有自己的数据库，并可在 public schema 中执行后续 Alembic 建表迁移，不需要超级用户权限。`CREATE DATABASE` 在此处作为独立语句执行，不要放进 `BEGIN` 事务块。命令用于首次初始化；若角色或数据库已存在，先核对现有所有者和用途，不要删库重建。只修改现有账号密码时，在管理员 `psql` 会话单独执行 `\password xblog`。语法依据：[CREATE ROLE](https://www.postgresql.org/docs/current/sql-createrole.html)、[CREATE DATABASE](https://www.postgresql.org/docs/current/sql-createdatabase.html)、[psql](https://www.postgresql.org/docs/current/app-psql.html)。

**填写后端连接配置**

建议使用密码管理器生成足够长的随机字母数字密码；也可在设置密码前，在服务器终端运行 `openssl rand -hex 32` 生成 64 位十六进制随机密码，并妥善保存。使用这类密码可避免连接 URL 中的特殊字符转义问题。

在 `/home/appuser/xblog/backend/.env` 中填写刚才设置的密码，替换下方占位文字：

```dotenv
DATABASE_URL=postgresql+asyncpg://xblog:替换为刚设置的随机密码@127.0.0.1:5432/xblog
```

不要把 `postgresql+asyncpg://` 连接串原样用于 `psql` 或备份工具，它是应用驱动 URL。此部署示例使用无需 URL 转义的随机密码；现有密码若包含 `@`、`:`、`/`、`%` 等字符，还涉及 URL 编码及当前 Alembic 配置的百分号插值，不能直接照填。

**验证账号与建表权限**

退出管理员会话后，在服务器终端执行，按提示输入 xblog 数据库密码：

```bash
psql -X -h 127.0.0.1 -p 5432 -U xblog -d xblog -W \
  -c "SELECT current_user, current_database(), has_schema_privilege(current_user, 'public', 'USAGE') AS can_use_schema, has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_tables;"
```

预期用户和数据库均为 `xblog`，两个权限字段均为 `t`。验证通过后再执行第 3.2 节迁移；此时业务表尚未创建是正常现象。若连接被拒绝，检查 PostgreSQL 是否监听 `127.0.0.1:5432` 及 `pg_hba.conf` 是否允许该账号通过 TCP 密码认证。

确认服务账号可以读取仓库、环境文件和虚拟环境，写入上传目录和 Next.js 缓存目录；不使用全目录 `chmod 777`。默认服务用户与用户组均为 `appuser`，部署前须确保它们已存在，并由该账号安装项目依赖；使用其他账号时同步修改 unit 和目录权限。PostgreSQL 可以是远程实例；若不是本机 `postgresql.service`，对应调整 API unit 的依赖关系。

### 3.2. 安装后端与初始化

在部署账号下执行。后端管理命令统一通过 `uv run --frozen --no-dev` 运行：使用锁文件且不更新它，并排除开发依赖组；无需手动激活虚拟环境或指定平台相关的 `.venv/bin/` 路径。

```bash
cd /home/appuser/xblog/backend
uv sync --frozen --no-dev
uv run --frozen --no-dev alembic upgrade head
uv run --frozen --no-dev alembic current
uv run --frozen --no-dev python -m app.cli create-admin --username writer
uv run --frozen --no-dev python -m app.cli seed-pages
```

`writer` 为示例管理员名，密码由终端交互输入。创建管理员只在首次需要时执行，不在每次更新时重复执行。`seed-pages` 创建缺失的 about/projects，已存在则跳过。

当前迁移链到 `014_post_pinned.py`（revision `014_post_pinned`）；以 `uv run --frozen --no-dev alembic heads` 与上述 `current` 输出一致为准。迁移失败立即停止后续发布，保留错误日志，不通过跳过迁移或手工删除表继续。

### 3.3. 启动 API 并构建前端

先编辑 `/home/appuser/xblog/deploy/systemd/xblog-api.service` 和 `xblog-web.service`：核对 User、Group、WorkingDirectory、EnvironmentFile、ExecStart。API 模板通过下面的 `uv run --no-sync` 命令启动 Uvicorn，使用 4 个 worker。Web 使用 `/usr/local/bin/pnpm start` 调用前端 package.json 的 `start` 脚本；systemd 的 PATH 仍须能够找到 Node。

API 使用 appuser 安装的 `/home/appuser/.local/bin/uv`，确保该账号可读取项目虚拟环境和 Python 解释器。依赖已由部署步骤安装，常驻服务使用 `--no-sync`，避免启动时同步依赖：

```ini
WorkingDirectory=/home/appuser/xblog/backend
ExecStart=/home/appuser/.local/bin/uv run --no-sync uvicorn app.main:app --host 127.0.0.1 --port 10242 --workers 4
```

Web 的启动配置如下，参数传递给 `next start`，保持回环监听和 10241 端口：

```ini
WorkingDirectory=/home/appuser/xblog/frontend
ExecStart=/usr/local/bin/pnpm start -H 127.0.0.1
```

部署前确认 appuser 可执行 `/usr/local/bin/pnpm`；若实际安装位置不同，同步修改 unit。修改 unit 后执行 `daemon-reload`，已有服务需重启才会使用新启动命令。

从仓库根目录安装并先启动 API：

```bash
cd /home/appuser/xblog
sudo cp deploy/systemd/xblog-api.service /etc/systemd/system/
sudo cp deploy/systemd/xblog-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable xblog-api xblog-web
sudo systemctl start xblog-api
```

确认 API 和数据库可访问后构建前端，避免构建时缓存默认主题或空内容：

```bash
cd /home/appuser/xblog/frontend
pnpm install --frozen-lockfile
pnpm build
sudo systemctl start xblog-web
```

首次构建需要开发依赖中的 TypeScript、Tailwind 等工具，不能在构建前只安装生产依赖。`After=xblog-api.service` 只保证启动顺序，不保证 API 已就绪，应先完成下一节的直连检查。

### 3.4. 配置 nginx 与 HTTPS

按 [nginx 配置说明](../deploy/nginx/README.md) 安装模板，替换域名和证书路径。模板默认启用 HTTP，HTTPS 段只是注释示例，复制文件不会自动获得证书。通过服务器既有证书流程完成证书签发、续期和 80→443 跳转。

在系统实际加载的配置文件中保留以下行为：`/api/` 代理 API、`/` 代理 Web、上传大小限制 `32m`、AI 流式请求关闭缓冲且读写超时 300 秒。应用图片上限仍为 5 MiB，nginx 放宽不改变应用限制。

```bash
sudo nginx -t
sudo systemctl reload nginx
```

仅在 `nginx -t` 成功后 reload。若需从公网访问 ISR，应显式添加指向 Web 的精确匹配规则；本文主路径只使用内网回调，不需要公开它。

## 4. 验证

以下都是预期检查结果，本文未执行服务器验收。

```bash
curl --fail http://127.0.0.1:10242/api/v1/public/health
curl --fail http://127.0.0.1:10242/api/v1/public/posts
curl --fail http://127.0.0.1:10242/api/v1/public/site-theme
curl --fail --location https://blog.example.com/
sudo systemctl status xblog-api xblog-web
```

健康接口预期返回：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "status": "ok"
    }
}
```

健康检查不访问数据库，必须结合文章、主题接口判断数据库是否可用；空文章列表合法。继续用浏览器验证：

1. 通过 HTTPS 登录 `/admin`，刷新后保持会话；未登录请求管理接口返回 401。
2. 保存一篇测试文章并发布，公开页可读，封面 URL 可访问。
3. 修改站点主题，确认 API 返回新值，并验证公开布局最终更新；检查 API 日志没有 ISR 回调失败。生产主题缓存有效期为 3600 秒，回调使用 tag 失效；不要把接口成功等同于页面已经重新渲染。
4. 检查 `/sitemap.xml` 与 `/rss.xml`，生成链接使用正式域名。
5. 启用可选功能时，分别验证模型测试及流式输出、评论、OAuth、SMTP、Turnstile。

## 5. 更新、备份与恢复

### 日常更新

1. 记录当前代码版本、依赖锁文件、`uv run --frozen --no-dev alembic current` 输出与服务配置；阅读新版本迁移文件。涉及迁移时安排维护窗口并停止写入。
2. 备份 PostgreSQL、完整上传目录、前后端环境文件和服务/nginx 配置，确认备份可读取且有异机副本。数据库和文件应在同一停止写入窗口内备份，避免引用错位。
3. 停止 Web/API 后切换到待发布版本；保留 `.env`、上传文件、旧版本与构建产物。执行后端 frozen 安装和迁移，迁移成功后启动 API。
4. 执行前端 frozen 安装与构建，成功后启动 Web。unit 改动后需要 `daemon-reload`，环境配置改动需要重启对应进程。
5. 重做第 4 节验收。未通过时先恢复服务或回滚，不继续追加变更掩盖故障。

备份命令示例在服务器执行，`xblog-backup` 是操作者事先配置的 PostgreSQL service 名称（可通过受限权限的 `.pg_service.conf` / `.pgpass` 提供连接），不是仓库内置服务：

```bash
pg_dump --dbname='service=xblog-backup' --format=custom --file=/secure-backups/xblog-before-release.dump
tar -czf /secure-backups/xblog-uploads-before-release.tar.gz -C /home/appuser/xblog/backend uploads
pg_restore --list /secure-backups/xblog-before-release.dump
```

`/secure-backups` 必须预先创建并限制访问。若 UPLOAD_DIR 使用其他路径，备份该实际目录。归档目录可读只说明文件可解析；完整恢复能力需在独立 PostgreSQL 实例演练。

### 回滚边界

- 应用：只有旧程序与当前数据库结构兼容时，才能切回旧代码、对应依赖和旧前端构建。不要继续使用新版本的 `.next`。
- 配置：恢复配套的环境文件和 systemd/nginx 配置，尤其是 AI 解密密钥。更换 JWT 签名密钥会影响会话。
- 数据：未验证的迁移不能假定可安全 downgrade。代码回退不能撤销数据变更或删除文件；不兼容时应停止服务，把数据库备份恢复到独立新库并验证，再切换 DATABASE_URL，同时恢复同一批次上传文件。
- 恢复备份会丢失备份后的变更。应先保留故障现场与当前数据，确认恢复时间点后再切换，不能用空库或自动清空目录代替回滚。

## 6. 日常运维与排障

```bash
sudo journalctl -u xblog-api -n 100 --no-pager
sudo journalctl -u xblog-web -n 100 --no-pager
```

nginx 模板日志为 `/var/log/nginx/xblog.access.log` 和 `/var/log/nginx/xblog.error.log`。

按端口查询监听进程，在 Linux 服务器执行：

```bash
# 前端：10241
sudo ss -ltnp 'sport = :10241'

# 后端：10242
sudo ss -ltnp 'sport = :10242'

# 同时检查前后端
sudo ss -ltnp '( sport = :10241 or sport = :10242 )'

# PostgreSQL：5432
sudo ss -ltnp 'sport = :5432'
```

`-l` 仅显示监听套接字，`-t` 查询 TCP，`-n` 显示数字地址和端口，`-p` 显示进程名称、PID 和文件描述符。使用 sudo 可查看其他用户的进程信息。

检查 `Local Address:Port` 和 `Process` 列：按本文 systemd 配置，前后端应分别监听 `127.0.0.1:10241`、`127.0.0.1:10242`。没有匹配记录表示当前没有该 TCP 端口的监听；端口被其他进程占用时，先根据 PID 确认进程归属，再处理对应服务。端口处于 LISTEN 不代表业务或数据库访问正常，仍需执行第 4 节接口检查。

未引用上传清理仅覆盖 `covers/`、`link-logos/`，不包含头像、站点 LOGO 和 Skill。先在后端工作目录预览，再由具备文件和数据库权限的服务账号执行：

```bash
cd /home/appuser/xblog/backend
uv run --frozen --no-dev python -m app.cli cleanup-uploads --max-age 3600 --dry-run
uv run --frozen --no-dev python -m app.cli cleanup-uploads --max-age 3600
```

确认预览后，可在服务账号 crontab 配置以下每小时任务。uv 绝对路径按前述配置替换；这里同样使用 `--no-sync` 运行部署时已安装的环境。该命令不自动读取 systemd EnvironmentFile，但会从工作目录加载 `.env`：

```cron
15 * * * * cd /home/appuser/xblog/backend && /home/appuser/.local/bin/uv run --no-sync python -m app.cli cleanup-uploads --max-age 3600
```

TTL 为最小保留时长，叠加定时周期后实际清理可能晚于 1 小时。监控 cron 输出；不要扩展成全上传目录删除。

| 现象 | 检查位置 | 处理动作 |
| --- | --- | --- |
| 502 / 服务反复退出 | systemd 日志、ExecStart、Node PATH、工作目录 | 修正路径和读取权限；确认 10241/10242 监听 |
| health 成功但内容接口失败 | API 日志、DATABASE_URL、迁移版本 | 检查数据库连接与迁移，不把 health 当数据库探活 |
| 登录后立即退出 | HTTPS、Cookie Secure/Domain、代理域名 | 修正 Cookie 与域名配置，保留生产 HTTPS |
| 主题保存成功但公开页旧 | REVALIDATE_URL、双端密钥、API 回调日志 | 确认直连 10241；生产缓存与开发行为不同 |
| 前端环境变量修改无效 | 构建时间、NEXT_PUBLIC_*、rewrite | 重新构建并重启 Web |
| AI 输出最后一次性出现 | nginx SSE 设置 | 保留 proxy_buffering off、proxy_cache off 和超时配置 |
| AI Key 解密失败 | 原 AI_KEY_ENCRYPTION_SECRET / SECRET_KEY | 恢复配套密钥或重新录入提供商 Key |
| 图片 400 / 413 / 无法保存 | 应用类型和 5 MiB 限制、nginx、上传目录权限 | 调整文件或权限；不要只增大 nginx 限额 |
| 配置 aliyun 后收不到短信 | sms_service.py | 当前未真正发送；不要据日志成功启用生产短信入口 |

后端 AI 限流是进程内状态，4 worker 不提供跨进程统一的 60 次/分钟额度。若调整进程数，不应把该限制当作全局配额保证。

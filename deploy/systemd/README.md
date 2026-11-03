# systemd 部署

xblog 生产环境用 systemd 守护 API 与 Next.js；管理端 apps/admin/dist 由 nginx 静态托管，不创建第三个应用服务。默认仓库目录为 `/home/appuser/xblog`，两个服务均使用 `appuser` 用户和用户组。完整配置、首次初始化、验收与恢复步骤见 [部署文档](../../docs/deployment.md)。

## 前置条件

- `appuser` 用户和用户组已存在；该账号可读取项目、环境文件和 Python 解释器，并写入上传目录、虚拟环境及 Next.js 缓存目录。
- 在 appuser 账号下安装 uv、Python 和项目依赖。API 模板使用用户级安装路径 `/home/appuser/.local/bin/uv`；自定义安装位置时，按 `command -v uv` 结果同步修改 `ExecStart` 与 cron。
- Web 模板使用 `/usr/local/bin/pnpm start`，调用 package.json 中的 `start: next start -p 10241`。确认 appuser 可执行该路径；自定义安装时同步修改 ExecStart。systemd 的 PATH 仍须能找到 Node，交互 shell 中的版本管理器配置不会自动加载。
- 前后端 `.env` 已配置，PostgreSQL 可连接，迁移前完成必要备份。远程数据库部署应调整 API unit 的 `postgresql.service` 依赖。

## 安装步骤

1. 在 appuser 账号下安装生产后端依赖并迁移：

   ```bash
   cd /home/appuser/xblog/apps/api
   uv sync --frozen --no-dev
   uv run --frozen --no-dev alembic upgrade head
   uv run --frozen --no-dev alembic current
   ```

2. 核对 `xblog-api.service`、`xblog-web.service` 的用户、工作目录、环境文件和启动路径。API 启动命令为：

   ```ini
   ExecStart=/home/appuser/.local/bin/uv run --no-sync uvicorn app.main:app --host 127.0.0.1 --port 10242 --workers 4
   ```

   `--no-sync` 使用部署时已安装的虚拟环境，不在服务启动时同步依赖。更新版本时须先重新执行 `uv sync --frozen --no-dev`。

3. 从仓库根目录安装 unit，先启动 API：

   ```bash
   cd /home/appuser/xblog
   sudo cp deploy/systemd/xblog-api.service /etc/systemd/system/
   sudo cp deploy/systemd/xblog-web.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable xblog-api xblog-web
   sudo systemctl start xblog-api
   ```

4. 确认 API 与数据库可用后，在 appuser 账号下构建前端并启动 Web：

   ```bash
   curl --fail http://127.0.0.1:10242/api/v1/public/health
   curl --fail http://127.0.0.1:10242/api/v1/public/posts
   cd /home/appuser/xblog
   pnpm install --frozen-lockfile
   pnpm build
   sudo systemctl start xblog-web
   ```

   health 仅检查进程响应；posts 用于检查数据库访问。首次初始化管理员与固定页见主部署文档。systemd 的 After 只保证顺序，不代表 API 已就绪。

5. 检查服务状态与日志：

   ```bash
   sudo systemctl status xblog-api xblog-web
   sudo journalctl -u xblog-api -f
   sudo journalctl -u xblog-web -f
   ```

预期两个服务均为 active，后端监听 `127.0.0.1:10242`，前端监听 10241。前端未指定监听地址，须通过安全组或防火墙阻止公网直接访问该端口。本文命令为操作说明，不代表已在服务器执行。

nginx 反向代理配置见 [nginx 部署](../nginx/README.md)。`REVALIDATE_URL` 使用 `http://127.0.0.1:10241/api/revalidate`，避免公网 `/api/` 规则把回调转发给 FastAPI。

# systemd 部署

API 与 C 端公开站分别使用独立 unit；管理端是静态 SPA，由 nginx 托管，无需 `xblog-admin.service`。默认仓库为 `/home/appuser/xblog`，服务用户和组为 `appuser`。完整初始化与更新流程见 [部署文档](../../docs/deployment.md)。

| 应用 | 配置 | 工作目录 | 环境文件 | 运行方式 |
| --- | --- | --- | --- | --- |
| API | [xblog-api.service](xblog-api.service) | apps/api | apps/api/.env | uvicorn，127.0.0.1:10242 |
| C 端 | [xblog-web.service](xblog-web.service) | apps/web | apps/web/.env | next start，10241 |
| 管理端 | [xblog.conf](../nginx/xblog.conf) | apps/admin/dist | 构建时读取 apps/admin/.env | nginx 静态托管 /admin/ |

## API 服务

先由 appuser 安装依赖、执行数据库迁移与首次初始化，确认 PostgreSQL 可访问。unit 使用 `/home/appuser/.local/bin/uv`；自定义安装路径时同步调整 ExecStart。远程数据库应调整 `postgresql.service` 依赖。

```bash
cd /home/appuser/xblog/apps/api
uv sync --frozen --no-dev
uv run --frozen --no-dev alembic upgrade head
uv run --frozen --no-dev alembic current
```

由运维账号安装并启动：

```bash
cd /home/appuser/xblog
sudo cp deploy/systemd/xblog-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now xblog-api
curl --fail http://127.0.0.1:10242/api/v1/public/health
curl --fail http://127.0.0.1:10242/api/v1/public/posts
```

`--no-sync` 使用已安装的虚拟环境；更新依赖后再重启 API。health 仅检查进程响应，posts 验证数据库访问。

## C 端公开站服务

API 就绪后，由 appuser 从仓库根目录安装依赖并单独构建公开站：

```bash
cd /home/appuser/xblog
pnpm install --frozen-lockfile
pnpm --filter @xblog/web build
```

由运维账号安装并启动：

```bash
cd /home/appuser/xblog
sudo cp deploy/systemd/xblog-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now xblog-web
curl --fail http://127.0.0.1:10241/
```

unit 使用 `/usr/local/bin/pnpm start`，package.json 已指定端口 10241，不添加 `-H`。确认 appuser 可执行 pnpm，systemd 的 PATH 可找到 Node。服务账号须能读取 `.env` 并写入 `.next` 缓存。`After` 只保证启动顺序，不保证 API 已就绪。

## 管理端静态发布

依赖仍统一从仓库根目录安装，然后单独构建：

```bash
cd /home/appuser/xblog
pnpm --filter @xblog/admin build
test -f apps/admin/dist/index.html
```

按 [nginx 部署](../nginx/README.md) 托管产物；生产不运行 Vite 开发服务或 `vite preview`。管理端更新无需重启 API 或公开站。`VITE_*` 在构建时注入，不由 systemd 加载，不能包含私密配置。

## 状态、更新与日志

```bash
sudo systemctl status xblog-api xblog-web
sudo journalctl -u xblog-api -n 100 --no-pager
sudo journalctl -u xblog-web -n 100 --no-pager
```

更新 unit 前检查 `systemctl cat <服务名>` 中的旧 override。更新后执行 `sudo systemctl daemon-reload`，再 `sudo systemctl restart <受影响服务名>`。API 环境变更重启 API；公开站构建变量变更需重建并重启公开站。原地重建公开站前先停止其服务，避免覆盖正在使用的 `.next`；管理端采用独立发布目录切换或维护窗口发布，详见主部署文档。

生产只公开 80/443，防火墙与安全组不开放 10241/10242/10243。`REVALIDATE_URL=http://127.0.0.1:10241/api/revalidate` 直连公开站，避免被 nginx 的 `/api/` 转发到 FastAPI。以上为操作说明，未在服务器执行。

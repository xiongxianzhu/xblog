# systemd 部署

Monorepo 生产环境用 **systemd** 守护 API 与 Next.js 进程（不用 supervisor）。

## 安装步骤

1. 将仓库部署到 VPS（示例路径 `/srv/xblog`），并完成 `backend/.env`、`frontend/.env` 与构建：

   ```bash
   cd /srv/xblog/backend && uv sync --frozen --no-dev && uv run alembic upgrade head
   cd /srv/xblog/frontend && pnpm install --frozen-lockfile && pnpm build
   ```

2. 编辑本目录下 `xblog-api.service`、`xblog-web.service` 中的路径、用户、`ExecStart`。

3. 安装 unit 文件：

   ```bash
   sudo cp deploy/systemd/xblog-api.service /etc/systemd/system/
   sudo cp deploy/systemd/xblog-web.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable xblog-api xblog-web
   sudo systemctl start xblog-api xblog-web
   ```

4. 查看状态与日志：

   ```bash
   sudo systemctl status xblog-api xblog-web
   sudo journalctl -u xblog-api -f
   sudo journalctl -u xblog-web -f
   ```

nginx 反向代理配置见 [`deploy/nginx/`](../nginx/README.md)（示例文件 `xblog.conf`）。

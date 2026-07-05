# nginx 部署

xblog 生产环境推荐 **nginx 同域反代**：访客与管理员浏览器只访问一个域名，由 nginx 按路径转发到本机进程。

| 路径 | 上游 | 进程 |
|------|------|------|
| `/` | `127.0.0.1:3000` | `next start`（见 `deploy/systemd/xblog-web.service`） |
| `/api/` | `127.0.0.1:8000` | `uvicorn`（见 `deploy/systemd/xblog-api.service`） |

> 开发环境由 Next.js `rewrites` 把 `/api/*` 代理到 `BACKEND_URL`；**生产环境应让 nginx 直连 FastAPI**，避免多一层 Node 转发。

## 前置

1. 已完成 [systemd 部署](../systemd/README.md)：`xblog-api`、`xblog-web` 在本机监听 `8000` / `3000`。
2. 后端 `backend/.env` 与前端 `frontend/.env` 已配置；生产建议：
   - `COOKIE_SECURE=true`
   - `REVALIDATE_SECRET` 前后端一致
   - `REVALIDATE_URL=https://你的域名/api/revalidate`
   - `NEXT_PUBLIC_SITE_URL=https://你的域名`

## 安装示例配置

1. 复制并编辑站点配置（替换 `example.com`）：

   ```bash
   sudo cp deploy/nginx/xblog.conf /etc/nginx/sites-available/xblog.conf
   sudo nano /etc/nginx/sites-available/xblog.conf
   ```

2. 启用站点并检查语法：

   ```bash
   sudo ln -sf /etc/nginx/sites-available/xblog.conf /etc/nginx/sites-enabled/xblog.conf
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. 验证：

   ```bash
   curl -sS http://example.com/api/v1/public/health
   curl -sS -o /dev/null -w "%{http_code}\n" http://example.com/
   ```

## HTTPS（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d example.com
```

证书签发后，可按 `xblog.conf` 底部注释块整理 HTTPS server，或直接使用 certbot 自动插入的 SSL 段。启用 HTTPS 后记得同步更新前后端 env 中的 URL 与 `COOKIE_SECURE=true`。

## 配置说明

- **`client_max_body_size`**：头像与 Skill 包上传；默认 `32m`，可按需调整。
- **`/api/` 关闭 `proxy_buffering`**：保证管理后台 AI SSE 流式输出不被 nginx 缓冲。
- **`X-Forwarded-Proto`**：后端 Cookie 与 OAuth 回调依赖正确的 HTTPS 感知。

## 故障排查

| 现象 | 处理 |
|------|------|
| 502 Bad Gateway | 确认 `systemctl status xblog-api xblog-web` 均为 active |
| 公开页 OK、API 404 | 检查 `location /api/` 是否指向 `8000`，且 `proxy_pass` 未多删 `/api` 前缀 |
| 上传 413 | 增大 `client_max_body_size` |
| AI 流式卡住 | 确认 `/api/` 块已设 `proxy_buffering off` |
| Cookie 登录失败 | HTTPS 站点需 `COOKIE_SECURE=true`；检查 `X-Forwarded-Proto` |

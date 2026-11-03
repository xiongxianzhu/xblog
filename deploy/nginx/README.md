# nginx 部署

xblog 生产环境推荐 **nginx 同域反代**：访客与管理员浏览器只访问一个域名，由 nginx 按路径转发到本机进程。

| 路径 | 上游 | 进程 |
|------|------|------|
| `/` | `127.0.0.1:10241` | `next start`（见 `deploy/systemd/xblog-web.service`） |
| `/admin/` | apps/admin/dist | Ant Design 静态 SPA |
| `/api/` | `127.0.0.1:10242` | `uvicorn`（见 `deploy/systemd/xblog-api.service`） |

> 开发环境由 Next.js `rewrites` 把 `/api/*` 代理到 `BACKEND_URL`；**生产环境应让 nginx 直连 FastAPI**，避免多一层 Node 转发。

## 前置

1. 已完成 [systemd 部署](../systemd/README.md)：`xblog-api`、`xblog-web` 在本机监听 `10242` / `10241`。
2. 后端 `apps/api/.env` 与前端 `apps/web/.env` 已配置；生产建议：
   - `COOKIE_SECURE=true`
   - `REVALIDATE_SECRET` 前后端一致
   - `REVALIDATE_URL=http://127.0.0.1:10241/api/revalidate`（直连 Next.js，公网 `/api/` 由本模板转发到 FastAPI）
   - `NEXT_PUBLIC_SITE_URL=https://你的域名`

## 安装示例配置

1. 复制并编辑站点配置（替换 `example.com`）：

   ```bash
   cd /home/appuser/xblog
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

按 [部署文档](../../docs/deployment.md) 的 Certbot Standalone 或 DNS-01 流程签发并配置续期。证书准备好后，启用 `xblog.conf` 底部的 HTTPS 示例，替换域名和证书路径，再执行 `nginx -t`。

模板直接配置 `ssl_protocols TLSv1.2 TLSv1.3`，不依赖 `options-ssl-nginx.conf` 或 `ssl-dhparams.pem`。旧配置仍引用不存在的这两个文件时，删除对应 include、ssl_dhparam 行，不必创建空文件。

nginx 1.25.1 起可在 HTTPS server 中使用 `listen 443 ssl;` 配合 `http2 on;`。确认版本和 HTTP/2 模块后再启用；基础模板不要求 HTTP/2。启用 HTTPS 后同步更新前后端 URL 与 `COOKIE_SECURE=true`。

## 配置说明

- **`client_max_body_size`**：头像与 Skill 包上传；默认 `32m`，可按需调整。
- **`/api/` 关闭 `proxy_buffering`**：保证管理后台 AI SSE 流式输出不被 nginx 缓冲。
- **`X-Forwarded-Proto`**：后端 Cookie 与 OAuth 回调依赖正确的 HTTPS 感知。

## 故障排查

| 现象 | 处理 |
|------|------|
| 502 Bad Gateway | 确认 `systemctl status xblog-api xblog-web` 均为 active |
| 公开页 OK、API 404 | 检查 `location /api/` 是否指向 `10242`，且 `proxy_pass` 未多删 `/api` 前缀 |
| 上传 413 | 增大 `client_max_body_size` |
| AI 流式卡住 | 确认 `/api/` 块已设 `proxy_buffering off` |
| Cookie 登录失败 | HTTPS 站点需 `COOKIE_SECURE=true`；检查 `X-Forwarded-Proto` |

管理端深链接 `/admin/posts`、`/admin/logs/login` 回退到 index.html，`/admin/assets/` 下不存在的资源必须返回 404。本地三应用联调使用 [dev.conf](dev.conf) 的 10240 入口，Vite HMR 路径为 `/admin/hmr`。

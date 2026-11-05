# xblog 管理端

React + Vite + Ant Design 独立后台，使用 React Router、SWR、use-intl 和 Lucide。API 契约保持 `/api/v1`，身份通过 HttpOnly Cookie，不在浏览器存储 token。

## 开发与检查

从仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm dev:admin
pnpm --filter @xblog/admin typecheck
pnpm --filter @xblog/admin test
pnpm --filter @xblog/admin build
```

开发端口 10243、base=/admin/；完整联调通过 [nginx 10240 网关](../../deploy/nginx/dev.conf)，避免跨端返回和 OAuth 回调落在错误端口。Vite HMR 路径 `/admin/hmr`。

可选配置见 [.env.example](.env.example)。`VITE_TURNSTILE_SITE_KEY` 是公开 Site Key，登录防护接口的 site_key 优先；Secret Key 只放 API。

## 业务与状态

17个业务路由按需加载，包含认证、仪表盘、文章/固定页、友链、用户/资料/密码、主题设置、AI模型/Skill及两类日志。Markdown、Mermaid 与 AI SSE 沿用现有业务；Ant 控件适配层位于 src/components/ui。

ADMIN_LOCALE 与公开站 SITE_LOCALE 独立。后台7款主题保留 xblog-admin-theme-v2，配置由 Ant ConfigProvider 与 App 统一提供；浮层挂载 body 并继承后台主题。跨应用返回站点使用普通根链接。

## 生产

`pnpm build` 生成 `apps/admin/dist`，由 nginx 托管 `/admin/`。页面深链接回退到 index.html，缺失静态资源返回404；不运行 Vite preview 作为生产服务。nginx worker必须能读取dist，配置见 [部署文档](../../docs/deployment.md)。

编辑 .env 中的 VITE_* 后需重建静态产物。构建不需要数据库或模型密钥；真实第三方能力仍需服务端配置和环境验收。

### 本地直接访问后台

运行 `pnpm dev:admin` 后访问 `http://localhost:10243/admin/`。公开站使用 10241；跨端导航与 OAuth 联调使用 nginx 统一入口 `http://localhost:10240`。

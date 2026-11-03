# xblog API 文档

> 文档版本：1.1.0
> 创建日期：2026-10-31
> 更新日期：2026-11-01
> 文档语法：Markdown
> 范围：当前工作区实现；示例均为虚构数据，不代表线上状态。

## 修改记录

### 1.1.0

- 2026-11-01：源码迁至 apps/api；缓存回调覆盖三种语言路径并立即过期主题 tag，paths 返回实际展开路径，业务 API 路径不变。

### 1.0.0

- 首次补全 79 个已注册后端接口和 Next.js ISR 回调，列出独立参数表、返回字段及成功/失败示例。
- 记录统一响应、Cookie、上传、OAuth、SSE 及当前实现限制。本次仅补文档，未改变接口兼容性。

## 说明

面向前端和内部调用方。依据 [路由入口](../apps/api/app/api/v1/router.py)、[参数模型](../apps/api/app/schemas/)、[响应中间件](../apps/api/app/core/response.py) 与服务实现。需求背景见 [PRD](prd.md)，部署路径见 [部署文档](deployment.md)。

- 后端基地址：本地 `http://127.0.0.1:10242`，生产示例 `https://blog.example.com`。下文使用完整路径；locale 不进入 API 路径。
- 后端提供 `/docs` 和 `/openapi.json`；仓库 nginx 配置不会把这两个根路径转发到后端，应在内网直连查看。
- 普通成功响应为 `{code: 0, msg: "ok", data: ...}`；失败通常为 `{code: -1, msg: ..., data: {}}`。HTTP 状态码仍保留错误语义。声明 204 的接口经中间件转换为 HTTP 200。
- 响应表的默认值指模型默认，不保证每次响应固定该值。可空与可省略不同；PATCH 的 null 语义由具体业务处理决定。
- 日期为 ISO 8601，日期字段为 `YYYY-MM-DD`；项目业务时区为 `Asia/Shanghai`。路径 slug 需 URL 编码。
- `/api/v1/uploads/...` 为静态文件，不套 JSON 包装；OAuth 成功为 302；AI 成功为 SSE。不存在的 JSON 成功体不会人为补成 JSON。

## 1. 认证与调用

采用 HttpOnly Cookie + JWT，无 API 签名或 Bearer token 协议。`xblog_access` 默认 30 分钟，`xblog_refresh` 默认 7 天，`SameSite=Lax`、`Path=/`；生产启用 Secure。访问受保护接口时，可由有效 refresh 自动续签。账号必须处于启用状态；当前没有单独角色权限层。

浏览器跨源调用需 `credentials: "include"` 且后端允许对应 Origin；生产使用同域。下文 Cookie 在 schema 中可选不等于匿名可访问，受保护接口必须形成有效会话。OAuth 使用 `xblog_oauth_state`，有效期 600 秒。

```bash
curl -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"username":"writer","password":"ExamplePassword123!"}' \
  http://127.0.0.1:10242/api/v1/auth/login
curl -b cookies.txt http://127.0.0.1:10242/api/v1/auth/me
```

示例账号需先由 CLI 创建。multipart 上传交由客户端生成 boundary，不手写 JSON 文件体。

## 2. 错误码

| HTTP 状态 | code | 说明 |
| --- | --- | --- |
| 200 / 201 | 0 | 请求成功；模型测试仍需检查 data.ok |
| 400 | -1 | 业务参数、验证码、密码或上传不合法 |
| 401 | -1 | 缺少有效会话或 refresh 令牌 |
| 403 | -1 | 账号禁用、内置 Skill 禁止修改 |
| 404 | -1 | 资源不存在或公开文章尚未发布 |
| 409 | -1 | slug/名称/绑定冲突，或管理员保护限制 |
| 422 | -1 | 参数类型/范围或 Skill 内容校验失败 |
| 429 | -1 | 登录、短信、找回密码或 AI 限流 |
| 500 | -1 | 服务器内部错误 |
| 502 / 503 | -1 | 上游错误或相关服务未启用/未配置（按实际抛出位置） |

没有独立的业务数字码注册表，不凭 HTTP 状态推导新的 code。普通失败 data 为 `{}`；Pydantic 校验失败 data 为错误数组，包含 `type`、`loc`、`msg`、`input`，可能包含 `ctx`。登录防护失败可返回 `captcha_required` 或 `retry_after_seconds`。SSE 期间错误使用 `error` 事件，OAuth 回调业务失败跳转至带 error 查询参数的页面。

## 3. 接口

| 编号 | 方法 | 路径 | 接口 |
| --- | --- | --- | --- |
| 3.1 | GET | `/api/v1/public/health` | 健康检查 |
| 3.2 | GET | `/api/v1/public/posts` | 公开文章列表 |
| 3.3 | GET | `/api/v1/public/posts/{slug}` | 公开文章详情 |
| 3.4 | GET | `/api/v1/public/tags/{slug}/posts` | 标签下的文章 |
| 3.5 | GET | `/api/v1/public/pages/{slug}` | 公开固定页 |
| 3.6 | GET | `/api/v1/public/links` | 公开友链列表 |
| 3.7 | GET | `/api/v1/public/search` | 站内搜索 |
| 3.8 | POST | `/api/v1/public/pageviews` | 记录访问量 |
| 3.9 | GET | `/api/v1/public/site-theme` | 公开站点主题 |
| 3.10 | GET | `/api/v1/auth/login-guard` | 查询登录防护状态 |
| 3.11 | POST | `/api/v1/auth/login` | 密码登录 |
| 3.12 | POST | `/api/v1/auth/logout` | 退出登录 |
| 3.13 | POST | `/api/v1/auth/refresh` | 刷新登录会话 |
| 3.14 | GET | `/api/v1/auth/me` | 当前用户资料 |
| 3.15 | PATCH | `/api/v1/auth/phone` | 绑定手机号 |
| 3.16 | PATCH | `/api/v1/auth/email` | 绑定邮箱 |
| 3.17 | PATCH | `/api/v1/auth/profile` | 更新个人资料 |
| 3.18 | POST | `/api/v1/auth/avatar` | 上传头像 |
| 3.19 | DELETE | `/api/v1/auth/avatar` | 删除头像 |
| 3.20 | POST | `/api/v1/auth/change-password` | 修改密码 |
| 3.21 | GET | `/api/v1/auth/oauth/providers` | 查询 OAuth 提供商 |
| 3.22 | GET | `/api/v1/auth/oauth/links` | 查询 OAuth 绑定状态 |
| 3.23 | POST | `/api/v1/auth/forgot-password` | 申请密码重置 |
| 3.24 | POST | `/api/v1/auth/reset-password` | 重置密码 |
| 3.25 | GET | `/api/v1/auth/oauth/github/start` | 开始 GitHub 登录 |
| 3.26 | GET | `/api/v1/auth/oauth/github/bind/start` | 开始 GitHub 绑定 |
| 3.27 | GET | `/api/v1/auth/oauth/github/callback` | GitHub 回调 |
| 3.28 | GET | `/api/v1/auth/oauth/wechat/start` | 开始微信登录 |
| 3.29 | GET | `/api/v1/auth/oauth/wechat/bind/start` | 开始微信绑定 |
| 3.30 | GET | `/api/v1/auth/oauth/wechat/callback` | 微信回调 |
| 3.31 | GET | `/api/v1/auth/login-methods` | 查询登录方式 |
| 3.32 | POST | `/api/v1/auth/sms/send-code` | 发送短信验证码 |
| 3.33 | POST | `/api/v1/auth/sms/login` | 短信登录 |
| 3.34 | GET | `/api/v1/admin/posts` | 管理文章列表 |
| 3.35 | POST | `/api/v1/admin/posts` | 创建文章 |
| 3.36 | GET | `/api/v1/admin/posts/stats` | 文章统计 |
| 3.37 | GET | `/api/v1/admin/posts/{post_id}` | 管理文章详情 |
| 3.38 | PATCH | `/api/v1/admin/posts/{post_id}` | 更新文章 |
| 3.39 | DELETE | `/api/v1/admin/posts/{post_id}` | 删除文章 |
| 3.40 | POST | `/api/v1/admin/posts/cover` | 上传文章封面 |
| 3.41 | DELETE | `/api/v1/admin/posts/cover` | 删除未保存封面 |
| 3.42 | GET | `/api/v1/admin/pages/{slug}` | 管理固定页详情 |
| 3.43 | PATCH | `/api/v1/admin/pages/{slug}` | 更新固定页 |
| 3.44 | GET | `/api/v1/admin/links` | 管理友链列表 |
| 3.45 | POST | `/api/v1/admin/links` | 创建友链 |
| 3.46 | POST | `/api/v1/admin/links/logo` | 上传友链 LOGO |
| 3.47 | DELETE | `/api/v1/admin/links/logo` | 删除未保存友链 LOGO |
| 3.48 | PATCH | `/api/v1/admin/links/{link_id}` | 更新友链 |
| 3.49 | DELETE | `/api/v1/admin/links/{link_id}` | 删除友链 |
| 3.50 | GET | `/api/v1/admin/pageviews` | 访问量统计 |
| 3.51 | GET | `/api/v1/admin/users` | 用户列表 |
| 3.52 | PATCH | `/api/v1/admin/users/{user_id}` | 启用或禁用用户 |
| 3.53 | DELETE | `/api/v1/admin/users/{user_id}` | 删除用户 |
| 3.54 | GET | `/api/v1/admin/logs/login` | 登录日志 |
| 3.55 | GET | `/api/v1/admin/logs/operations` | 操作日志 |
| 3.56 | GET | `/api/v1/admin/site-theme` | 读取站点主题设置 |
| 3.57 | PATCH | `/api/v1/admin/site-theme` | 更新站点主题设置 |
| 3.58 | POST | `/api/v1/admin/site-theme/logo` | 上传站点 LOGO |
| 3.59 | DELETE | `/api/v1/admin/site-theme/logo` | 删除站点 LOGO |
| 3.60 | GET | `/api/v1/admin/auth-settings` | 读取登录方式设置 |
| 3.61 | PATCH | `/api/v1/admin/auth-settings` | 更新登录方式设置 |
| 3.62 | GET | `/api/v1/admin/ai/providers` | 模型提供商列表 |
| 3.63 | POST | `/api/v1/admin/ai/providers` | 创建模型提供商 |
| 3.64 | GET | `/api/v1/admin/ai/status` | AI 可用资源统计 |
| 3.65 | GET | `/api/v1/admin/ai/recommend` | 推荐 Skill |
| 3.66 | GET | `/api/v1/admin/ai/providers/{provider_id}` | 模型提供商详情 |
| 3.67 | PATCH | `/api/v1/admin/ai/providers/{provider_id}` | 更新模型提供商 |
| 3.68 | DELETE | `/api/v1/admin/ai/providers/{provider_id}` | 删除模型提供商 |
| 3.69 | POST | `/api/v1/admin/ai/providers/{provider_id}/test` | 测试模型提供商 |
| 3.70 | GET | `/api/v1/admin/ai/skills` | Skill 列表 |
| 3.71 | POST | `/api/v1/admin/ai/skills` | 创建 Skill |
| 3.72 | POST | `/api/v1/admin/ai/skills/upload` | 上传 Skill 包 |
| 3.73 | PATCH | `/api/v1/admin/ai/skills/{skill_id}` | 更新 Skill |
| 3.74 | DELETE | `/api/v1/admin/ai/skills/{skill_id}` | 删除 Skill |
| 3.75 | GET | `/api/v1/admin/ai/skills/{skill_id}/content` | 读取 Skill 正文 |
| 3.76 | PATCH | `/api/v1/admin/ai/skills/{skill_id}/content` | 修改 Skill 正文 |
| 3.77 | GET | `/api/v1/admin/ai/skill-defaults` | 读取默认 Skill |
| 3.78 | PATCH | `/api/v1/admin/ai/skill-defaults` | 修改默认 Skill |
| 3.79 | POST | `/api/v1/admin/ai/complete` | AI 流式写作 |
| 3.80 | POST | `/api/revalidate` | 使 Next.js 缓存失效 |

### 3.1. 健康检查

`GET` `/api/v1/public/health`

不要求当前登录会话。

仅检查进程响应，不查询数据库。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └status | string | — | 状态 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "status": "ok"
    }
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.2. 公开文章列表

`GET` `/api/v1/public/posts`

不要求当前登录会话。

只返回 published 文章。按 is_pinned、pinned_at、published_at、id 降序；page_size 省略时读取站点 posts_per_page（默认 10）。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| page | int | 否 | `1` | query；页码，从 1 开始；最小值：1 |
| page_size | int / null | 否 | — | query；每页数量；最小值：1；最大值：50；允许 null；是否清空以本接口业务说明为准 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └items | array<object> | — | 当前页记录列表 |
| └└id | int | — | 记录 ID |
| └└title | string | — | 标题 |
| └└slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └└excerpt | string / null | — | 摘要；允许 null；是否清空以本接口业务说明为准 |
| └└cover_url | string / null | — | 文章封面 URL；允许 null；是否清空以本接口业务说明为准 |
| └└published_at | string / null | — | 发布时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └└is_pinned | bool | `false` | 是否置顶 |
| └└tags | array<object> | `[]` | 标签列表 |
| └└└id | int | — | 记录 ID |
| └└└name | string | — | 名称 |
| └└└slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └total | int | — | 匹配记录总数 |
| └page | int | — | 页码，从 1 开始 |
| └page_size | int | — | 每页数量 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "items": [
            {
                "id": 1,
                "title": "第一篇文章",
                "slug": "hello-xblog",
                "excerpt": null,
                "cover_url": null,
                "published_at": null,
                "is_pinned": false,
                "tags": []
            }
        ],
        "total": 1,
        "page": 1,
        "page_size": 10
    }
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.3. 公开文章详情

`GET` `/api/v1/public/posts/{slug}`

不要求当前登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| slug | string | 是 | — | path；URL 标识；路径中的中文请进行 URL 编码 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └id | int | — | 记录 ID |
| └title | string | — | 标题 |
| └slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └excerpt | string / null | — | 摘要；允许 null；是否清空以本接口业务说明为准 |
| └cover_url | string / null | — | 文章封面 URL；允许 null；是否清空以本接口业务说明为准 |
| └published_at | string / null | — | 发布时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └is_pinned | bool | `false` | 是否置顶 |
| └tags | array<object> | `[]` | 标签列表 |
| └└id | int | — | 记录 ID |
| └└name | string | — | 名称 |
| └└slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └content_html | string | — | 服务端渲染的 HTML |
| └previous_post | object / null | — | 上一篇文章；不存在时为 null；允许 null；是否清空以本接口业务说明为准 |
| └└title | string | — | 标题 |
| └└slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └└published_at | string / null | — | 发布时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └next_post | object / null | — | 下一篇文章；不存在时为 null；允许 null；是否清空以本接口业务说明为准 |
| └└title | string | — | 标题 |
| └└slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └└published_at | string / null | — | 发布时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "id": 1,
        "title": "第一篇文章",
        "slug": "hello-xblog",
        "excerpt": null,
        "cover_url": null,
        "published_at": null,
        "is_pinned": false,
        "tags": [],
        "content_html": "<h1>你好</h1><p>欢迎阅读。</p>",
        "previous_post": null,
        "next_post": null
    }
}
```

失败：HTTP 404（资源不存在），JSON 示例：

```json
{
    "code": -1,
    "msg": "Post not found",
    "data": {}
}
```

### 3.4. 标签下的文章

`GET` `/api/v1/public/tags/{slug}/posts`

不要求当前登录会话。

仅返回已发布文章数组，不含 total。page_size 省略时读取站点配置；不存在的标签返回 404。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| slug | string | 是 | — | path；URL 标识；路径中的中文请进行 URL 编码 |
| page | int | 否 | `1` | query；页码，从 1 开始；最小值：1 |
| page_size | int / null | 否 | — | query；每页数量；最小值：1；最大值：50；允许 null；是否清空以本接口业务说明为准 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | array<object> | — | 业务数据 |
| └id | int | — | 记录 ID |
| └title | string | — | 标题 |
| └slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └excerpt | string / null | — | 摘要；允许 null；是否清空以本接口业务说明为准 |
| └cover_url | string / null | — | 文章封面 URL；允许 null；是否清空以本接口业务说明为准 |
| └published_at | string / null | — | 发布时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └is_pinned | bool | `false` | 是否置顶 |
| └tags | array<object> | `[]` | 标签列表 |
| └└id | int | — | 记录 ID |
| └└name | string | — | 名称 |
| └└slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": [
        {
            "id": 1,
            "title": "第一篇文章",
            "slug": "hello-xblog",
            "excerpt": null,
            "cover_url": null,
            "published_at": null,
            "is_pinned": false,
            "tags": []
        }
    ]
}
```

失败：HTTP 404（资源不存在），JSON 示例：

```json
{
    "code": -1,
    "msg": "Tag not found",
    "data": {}
}
```

### 3.5. 公开固定页

`GET` `/api/v1/public/pages/{slug}`

不要求当前登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| slug | string | 是 | — | path；URL 标识；路径中的中文请进行 URL 编码 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └title | string | — | 标题 |
| └content_html | string | — | 服务端渲染的 HTML |
| └updated_at | string / null | — | 更新时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "slug": "hello-xblog",
        "title": "第一篇文章",
        "content_html": "<h1>你好</h1><p>欢迎阅读。</p>",
        "updated_at": null
    }
}
```

失败：HTTP 404（资源不存在），JSON 示例：

```json
{
    "code": -1,
    "msg": "Page not found",
    "data": {}
}
```

### 3.6. 公开友链列表

`GET` `/api/v1/public/links`

不要求当前登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | array<object> | — | 业务数据 |
| └id | int | — | 记录 ID |
| └name | string | — | 名称 |
| └url | string | — | 目标 URL |
| └logo_url | string / null | — | 友链 LOGO URL；允许 null；是否清空以本接口业务说明为准 |
| └description | string / null | — | 描述；允许 null；是否清空以本接口业务说明为准 |
| └sort_order | int | — | 排序权重，升序排列 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": [
        {
            "id": 1,
            "name": "示例",
            "url": "https://example.com",
            "logo_url": null,
            "description": null,
            "sort_order": 0
        }
    ]
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.7. 站内搜索

`GET` `/api/v1/public/search`

不要求当前登录会话。

使用 ILIKE 匹配标题、slug、摘要、Markdown 和标签名称/slug；只检索 published。按发布时间、ID 降序。返回数组，不返回 total；不是 PostgreSQL 全文检索。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| q | string | 是 | — | query；搜索关键词；最短长度：1；最长长度：200 |
| page | int | 否 | `1` | query；页码，从 1 开始；最小值：1 |
| page_size | int | 否 | `10` | query；每页数量；最小值：1；最大值：50 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | array<object> | — | 业务数据 |
| └id | int | — | 记录 ID |
| └title | string | — | 标题 |
| └slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └excerpt | string / null | — | 摘要；允许 null；是否清空以本接口业务说明为准 |
| └cover_url | string / null | — | 文章封面 URL；允许 null；是否清空以本接口业务说明为准 |
| └published_at | string / null | — | 发布时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └is_pinned | bool | `false` | 是否置顶 |
| └tags | array<object> | `[]` | 标签列表 |
| └└id | int | — | 记录 ID |
| └└name | string | — | 名称 |
| └└slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": [
        {
            "id": 1,
            "title": "第一篇文章",
            "slug": "hello-xblog",
            "excerpt": null,
            "cover_url": null,
            "published_at": null,
            "is_pinned": false,
            "tags": []
        }
    ]
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.8. 记录访问量

`POST` `/api/v1/public/pageviews`

不要求当前登录会话。

这是当前实现的匿名写入例外，仅记录访问量；不能用于内容管理。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| path | string | 是 | — | 访问路径；最短长度：1；最长长度：500 |
| referrer | string / null | 否 | — | 来源地址；最长长度：500；允许 null；是否清空以本接口业务说明为准 |

请求 JSON 示例：

```json
{
    "path": "/blog/hello-xblog",
    "referrer": null
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └message | string | — | 业务结果说明 |

成功：HTTP 201，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "message": "ok"
    }
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.9. 公开站点主题

`GET` `/api/v1/public/site-theme`

不要求当前登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └mode | string | — | 公开站明暗模式；light=浅色<br>dark=深色 |
| └palette | string | — | 公开站配色；editorial=墨纸<br>forest=深林<br>slate=冷灰<br>ink=夜读<br>graphite=石墨<br>ocean=海境<br>rose=暮玫 |
| └site_name | string | `"xblog"` | 站点名称 |
| └site_tagline | string | `"Ink & Paper"` | 站点副标题 |
| └site_logo_url | string / null | — | 站点 LOGO 地址；允许 null；是否清空以本接口业务说明为准 |
| └site_icp_number | string / null | — | 备案号；允许 null；是否清空以本接口业务说明为准 |
| └posts_per_page | int | `10` | 公开文章列表默认页大小 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "mode": "light",
        "palette": "editorial",
        "site_name": "xblog",
        "site_tagline": "Ink & Paper",
        "site_logo_url": null,
        "site_icp_number": null,
        "posts_per_page": 10
    }
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.10. 查询登录防护状态

`GET` `/api/v1/auth/login-guard`

不要求当前登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| username | string / null | 否 | — | query；登录标识（登录请求支持用户名、邮箱或手机号；响应为用户名）；允许 null；是否清空以本接口业务说明为准 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └captcha_required | bool | — | 当前请求是否需要验证码 |
| └captcha_enabled | bool | — | 验证码防护是否启用 |
| └site_key | string / null | — | 公开的 Turnstile Site Key；允许 null；是否清空以本接口业务说明为准 |
| └locked | bool | — | 是否处于登录锁定期 |
| └retry_after_seconds | int / null | — | 建议等待秒数；允许 null；是否清空以本接口业务说明为准 |
| └failure_count | int | — | 累计失败次数 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "captcha_required": false,
        "captcha_enabled": false,
        "site_key": null,
        "locked": false,
        "retry_after_seconds": null,
        "failure_count": 0
    }
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.11. 密码登录

`POST` `/api/v1/auth/login`

不要求当前登录会话。

用户名字段也支持邮箱和手机号。成功通过 Set-Cookie 写入令牌，不在 JSON 返回 token；防护启用且达到失败阈值时必须提交 turnstile_token。默认 15 分钟内失败 3 次触发验证码、10 次锁定；以服务端配置为准。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| username | string | 是 | — | 登录标识（登录请求支持用户名、邮箱或手机号；响应为用户名）；最短长度：1；最长长度：255 |
| password | string | 是 | — | 密码；最短长度：1；最长长度：128 |
| turnstile_token | string / null | 否 | — | Turnstile 验证令牌；最长长度：4096；允许 null；是否清空以本接口业务说明为准 |

请求 JSON 示例：

```json
{
    "username": "writer",
    "password": "ExamplePassword123!",
    "turnstile_token": null
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └username | string | — | 登录标识（登录请求支持用户名、邮箱或手机号；响应为用户名） |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "username": "writer"
    }
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.12. 退出登录

`POST` `/api/v1/auth/logout`

不要求当前登录会话。

清除 access/refresh Cookie；中间件把声明的 204 转成 HTTP 200 和空 data。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {}
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.13. 刷新登录会话

`POST` `/api/v1/auth/refresh`

不要求有效 access 令牌，但必须提供有效 refresh 令牌。

必须有有效 xblog_refresh；成功重写 access/refresh Cookie。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 携带下面列出的 Cookie |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └username | string | — | 登录标识（登录请求支持用户名、邮箱或手机号；响应为用户名） |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "username": "writer"
    }
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.14. 当前用户资料

`GET` `/api/v1/auth/me`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └username | string | — | 登录标识（登录请求支持用户名、邮箱或手机号；响应为用户名） |
| └nickname | string / null | — | 昵称；更新时去除首尾空白，空字符串归为 null；允许 null；是否清空以本接口业务说明为准 |
| └avatar_url | string / null | — | 头像 URL；允许 null；是否清空以本接口业务说明为准 |
| └phone | string / null | — | 手机号；业务规范化为 1 开头的 11 位号码，可带 +86 前缀；允许 null；是否清空以本接口业务说明为准 |
| └email | string / null | — | 邮箱地址；允许 null；是否清空以本接口业务说明为准 |
| └birth_date | string / null | — | 出生日期；不得为未来日期；格式：date；允许 null；是否清空以本接口业务说明为准 |
| └gender | string / null | — | 性别；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "username": "writer",
        "nickname": null,
        "avatar_url": null,
        "phone": null,
        "email": null,
        "birth_date": null,
        "gender": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.15. 绑定手机号

`PATCH` `/api/v1/auth/phone`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| phone | string | 是 | — | 手机号；业务规范化为 1 开头的 11 位号码，可带 +86 前缀；最短长度：6；最长长度：20 |

请求 JSON 示例：

```json
{
    "phone": "13800000000"
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └username | string | — | 登录标识（登录请求支持用户名、邮箱或手机号；响应为用户名） |
| └nickname | string / null | — | 昵称；更新时去除首尾空白，空字符串归为 null；允许 null；是否清空以本接口业务说明为准 |
| └avatar_url | string / null | — | 头像 URL；允许 null；是否清空以本接口业务说明为准 |
| └phone | string / null | — | 手机号；业务规范化为 1 开头的 11 位号码，可带 +86 前缀；允许 null；是否清空以本接口业务说明为准 |
| └email | string / null | — | 邮箱地址；允许 null；是否清空以本接口业务说明为准 |
| └birth_date | string / null | — | 出生日期；不得为未来日期；格式：date；允许 null；是否清空以本接口业务说明为准 |
| └gender | string / null | — | 性别；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "username": "writer",
        "nickname": null,
        "avatar_url": null,
        "phone": null,
        "email": null,
        "birth_date": null,
        "gender": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.16. 绑定邮箱

`PATCH` `/api/v1/auth/email`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| email | string | 是 | — | 邮箱地址；最长长度：255；格式：email |

请求 JSON 示例：

```json
{
    "email": "writer@example.com"
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └username | string | — | 登录标识（登录请求支持用户名、邮箱或手机号；响应为用户名） |
| └nickname | string / null | — | 昵称；更新时去除首尾空白，空字符串归为 null；允许 null；是否清空以本接口业务说明为准 |
| └avatar_url | string / null | — | 头像 URL；允许 null；是否清空以本接口业务说明为准 |
| └phone | string / null | — | 手机号；业务规范化为 1 开头的 11 位号码，可带 +86 前缀；允许 null；是否清空以本接口业务说明为准 |
| └email | string / null | — | 邮箱地址；允许 null；是否清空以本接口业务说明为准 |
| └birth_date | string / null | — | 出生日期；不得为未来日期；格式：date；允许 null；是否清空以本接口业务说明为准 |
| └gender | string / null | — | 性别；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "username": "writer",
        "nickname": null,
        "avatar_url": null,
        "phone": null,
        "email": null,
        "birth_date": null,
        "gender": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.17. 更新个人资料

`PATCH` `/api/v1/auth/profile`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| nickname | string / null | 否 | — | 昵称；更新时去除首尾空白，空字符串归为 null；最长长度：50；允许 null；是否清空以本接口业务说明为准 |
| birth_date | string / null | 否 | — | 出生日期；不得为未来日期；格式：date；允许 null；是否清空以本接口业务说明为准 |
| gender | string / null | 否 | — | 性别；male=男<br>female=女<br>other=其他；允许 null；是否清空以本接口业务说明为准 |

请求 JSON 示例：

```json
{
    "nickname": null,
    "birth_date": null,
    "gender": null
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └username | string | — | 登录标识（登录请求支持用户名、邮箱或手机号；响应为用户名） |
| └nickname | string / null | — | 昵称；更新时去除首尾空白，空字符串归为 null；允许 null；是否清空以本接口业务说明为准 |
| └avatar_url | string / null | — | 头像 URL；允许 null；是否清空以本接口业务说明为准 |
| └phone | string / null | — | 手机号；业务规范化为 1 开头的 11 位号码，可带 +86 前缀；允许 null；是否清空以本接口业务说明为准 |
| └email | string / null | — | 邮箱地址；允许 null；是否清空以本接口业务说明为准 |
| └birth_date | string / null | — | 出生日期；不得为未来日期；格式：date；允许 null；是否清空以本接口业务说明为准 |
| └gender | string / null | — | 性别；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "username": "writer",
        "nickname": null,
        "avatar_url": null,
        "phone": null,
        "email": null,
        "birth_date": null,
        "gender": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.18. 上传头像

`POST` `/api/v1/auth/avatar`

需要有效登录会话。

图片支持 JPEG、PNG、WebP、GIF，非空且最大 5 MiB。上传或删除直接更新当前用户头像。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `multipart/form-data`；由客户端生成 boundary |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request form` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| file | string | 是 | — | 上传文件二进制 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └avatar_url | string | — | 头像 URL |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "avatar_url": "示例文本"
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.19. 删除头像

`DELETE` `/api/v1/auth/avatar`

需要有效登录会话。

图片支持 JPEG、PNG、WebP、GIF，非空且最大 5 MiB。上传或删除直接更新当前用户头像。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {}
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.20. 修改密码

`POST` `/api/v1/auth/change-password`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| current_password | string | 是 | — | 当前密码；最短长度：1；最长长度：128 |
| new_password | string | 是 | — | 新密码；最短长度：8；最长长度：128 |

请求 JSON 示例：

```json
{
    "current_password": "ExamplePassword123!",
    "new_password": "ExamplePassword123!"
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {}
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.21. 查询 OAuth 提供商

`GET` `/api/v1/auth/oauth/providers`

不要求当前登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └github | bool | — | GitHub 登录是否可用 |
| └wechat | bool | — | 微信 登录是否可用 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "github": false,
        "wechat": false
    }
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.22. 查询 OAuth 绑定状态

`GET` `/api/v1/auth/oauth/links`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └github | bool | — | GitHub 登录是否可用 |
| └wechat | bool | — | 微信 登录是否可用 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "github": false,
        "wechat": false
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.23. 申请密码重置

`POST` `/api/v1/auth/forgot-password`

不要求当前登录会话。

按用户名申请；防护启用时必须完成 Turnstile，默认每 IP 15 分钟 3 次。邮件需要 SMTP 配置；响应不用于枚举账号。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| username | string | 是 | — | 登录标识（登录请求支持用户名、邮箱或手机号；响应为用户名）；最短长度：1；最长长度：50 |
| turnstile_token | string / null | 否 | — | Turnstile 验证令牌；最长长度：4096；允许 null；是否清空以本接口业务说明为准 |

请求 JSON 示例：

```json
{
    "username": "writer",
    "turnstile_token": null
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └message | string | — | 业务结果说明 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "message": "ok"
    }
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.24. 重置密码

`POST` `/api/v1/auth/reset-password`

不要求当前登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| token | string | 是 | — | 密码重置令牌；最短长度：16；最长长度：256 |
| new_password | string | 是 | — | 新密码；最短长度：8；最长长度：128 |

请求 JSON 示例：

```json
{
    "token": "example-reset-token-not-valid",
    "new_password": "ExamplePassword123!"
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {}
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.25. 开始 GitHub 登录

`GET` `/api/v1/auth/oauth/github/start`

不要求当前登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数（HTTP 302 响应头，无 JSON body）：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| Location | string | — | 提供商授权地址，包含生成的 state |
| Set-Cookie | string | — | 写入 xblog_oauth_state，有效期 600 秒 |

成功：HTTP 302，无成功 JSON 示例，客户端跟随 Location。

失败：HTTP 503，提供商未启用。

```json
{
    "code": -1,
    "msg": "GitHub login is disabled",
    "data": {}
}
```

### 3.26. 开始 GitHub 绑定

`GET` `/api/v1/auth/oauth/github/bind/start`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数（HTTP 302 响应头，无 JSON body）：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| Location | string | — | 提供商授权地址，包含生成的 state |
| Set-Cookie | string | — | 写入 xblog_oauth_state，有效期 600 秒 |

成功：HTTP 302，无成功 JSON 示例，客户端跟随 Location。

失败：HTTP 503，提供商未启用。

```json
{
    "code": -1,
    "msg": "GitHub login is disabled",
    "data": {}
}
```

### 3.27. GitHub 回调

`GET` `/api/v1/auth/oauth/github/callback`

不要求当前登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 否 | — | 携带下面列出的 Cookie |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| code | string / null | 否 | — | query；OAuth 授权码；正常回调必须存在 |
| state | string / null | 否 | — | query；OAuth state；正常回调必须存在 |
| xblog_oauth_state | string / null | 否 | — | cookie；OAuth 状态 Cookie |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数（HTTP 302 响应头，无 JSON body）：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| Location | string | — | 登录成功跳转 /admin/dashboard?login=success&username=...；绑定成功跳转 /admin/profile?oauth=bound |
| Set-Cookie | string | — | 登录成功写入会话 Cookie；清理 OAuth 状态 Cookie |

成功：HTTP 302，无成功 JSON 示例，客户端跟随 Location。

失败：业务失败仍为 HTTP 302，无失败 JSON body；跳转登录页或资料页，`error` 枚举：`oauth_failed=授权失败`、`oauth_not_linked=未绑定`、`oauth_already_linked=已绑定其他账号`。未捕获的服务端异常才返回 HTTP 500：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.28. 开始微信登录

`GET` `/api/v1/auth/oauth/wechat/start`

不要求当前登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数（HTTP 302 响应头，无 JSON body）：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| Location | string | — | 提供商授权地址，包含生成的 state |
| Set-Cookie | string | — | 写入 xblog_oauth_state，有效期 600 秒 |

成功：HTTP 302，无成功 JSON 示例，客户端跟随 Location。

失败：HTTP 503，提供商未启用。

```json
{
    "code": -1,
    "msg": "WeChat login is disabled",
    "data": {}
}
```

### 3.29. 开始微信绑定

`GET` `/api/v1/auth/oauth/wechat/bind/start`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数（HTTP 302 响应头，无 JSON body）：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| Location | string | — | 提供商授权地址，包含生成的 state |
| Set-Cookie | string | — | 写入 xblog_oauth_state，有效期 600 秒 |

成功：HTTP 302，无成功 JSON 示例，客户端跟随 Location。

失败：HTTP 503，提供商未启用。

```json
{
    "code": -1,
    "msg": "WeChat login is disabled",
    "data": {}
}
```

### 3.30. 微信回调

`GET` `/api/v1/auth/oauth/wechat/callback`

不要求当前登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 否 | — | 携带下面列出的 Cookie |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| code | string / null | 否 | — | query；OAuth 授权码；正常回调必须存在 |
| state | string / null | 否 | — | query；OAuth state；正常回调必须存在 |
| xblog_oauth_state | string / null | 否 | — | cookie；OAuth 状态 Cookie |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数（HTTP 302 响应头，无 JSON body）：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| Location | string | — | 登录成功跳转 /admin/dashboard?login=success&username=...；绑定成功跳转 /admin/profile?oauth=bound |
| Set-Cookie | string | — | 登录成功写入会话 Cookie；清理 OAuth 状态 Cookie |

成功：HTTP 302，无成功 JSON 示例，客户端跟随 Location。

失败：业务失败仍为 HTTP 302，无失败 JSON body；跳转登录页或资料页，`error` 枚举：`oauth_failed=授权失败`、`oauth_not_linked=未绑定`、`oauth_already_linked=已绑定其他账号`。未捕获的服务端异常才返回 HTTP 500：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.31. 查询登录方式

`GET` `/api/v1/auth/login-methods`

不要求当前登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └sms | bool | `false` | 短信 登录是否可用 |
| └github | bool | `false` | GitHub 登录是否可用 |
| └wechat | bool | `false` | 微信 登录是否可用 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "sms": false,
        "github": false,
        "wechat": false
    }
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.32. 发送短信验证码

`POST` `/api/v1/auth/sms/send-code`

不要求当前登录会话。

手机号必须已绑定管理员；默认发送间隔 60 秒、有效期 5 分钟。当前 dev 和 aliyun 分支均只记录日志，aliyun 尚未真正调用短信 API，不能当作生产短信发送。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| phone | string | 是 | — | 手机号；业务规范化为 1 开头的 11 位号码，可带 +86 前缀；最短长度：6；最长长度：20 |

请求 JSON 示例：

```json
{
    "phone": "13800000000"
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └message | string | — | 业务结果说明 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "message": "ok"
    }
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.33. 短信登录

`POST` `/api/v1/auth/sms/login`

不要求当前登录会话。

校验六位验证码并写入登录 Cookie。账号禁用返回 403。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| phone | string | 是 | — | 手机号；业务规范化为 1 开头的 11 位号码，可带 +86 前缀；最短长度：6；最长长度：20 |
| code | string | 是 | — | 六位短信验证码；最短长度：6；最长长度：6 |

请求 JSON 示例：

```json
{
    "phone": "13800000000",
    "code": "123456"
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └username | string | — | 登录标识（登录请求支持用户名、邮箱或手机号；响应为用户名） |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "username": "writer"
    }
}
```

失败：HTTP 500（服务端未处理异常），JSON 示例：

```json
{
    "code": -1,
    "msg": "服务器内部错误",
    "data": {}
}
```

### 3.34. 管理文章列表

`GET` `/api/v1/admin/posts`

需要有效登录会话。

status 业务枚举：draft=草稿、published=已发布。创建时 slug 唯一，冲突为 409；tag_slugs 可自动创建标签。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| page | int | 否 | `1` | query；页码，从 1 开始；最小值：1 |
| page_size | int | 否 | `20` | query；每页数量；最小值：1；最大值：100 |
| q | string / null | 否 | — | query；搜索关键词；最长长度：200；允许 null；是否清空以本接口业务说明为准 |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └items | array<object> | — | 当前页记录列表 |
| └└id | int | — | 记录 ID |
| └└title | string | — | 标题 |
| └└slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └└excerpt | string / null | — | 摘要；允许 null；是否清空以本接口业务说明为准 |
| └└cover_url | string / null | — | 文章封面 URL；允许 null；是否清空以本接口业务说明为准 |
| └└published_at | string / null | — | 发布时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └└is_pinned | bool | `false` | 是否置顶 |
| └└tags | array<object> | `[]` | 标签列表 |
| └└└id | int | — | 记录 ID |
| └└└name | string | — | 名称 |
| └└└slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └└content_md | string | — | Markdown 原文 |
| └└status | string | — | 状态；draft=草稿<br>published=已发布 |
| └└created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └└updated_at | string / null | — | 更新时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └total | int | — | 匹配记录总数 |
| └page | int | — | 页码，从 1 开始 |
| └page_size | int | — | 每页数量 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "items": [
            {
                "id": 1,
                "title": "第一篇文章",
                "slug": "hello-xblog",
                "excerpt": null,
                "cover_url": null,
                "published_at": null,
                "is_pinned": false,
                "tags": [],
                "content_md": "# 你好\n\n欢迎阅读。",
                "status": "draft",
                "created_at": null,
                "updated_at": null
            }
        ],
        "total": 1,
        "page": 1,
        "page_size": 10
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.35. 创建文章

`POST` `/api/v1/admin/posts`

需要有效登录会话。

status 业务枚举：draft=草稿、published=已发布。创建时 slug 唯一，冲突为 409；tag_slugs 可自动创建标签。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| title | string | 是 | — | 标题；最短长度：1；最长长度：200 |
| slug | string | 是 | — | URL 标识；路径中的中文请进行 URL 编码；最短长度：1；最长长度：200 |
| content_md | string | 否 | `""` | Markdown 原文 |
| excerpt | string / null | 否 | — | 摘要；最长长度：500；允许 null；是否清空以本接口业务说明为准 |
| cover_url | string / null | 否 | — | 文章封面 URL；最长长度：500；允许 null；是否清空以本接口业务说明为准 |
| status | string | 否 | `"draft"` | 状态；draft=草稿<br>published=已发布 |
| tag_slugs | array<string> | 否 | `[]` | 标签标识列表；保存时同步标签关系 |
| is_pinned | bool | 否 | `false` | 是否置顶 |

请求 JSON 示例：

```json
{
    "title": "第一篇文章",
    "slug": "hello-xblog",
    "content_md": "",
    "excerpt": null,
    "cover_url": null,
    "status": "draft",
    "tag_slugs": [],
    "is_pinned": false
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └id | int | — | 记录 ID |
| └title | string | — | 标题 |
| └slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └excerpt | string / null | — | 摘要；允许 null；是否清空以本接口业务说明为准 |
| └cover_url | string / null | — | 文章封面 URL；允许 null；是否清空以本接口业务说明为准 |
| └published_at | string / null | — | 发布时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └is_pinned | bool | `false` | 是否置顶 |
| └tags | array<object> | `[]` | 标签列表 |
| └└id | int | — | 记录 ID |
| └└name | string | — | 名称 |
| └└slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └content_md | string | — | Markdown 原文 |
| └status | string | — | 状态；draft=草稿<br>published=已发布 |
| └created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └updated_at | string / null | — | 更新时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 201，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "id": 1,
        "title": "第一篇文章",
        "slug": "hello-xblog",
        "excerpt": null,
        "cover_url": null,
        "published_at": null,
        "is_pinned": false,
        "tags": [],
        "content_md": "# 你好\n\n欢迎阅读。",
        "status": "draft",
        "created_at": null,
        "updated_at": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.36. 文章统计

`GET` `/api/v1/admin/posts/stats`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └total | int | — | 匹配记录总数 |
| └published | int | — | 已发布数量 |
| └draft | int | — | 草稿数量 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "total": 1,
        "published": 0,
        "draft": 0
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.37. 管理文章详情

`GET` `/api/v1/admin/posts/{post_id}`

需要有效登录会话。

status 业务枚举：draft=草稿、published=已发布。PATCH 省略字段保留原值；cover_url=null 或空字符串会移除封面并清理旧 managed 文件；excerpt=null 不清空。首次发布自动设置 published_at。删除会清理 managed 封面。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| post_id | int | 是 | — | path；文章 ID |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └id | int | — | 记录 ID |
| └title | string | — | 标题 |
| └slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └excerpt | string / null | — | 摘要；允许 null；是否清空以本接口业务说明为准 |
| └cover_url | string / null | — | 文章封面 URL；允许 null；是否清空以本接口业务说明为准 |
| └published_at | string / null | — | 发布时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └is_pinned | bool | `false` | 是否置顶 |
| └tags | array<object> | `[]` | 标签列表 |
| └└id | int | — | 记录 ID |
| └└name | string | — | 名称 |
| └└slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └content_md | string | — | Markdown 原文 |
| └status | string | — | 状态；draft=草稿<br>published=已发布 |
| └created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └updated_at | string / null | — | 更新时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "id": 1,
        "title": "第一篇文章",
        "slug": "hello-xblog",
        "excerpt": null,
        "cover_url": null,
        "published_at": null,
        "is_pinned": false,
        "tags": [],
        "content_md": "# 你好\n\n欢迎阅读。",
        "status": "draft",
        "created_at": null,
        "updated_at": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.38. 更新文章

`PATCH` `/api/v1/admin/posts/{post_id}`

需要有效登录会话。

status 业务枚举：draft=草稿、published=已发布。PATCH 省略字段保留原值；cover_url=null 或空字符串会移除封面并清理旧 managed 文件；excerpt=null 不清空。首次发布自动设置 published_at。删除会清理 managed 封面。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| post_id | int | 是 | — | path；文章 ID |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| title | string / null | 否 | — | 标题；最短长度：1；最长长度：200；允许 null；是否清空以本接口业务说明为准 |
| slug | string / null | 否 | — | URL 标识；路径中的中文请进行 URL 编码；最短长度：1；最长长度：200；允许 null；是否清空以本接口业务说明为准 |
| content_md | string / null | 否 | — | Markdown 原文；允许 null；是否清空以本接口业务说明为准 |
| excerpt | string / null | 否 | — | 摘要；最长长度：500；允许 null；是否清空以本接口业务说明为准 |
| cover_url | string / null | 否 | — | 文章封面 URL；最长长度：500；允许 null；是否清空以本接口业务说明为准 |
| status | string / null | 否 | — | 状态；draft=草稿<br>published=已发布；允许 null；是否清空以本接口业务说明为准 |
| tag_slugs | array<string> / null | 否 | `[]` | 标签标识列表；保存时同步标签关系；允许 null；是否清空以本接口业务说明为准 |
| is_pinned | bool / null | 否 | — | 是否置顶；允许 null；是否清空以本接口业务说明为准 |

请求 JSON 示例：

```json
{
    "title": null,
    "slug": null,
    "content_md": null,
    "excerpt": null,
    "cover_url": null,
    "status": null,
    "tag_slugs": null,
    "is_pinned": null
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └id | int | — | 记录 ID |
| └title | string | — | 标题 |
| └slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └excerpt | string / null | — | 摘要；允许 null；是否清空以本接口业务说明为准 |
| └cover_url | string / null | — | 文章封面 URL；允许 null；是否清空以本接口业务说明为准 |
| └published_at | string / null | — | 发布时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └is_pinned | bool | `false` | 是否置顶 |
| └tags | array<object> | `[]` | 标签列表 |
| └└id | int | — | 记录 ID |
| └└name | string | — | 名称 |
| └└slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └content_md | string | — | Markdown 原文 |
| └status | string | — | 状态；draft=草稿<br>published=已发布 |
| └created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └updated_at | string / null | — | 更新时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "id": 1,
        "title": "第一篇文章",
        "slug": "hello-xblog",
        "excerpt": null,
        "cover_url": null,
        "published_at": null,
        "is_pinned": false,
        "tags": [],
        "content_md": "# 你好\n\n欢迎阅读。",
        "status": "draft",
        "created_at": null,
        "updated_at": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.39. 删除文章

`DELETE` `/api/v1/admin/posts/{post_id}`

需要有效登录会话。

status 业务枚举：draft=草稿、published=已发布。PATCH 省略字段保留原值；cover_url=null 或空字符串会移除封面并清理旧 managed 文件；excerpt=null 不清空。首次发布自动设置 published_at。删除会清理 managed 封面。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| post_id | int | 是 | — | path；文章 ID |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └message | string | — | 业务结果说明 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "message": "deleted"
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.40. 上传文章封面

`POST` `/api/v1/admin/posts/cover`

需要有效登录会话。

图片支持 JPEG、PNG、WebP、GIF，非空且最大 5 MiB。上传只返回 URL，需要保存文章才形成引用。DELETE 仅接受 managed 封面 URL，调用前应确认该文件尚未被文章引用。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `multipart/form-data`；由客户端生成 boundary |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request form` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| file | string | 是 | — | 上传文件二进制 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └cover_url | string | — | 文章封面 URL |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "cover_url": "示例文本"
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.41. 删除未保存封面

`DELETE` `/api/v1/admin/posts/cover`

需要有效登录会话。

图片支持 JPEG、PNG、WebP、GIF，非空且最大 5 MiB。上传只返回 URL，需要保存文章才形成引用。DELETE 仅接受 managed 封面 URL，调用前应确认该文件尚未被文章引用。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| cover_url | string | 是 | — | query；文章封面 URL；最短长度：1 |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └message | string | — | 业务结果说明 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "message": "deleted"
    }
}
```

失败：HTTP 400（URL 不属于 managed 封面目录）。

```json
{
    "code": -1,
    "msg": "Not a managed cover URL",
    "data": {}
}
```

### 3.42. 管理固定页详情

`GET` `/api/v1/admin/pages/{slug}`

需要有效登录会话。

仅操作已有固定页；缺失时返回 404，可先通过 seed-pages 创建 about/projects。PATCH 省略或 null 不更新该字段。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| slug | string | 是 | — | path；URL 标识；路径中的中文请进行 URL 编码 |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └title | string | — | 标题 |
| └content_md | string | — | Markdown 原文 |
| └updated_at | string / null | — | 更新时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "slug": "hello-xblog",
        "title": "第一篇文章",
        "content_md": "# 你好\n\n欢迎阅读。",
        "updated_at": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.43. 更新固定页

`PATCH` `/api/v1/admin/pages/{slug}`

需要有效登录会话。

仅操作已有固定页；缺失时返回 404，可先通过 seed-pages 创建 about/projects。PATCH 省略或 null 不更新该字段。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| slug | string | 是 | — | path；URL 标识；路径中的中文请进行 URL 编码 |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| title | string / null | 否 | — | 标题；最短长度：1；最长长度：200；允许 null；是否清空以本接口业务说明为准 |
| content_md | string / null | 否 | — | Markdown 原文；允许 null；是否清空以本接口业务说明为准 |

请求 JSON 示例：

```json
{
    "title": null,
    "content_md": null
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └slug | string | — | URL 标识；路径中的中文请进行 URL 编码 |
| └title | string | — | 标题 |
| └content_md | string | — | Markdown 原文 |
| └updated_at | string / null | — | 更新时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "slug": "hello-xblog",
        "title": "第一篇文章",
        "content_md": "# 你好\n\n欢迎阅读。",
        "updated_at": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.44. 管理友链列表

`GET` `/api/v1/admin/links`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | array<object> | — | 业务数据 |
| └id | int | — | 记录 ID |
| └name | string | — | 名称 |
| └url | string | — | 目标 URL |
| └logo_url | string / null | — | 友链 LOGO URL；允许 null；是否清空以本接口业务说明为准 |
| └description | string / null | — | 描述；允许 null；是否清空以本接口业务说明为准 |
| └sort_order | int | — | 排序权重，升序排列 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": [
        {
            "id": 1,
            "name": "示例",
            "url": "https://example.com",
            "logo_url": null,
            "description": null,
            "sort_order": 0
        }
    ]
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.45. 创建友链

`POST` `/api/v1/admin/links`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| name | string | 是 | — | 名称；最短长度：1；最长长度：100 |
| url | string | 是 | — | 目标 URL；最短长度：1；最长长度：500 |
| logo_url | string | 是 | — | 友链 LOGO URL；最短长度：1；最长长度：500 |
| description | string / null | 否 | — | 描述；最长长度：500；允许 null；是否清空以本接口业务说明为准 |
| sort_order | int | 否 | `0` | 排序权重，升序排列 |

请求 JSON 示例：

```json
{
    "name": "示例",
    "url": "https://example.com",
    "logo_url": "https://example.com/logo.png",
    "description": null,
    "sort_order": 0
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └id | int | — | 记录 ID |
| └name | string | — | 名称 |
| └url | string | — | 目标 URL |
| └logo_url | string / null | — | 友链 LOGO URL；允许 null；是否清空以本接口业务说明为准 |
| └description | string / null | — | 描述；允许 null；是否清空以本接口业务说明为准 |
| └sort_order | int | — | 排序权重，升序排列 |

成功：HTTP 201，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "id": 1,
        "name": "示例",
        "url": "https://example.com",
        "logo_url": null,
        "description": null,
        "sort_order": 0
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.46. 上传友链 LOGO

`POST` `/api/v1/admin/links/logo`

需要有效登录会话。

图片支持 JPEG、PNG、WebP、GIF，非空且最大 5 MiB；上传后需保存友链。DELETE 只接受 managed URL。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `multipart/form-data`；由客户端生成 boundary |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request form` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| file | string | 是 | — | 上传文件二进制 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └logo_url | string | — | 友链 LOGO URL |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "logo_url": "示例文本"
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.47. 删除未保存友链 LOGO

`DELETE` `/api/v1/admin/links/logo`

需要有效登录会话。

图片支持 JPEG、PNG、WebP、GIF，非空且最大 5 MiB；上传后需保存友链。DELETE 只接受 managed URL。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| logo_url | string | 是 | — | query；友链 LOGO URL；最短长度：1 |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └message | string | — | 业务结果说明 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "message": "deleted"
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.48. 更新友链

`PATCH` `/api/v1/admin/links/{link_id}`

需要有效登录会话。

仅提交需要变更的字段。当前实现会直接赋值显式 null；name/url/sort_order 不应传 null，否则可能触发数据库约束错误。logo_url=null 会清空引用，但旧文件不在该分支即时删除，由孤儿清理兜底。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| link_id | int | 是 | — | path；友链 ID |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| name | string / null | 否 | — | 名称；最短长度：1；最长长度：100；允许 null；是否清空以本接口业务说明为准 |
| url | string / null | 否 | — | 目标 URL；最短长度：1；最长长度：500；允许 null；是否清空以本接口业务说明为准 |
| logo_url | string / null | 否 | — | 友链 LOGO URL；最短长度：1；最长长度：500；允许 null；是否清空以本接口业务说明为准 |
| description | string / null | 否 | — | 描述；最长长度：500；允许 null；是否清空以本接口业务说明为准 |
| sort_order | int / null | 否 | — | 排序权重，升序排列；允许 null；是否清空以本接口业务说明为准 |

请求 JSON 示例：

```json
{
    "name": "示例站点",
    "url": "https://example.com",
    "logo_url": "https://example.com/logo.png",
    "description": "站点简介",
    "sort_order": 0
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └id | int | — | 记录 ID |
| └name | string | — | 名称 |
| └url | string | — | 目标 URL |
| └logo_url | string / null | — | 友链 LOGO URL；允许 null；是否清空以本接口业务说明为准 |
| └description | string / null | — | 描述；允许 null；是否清空以本接口业务说明为准 |
| └sort_order | int | — | 排序权重，升序排列 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "id": 1,
        "name": "示例",
        "url": "https://example.com",
        "logo_url": null,
        "description": null,
        "sort_order": 0
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.49. 删除友链

`DELETE` `/api/v1/admin/links/{link_id}`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| link_id | int | 是 | — | path；友链 ID |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └message | string | — | 业务结果说明 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "message": "deleted"
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.50. 访问量统计

`GET` `/api/v1/admin/pageviews`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | array<object> | — | 业务数据 |
| └path | string | — | 访问路径 |
| └count | int | — | 访问次数 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": [
        {
            "path": "/blog/hello-xblog",
            "count": 0
        }
    ]
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.51. 用户列表

`GET` `/api/v1/admin/users`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| page | int | 否 | `1` | query；页码，从 1 开始；最小值：1 |
| page_size | int | 否 | `20` | query；每页数量；最小值：1；最大值：100 |
| q | string / null | 否 | — | query；搜索关键词；最长长度：200；允许 null；是否清空以本接口业务说明为准 |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └items | array<object> | — | 当前页记录列表 |
| └└id | int | — | 记录 ID |
| └└username | string | — | 登录标识（登录请求支持用户名、邮箱或手机号；响应为用户名） |
| └└nickname | string / null | — | 昵称；更新时去除首尾空白，空字符串归为 null；允许 null；是否清空以本接口业务说明为准 |
| └└email | string / null | — | 邮箱地址；允许 null；是否清空以本接口业务说明为准 |
| └└phone | string / null | — | 手机号；业务规范化为 1 开头的 11 位号码，可带 +86 前缀；允许 null；是否清空以本接口业务说明为准 |
| └└birth_date | string / null | — | 出生日期；不得为未来日期；格式：date；允许 null；是否清空以本接口业务说明为准 |
| └└gender | string / null | — | 性别；允许 null；是否清空以本接口业务说明为准 |
| └└avatar_url | string / null | — | 头像 URL；允许 null；是否清空以本接口业务说明为准 |
| └└is_active | bool | — | 账号是否启用 |
| └└created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └└last_login_at | string / null | — | 最近登录时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └total | int | — | 匹配记录总数 |
| └page | int | — | 页码，从 1 开始 |
| └page_size | int | — | 每页数量 |
| └active_count | int | — | 全部启用用户数，不受关键词过滤影响 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "items": [
            {
                "id": 1,
                "username": "writer",
                "nickname": null,
                "email": null,
                "phone": null,
                "birth_date": null,
                "gender": null,
                "avatar_url": null,
                "is_active": false,
                "created_at": null,
                "last_login_at": null
            }
        ],
        "total": 1,
        "page": 1,
        "page_size": 10,
        "active_count": 0
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.52. 启用或禁用用户

`PATCH` `/api/v1/admin/users/{user_id}`

需要有效登录会话。

禁用唯一启用管理员返回 409；删除唯一用户返回 409。删除成功经中间件返回 HTTP 200。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| user_id | int | 是 | — | path；用户 ID |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| is_active | bool | 是 | — | 账号是否启用 |

请求 JSON 示例：

```json
{
    "is_active": false
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └id | int | — | 记录 ID |
| └username | string | — | 登录标识（登录请求支持用户名、邮箱或手机号；响应为用户名） |
| └nickname | string / null | — | 昵称；更新时去除首尾空白，空字符串归为 null；允许 null；是否清空以本接口业务说明为准 |
| └email | string / null | — | 邮箱地址；允许 null；是否清空以本接口业务说明为准 |
| └phone | string / null | — | 手机号；业务规范化为 1 开头的 11 位号码，可带 +86 前缀；允许 null；是否清空以本接口业务说明为准 |
| └birth_date | string / null | — | 出生日期；不得为未来日期；格式：date；允许 null；是否清空以本接口业务说明为准 |
| └gender | string / null | — | 性别；允许 null；是否清空以本接口业务说明为准 |
| └avatar_url | string / null | — | 头像 URL；允许 null；是否清空以本接口业务说明为准 |
| └is_active | bool | — | 账号是否启用 |
| └created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └last_login_at | string / null | — | 最近登录时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "id": 1,
        "username": "writer",
        "nickname": null,
        "email": null,
        "phone": null,
        "birth_date": null,
        "gender": null,
        "avatar_url": null,
        "is_active": false,
        "created_at": null,
        "last_login_at": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.53. 删除用户

`DELETE` `/api/v1/admin/users/{user_id}`

需要有效登录会话。

禁用唯一启用管理员返回 409；删除唯一用户返回 409。删除成功经中间件返回 HTTP 200。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| user_id | int | 是 | — | path；用户 ID |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {}
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.54. 登录日志

`GET` `/api/v1/admin/logs/login`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| page | int | 否 | `1` | query；页码，从 1 开始；最小值：1 |
| page_size | int | 否 | `20` | query；每页数量；最小值：1；最大值：100 |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └items | array<object> | — | 当前页记录列表 |
| └└id | int | — | 记录 ID |
| └└user_id | int / null | — | 用户 ID；允许 null；是否清空以本接口业务说明为准 |
| └└username | string | — | 登录标识（登录请求支持用户名、邮箱或手机号；响应为用户名） |
| └└method | string | — | 登录方式 |
| └└success | bool | — | 登录是否成功 |
| └└failure_reason | string / null | — | 登录失败原因；允许 null；是否清空以本接口业务说明为准 |
| └└ip_address | string / null | — | 客户端 IP；允许 null；是否清空以本接口业务说明为准 |
| └└user_agent | string / null | — | 客户端 User-Agent；允许 null；是否清空以本接口业务说明为准 |
| └└created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └total | int | — | 匹配记录总数 |
| └page | int | — | 页码，从 1 开始 |
| └page_size | int | — | 每页数量 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "items": [
            {
                "id": 1,
                "user_id": null,
                "username": "writer",
                "method": "password",
                "success": false,
                "failure_reason": null,
                "ip_address": null,
                "user_agent": null,
                "created_at": null
            }
        ],
        "total": 1,
        "page": 1,
        "page_size": 10
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.55. 操作日志

`GET` `/api/v1/admin/logs/operations`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| page | int | 否 | `1` | query；页码，从 1 开始；最小值：1 |
| page_size | int | 否 | `20` | query；每页数量；最小值：1；最大值：100 |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └items | array<object> | — | 当前页记录列表 |
| └└id | int | — | 记录 ID |
| └└user_id | int / null | — | 用户 ID；允许 null；是否清空以本接口业务说明为准 |
| └└username | string | — | 登录标识（登录请求支持用户名、邮箱或手机号；响应为用户名） |
| └└action | string | — | 写作动作 |
| └└resource_type | string / null | — | 操作资源类型；允许 null；是否清空以本接口业务说明为准 |
| └└resource_id | string / null | — | 操作资源标识；允许 null；是否清空以本接口业务说明为准 |
| └└detail | string / null | — | 操作详情；允许 null；是否清空以本接口业务说明为准 |
| └└ip_address | string / null | — | 客户端 IP；允许 null；是否清空以本接口业务说明为准 |
| └└created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └total | int | — | 匹配记录总数 |
| └page | int | — | 页码，从 1 开始 |
| └page_size | int | — | 每页数量 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "items": [
            {
                "id": 1,
                "user_id": null,
                "username": "writer",
                "action": "polish",
                "resource_type": null,
                "resource_id": null,
                "detail": null,
                "ip_address": null,
                "created_at": null
            }
        ],
        "total": 1,
        "page": 1,
        "page_size": 10
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.56. 读取站点主题设置

`GET` `/api/v1/admin/site-theme`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └mode | string | — | 公开站明暗模式；light=浅色<br>dark=深色 |
| └palette | string | — | 公开站配色；editorial=墨纸<br>forest=深林<br>slate=冷灰<br>ink=夜读<br>graphite=石墨<br>ocean=海境<br>rose=暮玫 |
| └site_name | string | `"xblog"` | 站点名称 |
| └site_tagline | string | `"Ink & Paper"` | 站点副标题 |
| └site_logo_url | string / null | — | 站点 LOGO 地址；允许 null；是否清空以本接口业务说明为准 |
| └site_icp_number | string / null | — | 备案号；允许 null；是否清空以本接口业务说明为准 |
| └posts_per_page | int | `10` | 公开文章列表默认页大小 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "mode": "light",
        "palette": "editorial",
        "site_name": "xblog",
        "site_tagline": "Ink & Paper",
        "site_logo_url": null,
        "site_icp_number": null,
        "posts_per_page": 10
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.57. 更新站点主题设置

`PATCH` `/api/v1/admin/site-theme`

需要有效登录会话。

省略或 null 保留原值；site_logo_url、site_icp_number 传空字符串清空。保存后触发公开布局及 site-theme tag 失效。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| mode | string / null | 否 | — | 公开站明暗模式；light=浅色<br>dark=深色；允许 null；是否清空以本接口业务说明为准 |
| palette | string / null | 否 | — | 公开站配色；editorial=墨纸<br>forest=深林<br>slate=冷灰<br>ink=夜读<br>graphite=石墨<br>ocean=海境<br>rose=暮玫；允许 null；是否清空以本接口业务说明为准 |
| site_name | string / null | 否 | — | 站点名称；最短长度：1；最长长度：100；允许 null；是否清空以本接口业务说明为准 |
| site_tagline | string / null | 否 | — | 站点副标题；最长长度：120；允许 null；是否清空以本接口业务说明为准 |
| site_logo_url | string / null | 否 | — | 站点 LOGO 地址；最长长度：500；允许 null；是否清空以本接口业务说明为准 |
| site_icp_number | string / null | 否 | — | 备案号；最长长度：50；允许 null；是否清空以本接口业务说明为准 |
| posts_per_page | int / null | 否 | — | 公开文章列表默认页大小；最小值：5.0；最大值：50.0；允许 null；是否清空以本接口业务说明为准 |

请求 JSON 示例：

```json
{
    "mode": "light",
    "palette": "editorial",
    "site_name": "xblog",
    "site_tagline": "Ink & Paper",
    "site_logo_url": "",
    "site_icp_number": "",
    "posts_per_page": 10
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └mode | string | — | 公开站明暗模式；light=浅色<br>dark=深色 |
| └palette | string | — | 公开站配色；editorial=墨纸<br>forest=深林<br>slate=冷灰<br>ink=夜读<br>graphite=石墨<br>ocean=海境<br>rose=暮玫 |
| └site_name | string | `"xblog"` | 站点名称 |
| └site_tagline | string | `"Ink & Paper"` | 站点副标题 |
| └site_logo_url | string / null | — | 站点 LOGO 地址；允许 null；是否清空以本接口业务说明为准 |
| └site_icp_number | string / null | — | 备案号；允许 null；是否清空以本接口业务说明为准 |
| └posts_per_page | int | `10` | 公开文章列表默认页大小 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "mode": "light",
        "palette": "editorial",
        "site_name": "xblog",
        "site_tagline": "Ink & Paper",
        "site_logo_url": null,
        "site_icp_number": null,
        "posts_per_page": 10
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.58. 上传站点 LOGO

`POST` `/api/v1/admin/site-theme/logo`

需要有效登录会话。

图片支持 JPEG、PNG、WebP、GIF，非空且最大 5 MiB。上传直接更新站点配置；删除会清空站点 LOGO，并触发 ISR。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `multipart/form-data`；由客户端生成 boundary |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request form` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| file | string | 是 | — | 上传文件二进制 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └mode | string | — | 公开站明暗模式；light=浅色<br>dark=深色 |
| └palette | string | — | 公开站配色；editorial=墨纸<br>forest=深林<br>slate=冷灰<br>ink=夜读<br>graphite=石墨<br>ocean=海境<br>rose=暮玫 |
| └site_name | string | `"xblog"` | 站点名称 |
| └site_tagline | string | `"Ink & Paper"` | 站点副标题 |
| └site_logo_url | string / null | — | 站点 LOGO 地址；允许 null；是否清空以本接口业务说明为准 |
| └site_icp_number | string / null | — | 备案号；允许 null；是否清空以本接口业务说明为准 |
| └posts_per_page | int | `10` | 公开文章列表默认页大小 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "mode": "light",
        "palette": "editorial",
        "site_name": "xblog",
        "site_tagline": "Ink & Paper",
        "site_logo_url": null,
        "site_icp_number": null,
        "posts_per_page": 10
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.59. 删除站点 LOGO

`DELETE` `/api/v1/admin/site-theme/logo`

需要有效登录会话。

图片支持 JPEG、PNG、WebP、GIF，非空且最大 5 MiB。上传直接更新站点配置；删除会清空站点 LOGO，并触发 ISR。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └mode | string | — | 公开站明暗模式；light=浅色<br>dark=深色 |
| └palette | string | — | 公开站配色；editorial=墨纸<br>forest=深林<br>slate=冷灰<br>ink=夜读<br>graphite=石墨<br>ocean=海境<br>rose=暮玫 |
| └site_name | string | `"xblog"` | 站点名称 |
| └site_tagline | string | `"Ink & Paper"` | 站点副标题 |
| └site_logo_url | string / null | — | 站点 LOGO 地址；允许 null；是否清空以本接口业务说明为准 |
| └site_icp_number | string / null | — | 备案号；允许 null；是否清空以本接口业务说明为准 |
| └posts_per_page | int | `10` | 公开文章列表默认页大小 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "mode": "light",
        "palette": "editorial",
        "site_name": "xblog",
        "site_tagline": "Ink & Paper",
        "site_logo_url": null,
        "site_icp_number": null,
        "posts_per_page": 10
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.60. 读取登录方式设置

`GET` `/api/v1/admin/auth-settings`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └sms_enabled | bool | — | 短信 后台开关 |
| └sms_configured | bool | — | 短信 服务端配置是否齐全 |
| └github_enabled | bool | — | GitHub 后台开关 |
| └github_configured | bool | — | GitHub 服务端配置是否齐全 |
| └wechat_enabled | bool | — | 微信 后台开关 |
| └wechat_configured | bool | — | 微信 服务端配置是否齐全 |
| └turnstile_enabled | bool | — | Turnstile 后台开关 |
| └turnstile_configured | bool | — | Turnstile 服务端配置是否齐全 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "sms_enabled": false,
        "sms_configured": false,
        "github_enabled": false,
        "github_configured": false,
        "wechat_enabled": false,
        "wechat_configured": false,
        "turnstile_enabled": false,
        "turnstile_configured": false
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.61. 更新登录方式设置

`PATCH` `/api/v1/admin/auth-settings`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| sms_enabled | bool / null | 否 | — | 短信 后台开关；允许 null；是否清空以本接口业务说明为准 |
| github_enabled | bool / null | 否 | — | GitHub 后台开关；允许 null；是否清空以本接口业务说明为准 |
| wechat_enabled | bool / null | 否 | — | 微信 后台开关；允许 null；是否清空以本接口业务说明为准 |
| turnstile_enabled | bool / null | 否 | — | Turnstile 后台开关；允许 null；是否清空以本接口业务说明为准 |

请求 JSON 示例：

```json
{
    "sms_enabled": null,
    "github_enabled": null,
    "wechat_enabled": null,
    "turnstile_enabled": null
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └sms_enabled | bool | — | 短信 后台开关 |
| └sms_configured | bool | — | 短信 服务端配置是否齐全 |
| └github_enabled | bool | — | GitHub 后台开关 |
| └github_configured | bool | — | GitHub 服务端配置是否齐全 |
| └wechat_enabled | bool | — | 微信 后台开关 |
| └wechat_configured | bool | — | 微信 服务端配置是否齐全 |
| └turnstile_enabled | bool | — | Turnstile 后台开关 |
| └turnstile_configured | bool | — | Turnstile 服务端配置是否齐全 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "sms_enabled": false,
        "sms_configured": false,
        "github_enabled": false,
        "github_configured": false,
        "wechat_enabled": false,
        "wechat_configured": false,
        "turnstile_enabled": false,
        "turnstile_configured": false
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.62. 模型提供商列表

`GET` `/api/v1/admin/ai/providers`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | array<object> | — | 业务数据 |
| └id | string | — | 记录 ID；格式：uuid |
| └name | string | — | 名称 |
| └provider_type | string | — | 模型提供商类型 |
| └base_url | string | — | 模型 API 基地址 |
| └model | string | — | 模型标识 |
| └has_api_key | bool | — | 是否保存了密钥 |
| └enabled | bool | — | 是否启用 |
| └is_default | bool | — | 是否默认提供商 |
| └extra_headers | object / null | — | 附加请求头，键和值均为字符串；允许 null；是否清空以本接口业务说明为准 |
| └created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └updated_at | string / null | — | 更新时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": [
        {
            "id": "00000000-0000-4000-8000-000000000001",
            "name": "示例",
            "provider_type": "openai_compatible",
            "base_url": "https://api.example.com/v1",
            "model": "example-model",
            "has_api_key": false,
            "enabled": false,
            "is_default": false,
            "extra_headers": null,
            "created_at": null,
            "updated_at": null
        }
    ]
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.63. 创建模型提供商

`POST` `/api/v1/admin/ai/providers`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| name | string | 是 | — | 名称；最短长度：1；最长长度：128 |
| provider_type | string | 否 | — | 模型提供商类型；openai=OpenAI<br>deepseek=DeepSeek<br>zhipu=智谱<br>glm_coding=glm_coding<br>minimax=MiniMax<br>anthropic=anthropic<br>openai_compatible=OpenAI兼容 |
| base_url | string | 是 | — | 模型 API 基地址；最短长度：1；最长长度：512 |
| model | string | 是 | — | 模型标识；最短长度：1；最长长度：128 |
| api_key | string / null | 否 | — | 模型密钥，仅写入，响应不返回明文；最长长度：512；允许 null；是否清空以本接口业务说明为准 |
| enabled | bool | 否 | `false` | 是否启用 |
| is_default | bool | 否 | `false` | 是否默认提供商 |
| extra_headers | object / null | 否 | — | 附加请求头，键和值均为字符串；允许 null；是否清空以本接口业务说明为准 |

请求 JSON 示例：

```json
{
    "name": "示例",
    "provider_type": "openai",
    "base_url": "https://api.example.com/v1",
    "model": "example-model",
    "api_key": null,
    "enabled": false,
    "is_default": false,
    "extra_headers": null
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └id | string | — | 记录 ID；格式：uuid |
| └name | string | — | 名称 |
| └provider_type | string | — | 模型提供商类型 |
| └base_url | string | — | 模型 API 基地址 |
| └model | string | — | 模型标识 |
| └has_api_key | bool | — | 是否保存了密钥 |
| └enabled | bool | — | 是否启用 |
| └is_default | bool | — | 是否默认提供商 |
| └extra_headers | object / null | — | 附加请求头，键和值均为字符串；允许 null；是否清空以本接口业务说明为准 |
| └created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └updated_at | string / null | — | 更新时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 201，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "id": "00000000-0000-4000-8000-000000000001",
        "name": "示例",
        "provider_type": "openai_compatible",
        "base_url": "https://api.example.com/v1",
        "model": "example-model",
        "has_api_key": false,
        "enabled": false,
        "is_default": false,
        "extra_headers": null,
        "created_at": null,
        "updated_at": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.64. AI 可用资源统计

`GET` `/api/v1/admin/ai/status`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └enabled_providers | int | — | 已启用提供商数量 |
| └enabled_skills | int | — | 已启用 Skill 数量 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "enabled_providers": 0,
        "enabled_skills": 0
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.65. 推荐 Skill

`GET` `/api/v1/admin/ai/recommend`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| action | string | 否 | — | query；写作动作；polish=润色<br>expand=扩写<br>shorten=缩写<br>title=标题<br>chat=对话<br>generate=全文生成 |
| text | string | 否 | `""` | query；选中的文本；最长长度：8000 |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └skill_id | string / null | — | Skill UUID；可为空；格式：uuid；允许 null；是否清空以本接口业务说明为准 |
| └skill_name | string / null | — | Skill 名称；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "skill_id": null,
        "skill_name": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.66. 模型提供商详情

`GET` `/api/v1/admin/ai/providers/{provider_id}`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| provider_id | string | 是 | — | path；模型提供商 UUID；格式：uuid |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └id | string | — | 记录 ID；格式：uuid |
| └name | string | — | 名称 |
| └provider_type | string | — | 模型提供商类型 |
| └base_url | string | — | 模型 API 基地址 |
| └model | string | — | 模型标识 |
| └has_api_key | bool | — | 是否保存了密钥 |
| └enabled | bool | — | 是否启用 |
| └is_default | bool | — | 是否默认提供商 |
| └extra_headers | object / null | — | 附加请求头，键和值均为字符串；允许 null；是否清空以本接口业务说明为准 |
| └created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └updated_at | string / null | — | 更新时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "id": "00000000-0000-4000-8000-000000000001",
        "name": "示例",
        "provider_type": "openai_compatible",
        "base_url": "https://api.example.com/v1",
        "model": "example-model",
        "has_api_key": false,
        "enabled": false,
        "is_default": false,
        "extra_headers": null,
        "created_at": null,
        "updated_at": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.67. 更新模型提供商

`PATCH` `/api/v1/admin/ai/providers/{provider_id}`

需要有效登录会话。

未提交或 null 的字段保持原值；api_key 空字符串清除密钥，extra_headers={} 清空附加请求头。未启用的提供商不能设为默认，停用会取消默认标记。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| provider_id | string | 是 | — | path；模型提供商 UUID；格式：uuid |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| name | string / null | 否 | — | 名称；最长长度：128；允许 null；是否清空以本接口业务说明为准 |
| provider_type | string / null | 否 | — | 模型提供商类型；openai=OpenAI<br>deepseek=DeepSeek<br>zhipu=智谱<br>glm_coding=glm_coding<br>minimax=MiniMax<br>anthropic=anthropic<br>openai_compatible=OpenAI兼容；允许 null；是否清空以本接口业务说明为准 |
| base_url | string / null | 否 | — | 模型 API 基地址；最长长度：512；允许 null；是否清空以本接口业务说明为准 |
| model | string / null | 否 | — | 模型标识；最长长度：128；允许 null；是否清空以本接口业务说明为准 |
| api_key | string / null | 否 | — | 模型密钥，仅写入，响应不返回明文；最长长度：512；允许 null；是否清空以本接口业务说明为准 |
| enabled | bool / null | 否 | — | 是否启用；允许 null；是否清空以本接口业务说明为准 |
| is_default | bool / null | 否 | — | 是否默认提供商；允许 null；是否清空以本接口业务说明为准 |
| extra_headers | object / null | 否 | — | 附加请求头，键和值均为字符串；允许 null；是否清空以本接口业务说明为准 |

请求 JSON 示例：

```json
{
    "name": "示例模型",
    "enabled": true,
    "is_default": true
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └id | string | — | 记录 ID；格式：uuid |
| └name | string | — | 名称 |
| └provider_type | string | — | 模型提供商类型 |
| └base_url | string | — | 模型 API 基地址 |
| └model | string | — | 模型标识 |
| └has_api_key | bool | — | 是否保存了密钥 |
| └enabled | bool | — | 是否启用 |
| └is_default | bool | — | 是否默认提供商 |
| └extra_headers | object / null | — | 附加请求头，键和值均为字符串；允许 null；是否清空以本接口业务说明为准 |
| └created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └updated_at | string / null | — | 更新时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "id": "00000000-0000-4000-8000-000000000001",
        "name": "示例",
        "provider_type": "openai_compatible",
        "base_url": "https://api.example.com/v1",
        "model": "example-model",
        "has_api_key": false,
        "enabled": false,
        "is_default": false,
        "extra_headers": null,
        "created_at": null,
        "updated_at": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.68. 删除模型提供商

`DELETE` `/api/v1/admin/ai/providers/{provider_id}`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| provider_id | string | 是 | — | path；模型提供商 UUID；格式：uuid |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └message | string | — | 业务结果说明 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "message": "deleted"
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.69. 测试模型提供商

`POST` `/api/v1/admin/ai/providers/{provider_id}/test`

需要有效登录会话。

以已保存密钥发起最小模型调用；data.ok=false 表示测试失败，不应仅凭 HTTP 200 或 code=0 判定上游可用。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| provider_id | string | 是 | — | path；模型提供商 UUID；格式：uuid |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └ok | bool | — | 测试是否成功 |
| └latency_ms | int | — | 调用耗时，毫秒 |
| └message | string | — | 业务结果说明 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "ok": false,
        "latency_ms": 0,
        "message": "ok"
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.70. Skill 列表

`GET` `/api/v1/admin/ai/skills`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | array<object> | — | 业务数据 |
| └id | string | — | 记录 ID；格式：uuid |
| └name | string | — | 名称 |
| └description | string | — | 描述 |
| └enabled | bool | — | 是否启用 |
| └is_builtin | bool | `false` | 是否内置 Skill |
| └created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └updated_at | string / null | — | 更新时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": [
        {
            "id": "00000000-0000-4000-8000-000000000001",
            "name": "example-skill",
            "description": "示例文本",
            "enabled": false,
            "is_builtin": false,
            "created_at": null,
            "updated_at": null
        }
    ]
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.71. 创建 Skill

`POST` `/api/v1/admin/ai/skills`

需要有效登录会话。

name 长度 1–64，只允许小写字母、数字、单连字符；不得以连字符开头/结尾或包含连续连字符。description 去除空白后不得为空；创建会生成 SKILL.md。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| name | string | 是 | — | 名称；最短长度：1；最长长度：64 |
| description | string | 是 | — | 描述；最短长度：1；最长长度：1024 |
| enabled | bool | 否 | `true` | 是否启用 |

请求 JSON 示例：

```json
{
    "name": "example-skill",
    "description": "示例文本",
    "enabled": true
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └id | string | — | 记录 ID；格式：uuid |
| └name | string | — | 名称 |
| └description | string | — | 描述 |
| └enabled | bool | — | 是否启用 |
| └is_builtin | bool | `false` | 是否内置 Skill |
| └created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └updated_at | string / null | — | 更新时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 201，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "id": "00000000-0000-4000-8000-000000000001",
        "name": "example-skill",
        "description": "示例文本",
        "enabled": false,
        "is_builtin": false,
        "created_at": null,
        "updated_at": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.72. 上传 Skill 包

`POST` `/api/v1/admin/ai/skills/upload`

需要有效登录会话。

multipart 文件必须为非空 .zip，ZIP 最多 200 个条目，解压总大小不超过 5 MiB，Skill 根目录须有 SKILL.md；frontmatter.name 遵循小写字母/数字/单连字符的 1–64 字符规则，description 为 1–1024 字符非空字符串。包内容经 Agent Skills 校验，不合法返回 422；同名或占用内置 Skill 名称返回 409。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `multipart/form-data`；由客户端生成 boundary |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request form` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| file | string | 是 | — | 上传文件二进制 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └id | string | — | 记录 ID；格式：uuid |
| └name | string | — | 名称 |
| └description | string | — | 描述 |
| └enabled | bool | — | 是否启用 |
| └is_builtin | bool | `false` | 是否内置 Skill |
| └created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └updated_at | string / null | — | 更新时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "id": "00000000-0000-4000-8000-000000000001",
        "name": "example-skill",
        "description": "示例文本",
        "enabled": false,
        "is_builtin": false,
        "created_at": null,
        "updated_at": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.73. 更新 Skill

`PATCH` `/api/v1/admin/ai/skills/{skill_id}`

需要有效登录会话。

内置 Skill 不可编辑或删除，返回 403；不存在返回 404。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| skill_id | string | 是 | — | path；Skill UUID；可为空；格式：uuid |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| description | string / null | 否 | — | 描述；最长长度：1024；允许 null；是否清空以本接口业务说明为准 |
| enabled | bool / null | 否 | — | 是否启用；允许 null；是否清空以本接口业务说明为准 |

请求 JSON 示例：

```json
{
    "description": null,
    "enabled": null
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └id | string | — | 记录 ID；格式：uuid |
| └name | string | — | 名称 |
| └description | string | — | 描述 |
| └enabled | bool | — | 是否启用 |
| └is_builtin | bool | `false` | 是否内置 Skill |
| └created_at | string / null | — | 创建时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |
| └updated_at | string / null | — | 更新时间；格式：date-time；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "id": "00000000-0000-4000-8000-000000000001",
        "name": "example-skill",
        "description": "示例文本",
        "enabled": false,
        "is_builtin": false,
        "created_at": null,
        "updated_at": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.74. 删除 Skill

`DELETE` `/api/v1/admin/ai/skills/{skill_id}`

需要有效登录会话。

内置 Skill 不可编辑或删除，返回 403；不存在返回 404。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| skill_id | string | 是 | — | path；Skill UUID；可为空；格式：uuid |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └message | string | — | 业务结果说明 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "message": "deleted"
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.75. 读取 Skill 正文

`GET` `/api/v1/admin/ai/skills/{skill_id}/content`

需要有效登录会话。

读取或修改完整 SKILL.md 文本；修改会校验内容，内置 Skill 不可编辑。

示例对应名称为 example-skill 的自定义 Skill；frontmatter.name 必须与实际 Skill 名称一致。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| skill_id | string | 是 | — | path；Skill UUID；可为空；格式：uuid |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └content | string | — | 文本内容 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "content": "---\nname: example-skill\ndescription: 润色博客文字\n---\n\n保持原意并修正语病。\n"
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.76. 修改 Skill 正文

`PATCH` `/api/v1/admin/ai/skills/{skill_id}/content`

需要有效登录会话。

读取或修改完整 SKILL.md 文本；修改会校验内容，内置 Skill 不可编辑。

示例对应名称为 example-skill 的自定义 Skill；frontmatter.name 必须与实际 Skill 名称一致。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| skill_id | string | 是 | — | path；Skill UUID；可为空；格式：uuid |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| content | string | 是 | — | 文本内容 |

请求 JSON 示例：

```json
{
    "content": "---\nname: example-skill\ndescription: 润色博客文字\n---\n\n保持原意并修正语病。\n"
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └content | string | — | 文本内容 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "content": "---\nname: example-skill\ndescription: 润色博客文字\n---\n\n保持原意并修正语病。\n"
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.77. 读取默认 Skill

`GET` `/api/v1/admin/ai/skill-defaults`

需要有效登录会话。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| — | — | 否 | — | 无 |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └polish | string / null | — | 润色默认 Skill UUID，null 表示清除设置；格式：uuid；允许 null；是否清空以本接口业务说明为准 |
| └chat | string / null | — | 对话默认 Skill UUID，null 表示清除设置；格式：uuid；允许 null；是否清空以本接口业务说明为准 |
| └generate | string / null | — | 全文生成配置或默认 Skill UUID，按本行类型区分；格式：uuid；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "polish": null,
        "chat": null,
        "generate": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.78. 修改默认 Skill

`PATCH` `/api/v1/admin/ai/skill-defaults`

需要有效登录会话。

省略场景保留原设置；显式 null 清除该场景默认 Skill。自定义 Skill 必须存在且启用，内置 Skill 允许作为默认。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| polish | string / null | 否 | — | 润色默认 Skill UUID，null 表示清除设置；格式：uuid；允许 null；是否清空以本接口业务说明为准 |
| chat | string / null | 否 | — | 对话默认 Skill UUID，null 表示清除设置；格式：uuid；允许 null；是否清空以本接口业务说明为准 |
| generate | string / null | 否 | — | 全文生成配置或默认 Skill UUID，按本行类型区分；格式：uuid；允许 null；是否清空以本接口业务说明为准 |

请求 JSON 示例：

```json
{
    "polish": null,
    "chat": null,
    "generate": null
}
```

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| code | int | — | 响应业务码：0 成功，-1 失败 |
| msg | string | — | 响应说明 |
| data | object | — | 业务数据 |
| └polish | string / null | — | 润色默认 Skill UUID，null 表示清除设置；格式：uuid；允许 null；是否清空以本接口业务说明为准 |
| └chat | string / null | — | 对话默认 Skill UUID，null 表示清除设置；格式：uuid；允许 null；是否清空以本接口业务说明为准 |
| └generate | string / null | — | 全文生成配置或默认 Skill UUID，按本行类型区分；格式：uuid；允许 null；是否清空以本接口业务说明为准 |

成功：HTTP 200，JSON 示例：

```json
{
    "code": 0,
    "msg": "ok",
    "data": {
        "polish": null,
        "chat": null,
        "generate": null
    }
}
```

失败：HTTP 401（会话无效），JSON 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.79. AI 流式写作

`POST` `/api/v1/admin/ai/complete`

需要有效登录会话。

POST SSE；每用户每进程 60 秒最多 60 次，非跨 worker 全局限额。skill_ids 最多 5 项，支持旧 skill_id。流开始前认证/参数/限流错误为 JSON；开始后 HTTPException 转为 error 事件。

polish/expand/shorten/title 要求 selection.text 非空；chat 要求 messages 非空；generate 要求 generate.topic 非空。provider_id 省略时使用已激活且有 Key 的默认提供商。skill_ids 优先于 skill_id，去重后按顺序使用；显式选择中不可用或无正文的 Skill 会被跳过；两者均未提供时走默认/推荐逻辑。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | `application/json` |
| Cookie | string | 是 | — | 有效 xblog_access 或 xblog_refresh 会话 |
| Accept | string | 否 | — | text/event-stream |

`request params` 参数（path / query / cookie）：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| xblog_access | string / null | 否 | — | cookie；访问令牌 |
| xblog_refresh | string / null | 否 | — | cookie；刷新令牌 |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| action | string | 是 | — | 写作动作；polish=润色<br>expand=扩写<br>shorten=缩写<br>title=标题<br>chat=对话<br>generate=全文生成 |
| provider_id | string / null | 否 | — | 模型提供商 UUID；格式：uuid；允许 null；是否清空以本接口业务说明为准 |
| skill_id | string / null | 否 | — | Skill UUID；可为空；格式：uuid；允许 null；是否清空以本接口业务说明为准 |
| skill_ids | array<string> | 否 | `[]` | Skill UUID 列表，最多 5 项 |
| messages | array<object> | 否 | `[]` | 对话历史 |
| └role | string | 是 | — | 消息角色；调用方使用 user 或 assistant |
| └content | string | 是 | — | 文本内容 |
| selection | object / null | 否 | — | 选中文本对象；允许 null；是否清空以本接口业务说明为准 |
| └text | string | 否 | `""` | 选中的文本 |
| document | object / null | 否 | — | 当前文档上下文；允许 null；是否清空以本接口业务说明为准 |
| └title | string | 否 | `""` | 标题 |
| └content_md | string | 否 | `""` | Markdown 原文 |
| generate | object / null | 否 | — | 全文生成配置或默认 Skill UUID，按本行类型区分；允许 null；是否清空以本接口业务说明为准 |
| └topic | string | 否 | `""` | 生成主题 |
| └outline | string | 否 | `""` | 生成提纲 |

请求 JSON 示例：

```json
{
    "action": "polish",
    "provider_id": null,
    "skill_id": null,
    "skill_ids": [],
    "messages": [],
    "selection": {
        "text": "这是一段需要润色的博客正文。"
    },
    "document": null,
    "generate": null
}
```

下行参数（各 SSE 事件的 data JSON）：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| delta.content | string | — | 正文增量 |
| thinking.content | string | — | 思考增量 |
| done.usage | object | — | 使用统计 |
| └prompt_tokens | int | 0 | 输入 token 数 |
| └completion_tokens | int | 0 | 输出 token 数 |
| └latency_ms | int | — | 耗时毫秒 |
| done.skill_id | string / null | null | 首个选中 Skill UUID |
| done.skill_name | string / null | null | 多个名称以逗号空格连接 |
| error.message | string | — | 流内错误说明 |

成功：HTTP 200，`Content-Type: text/event-stream`。每个事件按 `event: 名称`、`data: 单行 JSON`、空行分隔；没有普通 JSON 外壳。delta 的 JSON 示例：

```json
{
    "content": "润色后的文字"
}
```

done 的 JSON 示例：

```json
{
    "usage": {
        "prompt_tokens": 20,
        "completion_tokens": 15,
        "latency_ms": 850
    },
    "skill_id": null,
    "skill_name": null
}
```

失败：流内 error 事件 JSON 示例：

```json
{
    "message": "未配置已激活的默认模型提供商，请前往设置 → AI 模型"
}
```

流开始前 HTTP 401 示例：

```json
{
    "code": -1,
    "msg": "Not authenticated",
    "data": {}
}
```

### 3.80. 使 Next.js 缓存失效

`POST` `/api/revalidate`

这是 Next.js 内部回调，不属于 FastAPI，也不套统一响应。部署模板将公网 `/api/` 指向后端，调用此接口应直连 Next.js 的内网地址。未设置服务端密钥或密钥不匹配时返回 401。

上行参数：

`request headers` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| Content-Type | string | 是 | — | application/json |

`request json` 参数：

| 参数 | 类型 | 必填 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| secret | string | 是 | — | 必须等于前端 REVALIDATE_SECRET |
| paths | array<string> | 否 | ["/", "/blog"] | 要失效的路径 |
| layout | bool | 否 | false | 为 true 时以 layout 类型失效 |
| tags | array<string> | 否 | [] | layout=true 且省略时为 ["site-theme"] |

下行参数：

| 参数 | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| revalidated | bool | — | true 表示已调用失效函数，不表示所有页面已重新渲染 |
| paths | array<string> | — | 实际展开并去重的路径，包含默认路径及三语言路径；RSS/sitemap不加语言前缀 |
| layout | bool | — | 是否处理 layout |
| tags | array<string> | — | 实际处理的标签；使用 revalidateTag(tag, { expire: 0 }) |

成功：HTTP 200。

```json
{
    "revalidated": true,
    "paths": [
        "/",
        "/zh-CN",
        "/zh-TW",
        "/en",
        "/blog",
        "/zh-CN/blog",
        "/zh-TW/blog",
        "/en/blog"
    ],
    "layout": true,
    "tags": [
        "site-theme"
    ]
}
```

失败：HTTP 401。

```json
{
    "message": "Invalid secret"
}
```

该处理器只做密钥检查，没有 Pydantic 请求校验；无效 JSON 或错误类型不应假定返回后端的 422 格式。

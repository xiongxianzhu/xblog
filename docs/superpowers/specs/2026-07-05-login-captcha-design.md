# xblog 密码登录限流与 Turnstile 验证码设计说明

| 字段 | 值 |
|------|-----|
| 状态 | 已批准（2026-07-05） |
| 范围 | 管理后台 · 密码登录 + 找回密码 |
| 方案 | A（限流）+ C（Cloudflare Turnstile） |

---

## 1. 问题与目标

### 1.1 问题

当前 `POST /auth/login` 与 `POST /auth/forgot-password` 无验证码、无限流。前者存在暴力破解风险；后者可被滥用向管理员邮箱**刷重置邮件**（SMTP 成本与骚扰），且响应恒为 200，无法靠「失败次数」触发验证码。

### 1.2 目标

**密码登录**

- **平时零打扰**：首次登录不显示验证码。
- **失败渐进加强**：连续密码错误达到阈值后，要求 **Turnstile**。
- **硬性限流**：失败过多 → 429。

**找回密码**

- **始终 Turnstile**（已配置 Turnstile 时）：该功能使用频率低，但每次可能发邮件，宜默认拦截机器人。
- **IP 限流**：15 分钟内同一 IP 最多 3 次提交（与登录限流独立计数）。

**共用**

- 短信 / OAuth 不在本次范围。
- `POST /auth/reset-password`（持 token 设新密码）MVP 不加 Turnstile — token 本身已是高熵秘密。

### 1.3 成功标准

| # | 标准 | 验收 |
|---|------|------|
| SC-LC-1 | 正常账号首次密码登录无需验证码 | 正确密码一次成功 |
| SC-LC-2 | 连续 3 次密码错误后，前端展示 Turnstile，未通过无法提交 | 第 4 次起必须带 token |
| SC-LC-3 | 后端校验 Turnstile token（服务端 siteverify） | 伪造 token → 400 |
| SC-LC-4 | 同一 IP 15 分钟内失败 ≥10 次返回 429 | 测试脚本验证 |
| SC-LC-5 | 未配置 Turnstile 密钥时（dev），限流仍生效，验证码校验跳过 | `.env` 留空可本地开发 |
| SC-LC-6 | 登录页 UI 与 admin 登录面板风格一致 | 视觉走查 |
| SC-LC-7 | 找回密码表单始终展示 Turnstile（已配置时），无 token 拒绝提交 | 后端 400 |
| SC-LC-8 | 同一 IP 15 分钟内 forgot-password ≥3 次 → 429 | 测试验证 |

### 1.4 Non-Goals

- 自研文本 / 点击 / 滑动验证码
- 短信登录、OAuth 的 Turnstile
- `reset-password`（token 页）的 Turnstile
- Redis 分布式限流（MVP 用 DB 查 `login_log`）
- 后台设置页动态开关（MVP 用环境变量）

---

## 2. 方案选型（已确认）

用户选择：**A + C**

| 层级 | 手段 | 适用 |
|------|------|------|
| 第一层 | 限流 | 登录：查 `login_log` 失败；找回密码：进程内 IP 计数 |
| 第二层 | Cloudflare Turnstile | 登录：失败 ≥ N 次后；找回密码：**始终**（已配置时） |

**找回密码为何不用「失败 3 次再出验证码」？**

接口永远返回同一句「若账号存在且已绑定邮箱…」，攻击者不会「失败」，只会反复提交刷邮件。因此应 **默认带 Turnstile + IP 限流**。

---

## 3. 架构与数据流

### 3.1 失败计数来源

复用 `login_log` 表（`method='password'`, `success=false`），窗口 **15 分钟**：

- **按 IP**：`ip_address` + 时间窗口
- **按账号标识**：`username`（用户输入的 login identifier 原文）+ 时间窗口

取两者较大值作为「有效失败次数」，避免单一维度绕过。

### 3.2 阈值（环境变量可配，以下为默认）

| 变量 | 默认 | 含义 |
|------|------|------|
| `LOGIN_CAPTCHA_AFTER_FAILURES` | `3` | 达到后 `captcha_required=true` |
| `LOGIN_MAX_FAILURES_PER_WINDOW` | `10` | 窗口内最大失败次数，超出 → 429 |
| `LOGIN_FAILURE_WINDOW_MINUTES` | `15` | 登录失败统计窗口 |
| `FORGOT_PASSWORD_MAX_PER_WINDOW` | `3` | 找回密码每 IP 窗口内最大次数 |
| `FORGOT_PASSWORD_WINDOW_MINUTES` | `15` | 找回密码统计窗口 |
| `TURNSTILE_SITE_KEY` | 空 | 前端 widget |
| `TURNSTILE_SECRET_KEY` | 空 | 后端 siteverify；空则 dev 跳过校验 |

### 3.3 密码登录请求流

```text
前端 POST /auth/login { username, password, turnstile_token? }
        ↓
后端统计近期失败次数
        ↓
失败 ≥ MAX → 429 "登录尝试过于频繁"
        ↓
失败 ≥ CAPTCHA_AFTER 且未配 token → 400 "Captcha required"
        ↓
有 token → POST siteverify（secret 为空则跳过）
        ↓
校验密码 → 401 / 200（与现逻辑一致）
        ↓
401 响应体附带 captcha_required、failure_count（供前端决定是否展示 widget）
```

### 3.4 找回密码请求流

```text
前端 POST /auth/forgot-password { username, turnstile_token? }
        ↓
IP 提交次数 ≥ FORGOT_PASSWORD_MAX → 429
        ↓
已配置 Turnstile 且无 token → 400
        ↓
verify turnstile（secret 空则跳过）
        ↓
现有 request_password_reset 逻辑 → 200 + 统一文案
```

### 3.5 辅助接口

`GET /auth/login-guard` — 登录页加载或失败后刷新状态：

```json
{
  "captcha_required": false,
  "captcha_enabled": true,
  "site_key": "0x...",
  "locked": false,
  "retry_after_seconds": null
}
```

- `captcha_enabled`：是否配置了 `TURNSTILE_SITE_KEY`
- 未配置 Turnstile 时，登录在达阈值后提示「请联系管理员配置验证码」；找回密码仍可提交（仅 IP 限流）

`GET /auth/login-guard` 仅服务**密码登录**（含 `captcha_required` / `failure_count`）。

找回密码页在 `captcha_enabled` 时**直接渲染 Turnstile**，无需 guard 接口。

---

## 4. 后端设计

### 4.1 新增模块

`app/services/login_guard.py`

- `count_recent_login_failures(...)` — 查 `login_log`
- `login_guard_status(...)` — 登录专用
- `assert_login_not_locked(...)` / `assert_login_captcha_if_required(...)`
- `assert_forgot_password_allowed(request)` — IP 进程内计数 + 429
- `assert_turnstile_token(token, request)` — 共用 siteverify
- `verify_turnstile_token(token, remote_ip) -> bool`

### 4.2 Schema 变更

```python
class LoginRequest(SQLModel):
    username: str
    password: str
    turnstile_token: str | None = None

class LoginGuardResponse(SQLModel):
    captcha_required: bool
    captcha_enabled: bool
    site_key: str | None
    locked: bool
    retry_after_seconds: int | None
    failure_count: int

class ForgotPasswordRequest(SQLModel):
    username: str
    turnstile_token: str | None = None

class LoginErrorDetail(SQLModel):  # 401/400 结构化 detail（可选）
    message: str
    captcha_required: bool
    failure_count: int
```

### 4.3 端点改动

- `auth.py` `POST /login`：密码校验前插入 login guard
- `auth_oauth.py` `POST /forgot-password`：增加 `Request` 参数，先 IP 限流 + Turnstile，再 `request_password_reset`

Turnstile verify 失败记 `failure_reason=captcha_failed`（登录，可选）。

### 4.4 配置

`backend/app/core/config.py` 增加上述环境变量；`backend/.env.example` 补充说明与 Turnstile 控制台链接。

---

## 5. 前端设计

### 5.1 组件

`components/admin/admin-turnstile.tsx`

- 加载 `https://challenges.cloudflare.com/turnstile/v0/api.js`
- props: `siteKey`, `onSuccess(token)`, `onExpire`, `onError`
- 外观：`theme` 跟随 admin 登录页 `data-admin-shell` 的 resolvedMode（`light` / `dark`）
- 尺寸：`size="flexible"` 或 `normal`，宽度 100% 适配登录面板

### 5.2 `admin-login-screen.tsx`

**密码登录**

- 挂载时 `GET /auth/login-guard`
- 失败 ≥3 次后展示 Turnstile
- token 过期禁用提交按钮

**找回密码**

- 切换到「找回密码」视图且 `captcha_enabled` 时**立即展示 Turnstile**
- 提交 `forgotPassword(username, turnstileToken)`
- 429 toast 提示等待时间

### 5.3 环境变量

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` — 与后端 `TURNSTILE_SITE_KEY` 相同；未配置时前端不渲染 widget。

### 5.4 视觉

- 与 `admin-login-panel` 一致：`rounded-[2px]`、semantic colors、无额外 border 闪白
- Turnstile 区域上下 `gap-4`，不破坏现有 FieldGroup  rhythm

---

## 6. 错误处理

| 场景 | HTTP | 用户可见 |
|------|------|----------|
| 密码错误 | 401 | 现有 toast + 若达阈值展示 Turnstile |
| 缺少 captcha | 400 | 「请完成人机验证」 |
| captcha 无效 | 400 | 「人机验证失败，请重试」 |
| 限流锁定 | 429 | 「尝试次数过多，请 N 分钟后重试」 |
| 找回密码缺 captcha | 400 | 「请完成人机验证」 |
| 找回密码过于频繁 | 429 | 「请求过于频繁，请稍后再试」 |

---

## 7. 测试

### 7.1 后端

- `test_login_guard.py`：登录失败阈值、429、dev 跳过 turnstile
- `test_forgot_password_guard.py`：Turnstile 必填、IP 限流
- 更新 `test_auth_login.py`、`test_auth_oauth.py`

### 7.2 前端

- 手动：失败 3 次后 widget 出现；成功后 widget 重置
- Turnstile 测试 key：Cloudflare 文档提供的 always-pass / always-fail sitekey

---

## 8. 部署说明

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → Turnstile → 创建站点
2. 域名填入生产 admin 域名 + localhost（开发）
3. 写入 `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` 与前端 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
4. 国内网络需自行验证 Turnstile 可达性；不可达时仅依赖限流并告警

---

## 9. 分阶段交付

| 阶段 | 内容 |
|------|------|
| P1 | 后端 login_guard + login / forgot-password 集成 + 测试 |
| P2 | 前端 Turnstile 组件 + 登录 / 找回密码表单 |
| P3 | 文档（README / AGENT.md / .env.example） |

---

## 10. 待确认项

1. **登录阈值**：3 次出验证码、10 次锁定 15 分钟 — 是否接受？
2. **找回密码**：始终 Turnstile + 每 IP 15 分钟 3 次 — 是否接受？（已纳入设计）

---

**请确认本设计是否可以进入实现计划。** 批准后更新状态为「已批准」，并生成 implementation plan。

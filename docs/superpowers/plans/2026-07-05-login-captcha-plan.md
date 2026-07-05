# xblog 密码登录限流与 Turnstile — 实现计划

| 字段 | 值 |
|------|-----|
| 状态 | 已批准（2026-07-05）· 已实施 |
| 设计 spec | [2026-07-05-login-captcha-design.md](../specs/2026-07-05-login-captcha-design.md) |

---

## P1 后端

1. `config.py` + `.env.example` — Turnstile 与限流阈值
2. `services/login_guard.py` — 失败统计、Turnstile verify、找回密码 IP 限流
3. `schemas/auth.py` — `LoginRequest.turnstile_token`、`ForgotPasswordRequest.turnstile_token`、`LoginGuardResponse`
4. `auth.py` — `GET /login-guard`、`POST /login` 集成 guard
5. `auth_oauth.py` — `POST /forgot-password` 集成 guard
6. `tests/test_login_guard.py` — 限流与 captcha 逻辑

## P2 前端

1. `lib/api.ts` — `ApiError`、`getLoginGuard`、`login`/`forgotPassword` 带 token
2. `components/admin/admin-turnstile.tsx`
3. `admin-login-screen.tsx` — 条件展示 Turnstile

## P3 文档

- `backend/.env.example`、`frontend/.env.example`

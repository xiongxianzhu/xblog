# xblog AI 写作与 Agent Skills — 实现计划

| 字段 | 值 |
|------|-----|
| 状态 | 待实施 |
| 设计 spec | [2026-07-05-ai-writing-skills-design.md](../specs/2026-07-05-ai-writing-skills-design.md) |
| PRD | `docs/prd-xblog.md` v2.8 · US-AI-* · SC-AI-* |
| 目标里程碑 | **M5**（P1）→ **M6**（P2/P3） |

---

## 0. 实施原则

1. **按 P1 → P2 → P3 顺序交付**；每阶段可独立验收、可合并 main。
2. **Key 永不进前端**；所有 LLM 出站请求仅在 `backend/`。
3. **先数据层与 API，后 UI**；SSE 用 httpx 流式 + FastAPI `StreamingResponse`。
4. 每个 PR 保持可 review 粒度（建议 3～5 个 PR 覆盖 P1）。

---

## 1. 仓库结构（新增）

```text
backend/
├── app/
│   ├── models/
│   │   ├── ai_provider.py
│   │   ├── ai_skill.py
│   │   └── ai_usage_log.py
│   ├── schemas/
│   │   └── ai.py
│   ├── services/ai/
│   │   ├── __init__.py
│   │   ├── crypto.py          # Fernet Key 加解密
│   │   ├── providers.py
│   │   ├── skills.py          # 校验、zip、SKILL.md IO
│   │   ├── recommend.py
│   │   └── gateway.py         # prompt 组装 + SSE
│   └── api/v1/endpoints/admin/
│       ├── ai_providers.py
│       ├── ai_skills.py
│       └── ai_complete.py
├── alembic/versions/005_ai_*.py
├── uploads/skills/            # gitignore 用户内容
└── tests/
    ├── test_ai_crypto.py
    ├── test_ai_skills_validate.py
    └── test_ai_complete.py

frontend/
├── app/admin/(shell)/
│   ├── settings/ai/page.tsx       # 或 settings 内分区
│   └── settings/skills/page.tsx
├── components/admin/ai/
│   ├── provider-form.tsx
│   ├── provider-list.tsx
│   ├── skill-list.tsx
│   ├── skill-editor.tsx
│   ├── selection-toolbar.tsx
│   └── ai-assistant-sheet.tsx     # P2/P3 扩展
└── lib/ai-api.ts                  # fetch + SSE 解析
```

---

## 2. P1 — 提供商 + Skill + 选区（M5）

**验收**：SC-AI-1、SC-AI-2、SC-AI-4、SC-AI-5

### 2.1 后端基础

| # | 任务 | 说明 |
|---|------|------|
| P1-1 | 依赖 | `pyproject.toml` 增加 `cryptography` |
| P1-2 | 配置 | `Settings` 增加 `ai_key_encryption_secret: str = ""`；文档写入 `backend/.env.example` |
| P1-3 | 迁移 | Alembic `005`：`ai_provider`、`ai_skill`、`ai_skill_default`（或 `site_settings` JSON 键）、`ai_usage_log` |
| P1-4 | Models | SQLModel 实体 + 关系；`AiProviderType` enum |
| P1-5 | crypto | `services/ai/crypto.py`：Fernet encrypt/decrypt；secret 派生逻辑 |

### 2.2 提供商 API

| # | 任务 | 端点 |
|---|------|------|
| P1-6 | CRUD | `GET/POST /api/v1/admin/ai/providers` |
| P1-7 | 单条 | `GET/PATCH/DELETE .../providers/{id}` |
| P1-8 | 测试 | `POST .../providers/{id}/test` — 最小 chat completion |
| P1-9 | 默认 | PATCH 设 `is_default` 时取消其它默认；仅 `enabled=true` 可作默认 |
| P1-10 | 响应 | 序列化时 `api_key` → `has_api_key: bool` |

### 2.3 Skill API

| # | 任务 | 端点 |
|---|------|------|
| P1-11 | 列表/创建 | `GET/POST /api/v1/admin/ai/skills` |
| P1-12 | 上传 | `POST .../skills/upload` multipart zip |
| P1-13 | 内容 | `GET/PATCH .../skills/{id}/content`（SKILL.md） |
| P1-14 | 删除 | `DELETE .../skills/{id}` + 删目录 |
| P1-15 | 校验 | `skills.py`：frontmatter YAML、`name`/`description` 规则、目录名一致 |
| P1-16 | 默认 | `GET/PATCH /api/v1/admin/ai/skill-defaults` |

### 2.4 AI 网关（选区）

| # | 任务 | 说明 |
|---|------|------|
| P1-17 | complete | `POST /api/v1/admin/ai/complete` SSE |
| P1-18 | actions | `polish` / `expand` / `shorten` / `title` |
| P1-19 | provider | 无 `provider_id` → 默认且 enabled；否则 400 |
| P1-20 | skill | `recommend.py`：手动 > 场景默认 > 关键词 > 无 Skill |
| P1-21 | httpx | OpenAI 兼容 `POST {base_url}/chat/completions` stream |
| P1-22 | usage | 流结束写 `ai_usage_log` |
| P1-23 | rate | 内存滑动窗口 60/min（单进程足够） |

### 2.5 前端 — 设置页

| # | 任务 | 说明 |
|---|------|------|
| P1-24 | 导航 | 设置页增加「AI 模型」「Skills」入口（或子路由） |
| P1-25 | 提供商 UI | 列表 + 新建/编辑 Dialog；类型选模板填 base_url |
| P1-26 | 激活/默认 | Switch +「设为默认」；测试连接按钮 |
| P1-27 | Skills UI | 表格、上传、新建、Monaco/Textarea 编辑 SKILL.md |
| P1-28 | 场景默认 | 三个 Select：polish / chat / generate |

### 2.6 前端 — 编辑器选区

| # | 任务 | 说明 |
|---|------|------|
| P1-29 | 探测 | `post-editor-form.tsx`：Textarea 选区 `selectionStart/End` |
| P1-30 | 工具栏 | 选区浮动条：润色/扩写/缩写/改标题 |
| P1-31 | SSE | `lib/ai-api.ts`：`EventSource` 或 fetch reader 解析 `delta` |
| P1-32 | 预览 | 流式预览 Dialog；确认后替换选区 |
| P1-33 | 空配置 | 无 enabled provider → 禁用 + Link 到设置 |

### 2.7 测试与文档

| # | 任务 | 说明 |
|---|------|------|
| P1-34 | 单元 | crypto roundtrip；Skill 校验正反例 |
| P1-35 | API | 401 未登录；无 provider 400；坏 zip 422 |
| P1-36 | mock | complete 用 respx/httpx mock 流式 |
| P1-37 | AGENT | `AGENT.md` 补充 AI 模块、env、勿提交 Key |
| P1-38 | 构建 | `ruff` / `mypy` / `pytest` / `pnpm build` 通过 |

**P1 PR 建议拆分**

1. `feat/ai-db-models-migration`
2. `feat/ai-providers-api`
3. `feat/ai-skills-api`
4. `feat/ai-complete-sse`
5. `feat/ai-admin-ui-p1`

---

## 3. P2 — 对话改稿（M6 前半）

**验收**：SC-AI-3（对话部分）

| # | 任务 | 说明 |
|---|------|------|
| P2-1 | complete | `action=chat`；messages 数组多轮 |
| P2-2 | prompt | system 含当前文标题 + 正文摘要（截断策略） |
| P2-3 | Sheet | `ai-assistant-sheet.tsx`：消息列表 + 输入框 |
| P2-4 | Skill UI | 下拉 +「推荐」Badge；可改选 |
| P2-5 | 应用 | 「插入到光标」/ 复制 — 不覆盖全文 |
| P2-6 | 测试 | chat 多轮 mock；前端交互手工清单 |

---

## 4. P3 — 全文生成（M6 后半）

**验收**：SC-AI-3（生成部分）

| # | 任务 | 说明 |
|---|------|------|
| P3-1 | complete | `action=generate`；`generate.topic` / `outline` |
| P3-2 | prompt | 强调输出完整 Markdown 文章结构 |
| P3-3 | UI | Sheet 内「全文生成」Tab：主题、大纲字段 |
| P3-4 | 应用 | 预览后「插入」或「覆盖全文」（二次确认） |
| P3-5 | 测试 | generate mock + 手工验收 |

---

## 5. 关键实现片段（参考）

### 5.1 SSE 事件格式

```text
event: delta
data: {"content":"..."}

event: done
data: {"usage":{"prompt_tokens":1,"completion_tokens":2}}

event: error
data: {"message":"..."}
```

### 5.2 Provider 类型模板（前端常量）

```typescript
export const PROVIDER_TEMPLATES = {
  openai: { base_url: "https://api.openai.com/v1", ... },
  deepseek: { base_url: "https://api.deepseek.com", ... },
  // zhipu / minimax / openai_compatible
} as const;
```

### 5.3 加密

- 优先 `AI_KEY_ENCRYPTION_SECRET`（32 url-safe bytes 或 Fernet.generate_key）
- 未配置：从 `SECRET_KEY` 经 HKDF 派生（实现时写入 `crypto.py` 注释）

---

## 6. 不在本计划内（M7 / 后续）

- openapi-typescript
- 标签 CRUD 页、封面上传
- Umami、Docker Compose、Demo 站
- Skill `references/` 按需加载（spec P2 可选）
- `skills-ref` CLI 集成（可用 Python 等价校验替代）

---

## 7. 手工验收清单（P1 完成后）

- [ ] 后台新建 DeepSeek（或任意兼容端）→ 填 Key → **激活** → 测试连接成功
- [ ] 上传合法 Skill zip → 列表可见 → 设为 polish 默认
- [ ] 上传非法 Skill（bad name）→ 422 中文错误
- [ ] 文章编辑选一段文字 → 润色 → 流式预览 → 替换成功
- [ ] 开发者工具 Network：无 Key 字段；响应仅 `has_api_key`
- [ ] 禁用全部提供商 → 编辑器 AI 灰显 + 引导文案

---

## 8. 风险与回滚

| 风险 | 缓解 |
|------|------|
| SSE 被 nginx 缓冲 | nginx `proxy_buffering off` for AI 路由（deploy 文档） |
| 大 zip 上传 | 限制 5MB；仅允许 zip |
| Fernet secret 轮换 | 文档说明轮换需重填 Key（MVP 可接受） |

---

## 9. 完成定义

- **P1 Done**：§2 全部 P1-* 完成 + SC-AI-1/2/4/5
- **P2 Done**：§3 完成 + 对话 SC-AI-3
- **P3 Done**：§4 完成 + 生成 SC-AI-3
- **M5 关闭**：P1 Done + PRD 与 spec 无漂移

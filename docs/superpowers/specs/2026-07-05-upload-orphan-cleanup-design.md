# xblog 上传孤儿文件清理设计说明

| 字段 | 值 |
|------|-----|
| 状态 | 已批准，待实现 |
| 日期 | 2026-07-05 |
| 关联 | 文章封面 `uploads/covers/`、友链 LOGO `uploads/link-logos/` |

---

## 1. 问题与目标

### 1.1 问题

本地上传采用「先上传、后保存」模式：调用 `POST /admin/posts/cover` 或 `POST /admin/links/logo` 后立即写盘，仅在保存文章/友链时 URL 才写入数据库。

前端已在以下场景尽力删除未保存文件：

- 取消 / 关闭友链弹窗
- 离开文章编辑页（组件卸载）
- 移除封面或 LOGO、重新上传替换

但用户**直接关闭浏览器、关机或崩溃**时，上述逻辑无法执行，磁盘会残留孤儿文件。

### 1.2 目标

在服务端增加**兜底清理**：定期删除「未被数据库引用且超过保留时长」的 managed 上传文件。

### 1.3 成功标准

| # | 标准 | 验收 |
|---|------|------|
| SC-UP-1 | 关浏览器后 1 小时内未保存的上传最终被删除 | 上传封面/LOGO 后不保存；1h 后跑 CLI → 文件不存在 |
| SC-UP-2 | 已保存引用不被误删 | 文章/友链已引用 URL → CLI 扫描后文件仍在 |
| SC-UP-3 | 1h 内未引用文件保留 | 上传后 30 分钟跑 CLI → 文件仍在 |
| SC-UP-4 | 可 dry-run | `--dry-run` 只输出将删路径，不删文件 |
| SC-UP-5 | 客户端即时清理不变 | 取消/关弹窗仍调用现有 DELETE API |

### 1.4 Non-Goals

- 不改造为「保存时才上传」（multipart 一并提交）
- 不新增 `pending_upload` 表（首版用扫盘 + DB 引用集）
- 不纳入头像、站点 LOGO、Skill 包（后续可单独扩展）
- 不依赖 `beforeunload` / `sendBeacon` 作为可靠清理手段

### 1.5 已知限制

上传后**连续编辑超过 1 小时仍未保存**时，文件可能被扫盘删除，用户需重新上传。对个人博客单管理员场景可接受。

---

## 2. 方案选择

| 方案 | 说明 | 结论 |
|------|------|------|
| A. 扫盘 + DB 引用 | 遍历目录，对比 DB，按 mtime 删孤儿 | **采用** |
| B. pending_upload 表 | 上传写表，超时删 | 复杂度高，首版不做 |
| C. 保存时上传 | 无上传阶段孤儿 | UX 改动大，不做 |

**保留时长：1 小时（3600 秒）**——用户确认选项 B。

---

## 3. 架构

### 3.1 引用集合

从数据库读取所有 managed URL，构建 `set[str]`：

| 来源 | 字段 | 有效 URL |
|------|------|----------|
| `posts` | `cover_url` | 以 `/api/v1/uploads/covers/` 开头且非空 |
| `friend_links` | `logo_url` | 以 `/api/v1/uploads/link-logos/` 开头且非空 |

复用 `app/services/uploads.py` 中已有前缀常量与 `is_managed_*` 判断逻辑。

### 3.2 扫描目录

| 目录 | 前缀 |
|------|------|
| `{UPLOAD_DIR}/covers/` | `POST_COVER_URL_PREFIX` |
| `{UPLOAD_DIR}/link-logos/` | `FRIEND_LINK_LOGO_URL_PREFIX` |

对每个文件：

1. 构造 API 路径：`{prefix}{filename}`
2. 若在引用集合中 → **保留**
3. 若 `now - mtime < max_age` → **保留**（默认 3600s）
4. 否则 → **删除**（非 dry-run 时 `unlink`）

只处理文件名匹配 `[\w.-]+` 的 regular file（与现有 path 校验一致）。

### 3.2.1 范围与性能（非全盘扫描）

本方案**不是**全盘或整库扫描，范围刻意收窄：

| 维度 | 实际范围 | 明确排除 |
|------|----------|----------|
| 磁盘 | 仅 `{UPLOAD_DIR}/covers/`、`{UPLOAD_DIR}/link-logos/` 两个子目录（单层 `scandir`，不递归） | 整个 `uploads/`、系统盘、其它挂载点 |
| 数据库 | 两条 `SELECT`：`posts.cover_url`、`friend_links.logo_url`（非空 managed URL） | 全表扫描、其它表、pending 表 |
| 调度 | 独立 CLI 进程，cron 建议每小时一次 | 不嵌入 Web 请求链路 |

**预期规模（个人博客）：** 文章/友链引用 URL 通常几十～几百条；磁盘文件通常远小于 1000 个。单次执行：DB 毫秒级 + 目录列举毫秒～几十毫秒，对 VPS 与线上服务可忽略。

**与「扫盘 + DB 引用」表述的关系：** 「扫盘」指遍历上述**两个指定目录**的文件列表，并与 DB 引用集对比；不是 filesystem-wide scan。

### 3.3 模块划分

```
app/services/upload_cleanup.py   # 核心逻辑（可单测）
app/cli.py                       # 子命令 cleanup-uploads
tests/test_upload_cleanup.py     # 单元/集成测试
```

`cleanup_orphan_uploads(*, max_age_seconds=3600, dry_run=False) -> CleanupReport`

返回结构：`scanned`, `deleted`, `kept_referenced`, `kept_recent`（或等价字段，便于 CLI 打印）。

### 3.4 CLI

```bash
uv run python -m app.cli cleanup-uploads [--max-age 3600] [--dry-run]
```

输出示例：

```text
Scanned 12 files, deleted 3 orphans, kept 7 referenced, kept 2 recent (< 3600s).
```

### 3.5 部署

VPS 上 cron 或 systemd timer **每小时**执行一次，例如：

```cron
0 * * * * cd /path/to/xblog/backend && uv run python -m app.cli cleanup-uploads >> /var/log/xblog-cleanup.log 2>&1
```

文档在 `backend/README.md` 增加一小节说明（实现阶段补充）。

---

## 4. 与现有前端的关系

| 层级 | 职责 |
|------|------|
| 前端 `pending-upload-cleanup.ts` | 取消/关弹窗/卸载时 **立即** DELETE |
| 后端 save/update | 换封面/LOGO 时删旧 managed 文件（已有） |
| 本方案 CLI | **兜底**：关浏览器/崩溃后最多约 1h 内清理 |

三层互补，不互相替代。

---

## 5. 错误处理

- 单文件删除失败：记录后继续扫其余文件，CLI 最终以非零 exit 可选（首版：打印 warning，仍 exit 0，避免 cron 邮件轰炸）
- DB 不可用：CLI 失败并 exit 1
- 目录不存在：视为空目录，正常返回

---

## 6. 测试计划

| 用例 | 预期 |
|------|------|
| 未引用 + mtime > 1h | 删除 |
| 未引用 + mtime < 1h | 保留 |
| `posts.cover_url` 引用 | 保留 |
| `friend_links.logo_url` 引用 | 保留 |
| `--dry-run` | 不删文件，报告含路径 |
| 外链 URL 不在磁盘 | 无影响 |

测试使用临时 `UPLOAD_DIR` 或 monkeypatch `get_upload_root()`，不污染开发 `uploads/`。

---

## 7. 实现清单（供后续 plan）

1. 新增 `app/services/upload_cleanup.py`
2. `app/cli.py` 增加 `cleanup-uploads` 子命令
3. 新增 `tests/test_upload_cleanup.py`
4. `backend/README.md` 补充 cron 示例（一行即可）

# xblog 上传孤儿文件清理 — 实现计划

| 字段 | 值 |
|------|-----|
| 状态 | 已实施（2026-07-05） |
| 设计 spec | [2026-07-05-upload-orphan-cleanup-design.md](../specs/2026-07-05-upload-orphan-cleanup-design.md) |

---

## 0. 实施原则

1. **单 PR 可交付**：服务层 + CLI + 测试 + README 一并完成，范围小、无前端改动。
2. **复用现有上传约定**：前缀、`is_managed_*`、`[\w.-]+` 文件名规则均来自 `app/services/uploads.py`，不重复造轮子。
3. **测试隔离**：用 `tmp_path` + monkeypatch `get_upload_root()`，不碰开发环境 `uploads/`。
4. **与前端清理互补**：不修改 `pending-upload-cleanup.ts` 或现有 DELETE API。

---

## 1. P1 — 核心服务 `upload_cleanup.py`

**新建** `backend/app/services/upload_cleanup.py`

### 1.1 数据结构

```python
@dataclass(frozen=True)
class CleanupReport:
    scanned: int
    deleted: int
    kept_referenced: int
    kept_recent: int
    deleted_paths: list[str]  # dry-run 与日志用
    warnings: list[str]       # 单文件 unlink 失败
```

### 1.2 引用集合

```python
async def load_referenced_upload_urls(session: AsyncSession) -> set[str]:
```

- `SELECT cover_url FROM posts WHERE cover_url IS NOT NULL`
- `SELECT logo_url FROM friend_links WHERE logo_url IS NOT NULL`
- 过滤：分别用 `is_managed_post_cover_url`、`is_managed_friend_link_logo_url`
- 返回 `set[str]`

### 1.3 目录扫描

```python
def _scan_directory(
    *,
    directory: Path,
    url_prefix: str,
    referenced: set[str],
    max_age_seconds: int,
    now: float,
    dry_run: bool,
) -> tuple[int, int, int, int, list[str], list[str]]:
```

对每个 `(directory, url_prefix)` 对：

| 目录 | 前缀常量 |
|------|----------|
| `get_upload_root() / "covers"` | `POST_COVER_URL_PREFIX` |
| `get_upload_root() / "link-logos"` | `FRIEND_LINK_LOGO_URL_PREFIX` |

规则（与 spec §3.2 一致）：

1. 目录不存在 → 跳过（视为 0 文件）
2. `os.scandir` 单层遍历；跳过非 regular file
3. 文件名须 `re.fullmatch(r"[\w.-]+", name)`
4. `api_url = f"{url_prefix}{filename}"`
5. 在 `referenced` → `kept_referenced++`
6. `now - stat.st_mtime < max_age_seconds` → `kept_recent++`
7. 否则：`dry_run` 只记入 `deleted_paths`；否则 `path.unlink(missing_ok=True)`，失败 append `warnings` 并继续

### 1.4 入口

```python
async def cleanup_orphan_uploads(
    *,
    max_age_seconds: int = 3600,
    dry_run: bool = False,
    session: AsyncSession | None = None,
) -> CleanupReport:
```

- 若未传 `session`，内部 `async with async_session_factory()` 打开
- DB 连接失败 → 抛出让 CLI `exit 1`
- 合并两个目录的计数与路径列表

---

## 2. P2 — CLI 子命令

**修改** `backend/app/cli.py`

```bash
uv run python -m app.cli cleanup-uploads [--max-age 3600] [--dry-run]
```

- 新增 `cleanup-uploads` subparser
- `asyncio.run(cleanup_orphan_uploads(...))`
-  stdout 一行摘要，例如：
  `Scanned 12 files, deleted 3 orphans, kept 7 referenced, kept 2 recent (< 3600s).`
- 若有 `warnings`，逐行打印 `warning: ...`
- `dry_run` 且有待删路径时，可选打印 `would delete: {path}`（便于验收 SC-UP-4）
- **exit code**：成功（含部分 unlink warning）→ `0`；DB/未捕获异常 → `1`

---

## 3. P3 — 测试 `test_upload_cleanup.py`

**新建** `backend/tests/test_upload_cleanup.py`

### 3.1 夹具

```python
@pytest.fixture
def upload_root(tmp_path, monkeypatch):
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path))
    (tmp_path / "covers").mkdir()
    (tmp_path / "link-logos").mkdir()
    return tmp_path
```

辅助：`touch_file(dir, name, *, age_seconds=0)` — 写空文件并用 `os.utime` 调整 mtime。

### 3.2 用例（映射 spec §6）

| 测试 | 设置 | 断言 |
|------|------|------|
| `test_deletes_unreferenced_old_file` | covers 下文件，mtime > 1h，DB 无引用 | 文件不存在；`deleted == 1` |
| `test_keeps_unreferenced_recent_file` | 同上但 mtime < 1h | 文件仍在；`kept_recent == 1` |
| `test_keeps_referenced_cover` | Post.cover_url 指向文件 | 文件仍在；`kept_referenced >= 1` |
| `test_keeps_referenced_link_logo` | FriendLink.logo_url 指向文件 | 同上 |
| `test_dry_run_does_not_delete` | 孤儿 + 旧 mtime + `dry_run=True` | 文件仍在；`deleted_paths` 非空 |
| `test_skips_invalid_filename` | 文件名含 `/` 或空格 | 不计入 scanned / 不删 |
| `test_missing_directory_ok` | 无 link-logos 目录 | 正常返回，不报错 |

测试内用 `async_session_factory` 插入 Post / FriendLink 最小记录（参考 `test_post_cover.py` 模式）。

运行：`cd backend && uv run pytest tests/test_upload_cleanup.py -q`

---

## 4. P4 — 文档

**修改** `backend/README.md`（若无 CLI 小节则新增「维护命令」）

- 一行说明：`cleanup-uploads` 用途（兜底删未引用上传）
- cron 示例（与 spec §3.5 相同）
- 注明 `--dry-run` 与默认 `max-age 3600`

**修改** spec 状态行：`已批准 · 有计划（待实施）`

---

## 5. 验收清单

| # | 标准 | 如何验 |
|---|------|--------|
| SC-UP-1 | 1h 后删孤儿 | 测试 + 手动：上传不保存，改 mtime，`cleanup-uploads` |
| SC-UP-2 | 已引用保留 | 测试 + 已有文章/友链跑 CLI 后文件仍在 |
| SC-UP-3 | 1h 内保留 | `test_keeps_unreferenced_recent_file` |
| SC-UP-4 | dry-run | `test_dry_run_does_not_delete` |
| SC-UP-5 | 前端不变 | 本 PR 无 frontend diff |

---

## 6. 实施顺序（建议逐步 commit）

1. `feat: 新增 upload_cleanup 服务与单元测试`
2. `feat: CLI cleanup-uploads 子命令`
3. `docs: 补充 cleanup-uploads 与 cron 说明`

或合并为 **1 个 PR**：`feat: 上传孤儿文件兜底清理（CLI + cron）`

---

## 7. 部署（实现后人工）

VPS cron（每小时）：

```cron
0 * * * * cd /path/to/xblog/backend && uv run python -m app.cli cleanup-uploads >> /var/log/xblog-cleanup.log 2>&1
```

首次上线建议先 `--dry-run` 确认输出符合预期。

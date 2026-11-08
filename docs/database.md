# xblog 数据库结构

本文描述当前迁移链 `001_xblog` → `014_post_pinned` 的 PostgreSQL 目标结构，并对照 SQLModel 模型与业务代码。核对日期：2026-11-01。共 16 张业务表、113 个字段；不包含 Alembic 自己维护的版本表。已在隔离 PostgreSQL18.4 验证从空库迁移至该版本；未连接生产库，不能据本文判断现网版本。

## 1. 依据与约定

- 结构以 [迁移文件](../apps/api/alembic/versions/) 为主，应用默认值以 [模型](../apps/api/app/models/) 为主；不一致项集中列在第 6 节。
- PostgreSQL 主版本、数据库编码与排序规则未在仓库固定。连接使用 `postgresql+asyncpg://`；会话为 SQLModel AsyncSession，见 [session.py](../apps/api/app/db/session.py)。
- 下表“可空”是迁移定义。Python 的 `int | None` 主键用于插入前尚未分配 ID，不代表数据库主键允许 NULL。
- 单列整数 id 主键在 PostgreSQL 建表时由序列生成；UUID 主键由应用 uuid4() 生成，迁移未提供 UUID server default。联合主键的两个 ID 均由调用方提供。
- 应用默认与数据库默认分开列出。“无”表示未声明默认；可空列省略后可为 NULL，非空列若无数据库默认需显式提供。空字符串、NULL、0 含义不同。
- `TIMESTAMP WITH TIME ZONE` 字段通过应用 [now()](../apps/api/app/core/timezone.py) 使用 Asia/Shanghai；数据库会话显示时区未固定。出生日期使用 DATE。没有自动更新时间触发器，TimestampMixin 也没有 onupdate。
- 未声明 PostgreSQL ENUM、CHECK、软删除标志、金额字段或多租户字段。状态枚举和跨字段规则主要由服务层保证。

## 2. 关系与删除行为

以下为迁移中的物理外键，父记录均可对应零到多条子记录。无额外说明时，未配置更新级联。

| 子表字段 | 父表字段 | 子表是否可空 | 删除父记录时 |
| --- | --- | --- | --- |
| post_tags.post_id | posts.id | 否 | CASCADE，删除关系，不删除标签 |
| post_tags.tag_id | tags.id | 否 | CASCADE，删除关系，不删除文章 |
| password_reset_tokens.user_id | users.id | 否 | CASCADE，删除重置令牌 |
| login_log.user_id | users.id | 是 | SET NULL，保留日志快照 |
| operation_log.user_id | users.id | 是 | SET NULL，保留日志快照 |
| ai_skill_default.skill_id | ai_skill.id | 是 | SET NULL，保留场景行 |
| ai_usage_log.provider_id | ai_provider.id | 是 | SET NULL，保留用量记录 |
| ai_usage_log.skill_id | ai_skill.id | 是 | SET NULL，保留用量记录 |

没有外键的关系：`sms_verification_codes.phone` 与 `users.phone`；`operation_log.resource_id` 与实际资源；`ai_skill_default.builtin_skill_name` 与仓库 Skill；所有上传 URL 与磁盘文件。`posts` 没有作者 user_id，不能推导多作者所有权关系。

## 3. 表与字段

类型按 PostgreSQL 方言列出。主键隐式索引不重复列为显式索引；普通索引不提供唯一性。迁移未显式命名的唯一约束以列名表示，不猜测数据库最终约束名。

### 3.1. `users` — 管理员账号

身份、账号启用状态与第三方绑定；不包含 role 字段。 模型：[user.py](../apps/api/app/models/user.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `created_at` | TIMESTAMP WITH TIME ZONE | 是 | `now()` | `无` | 创建时间，应用 now() 提供 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | 是 | `now()` | `无` | 更新时间，更新业务显式维护，不是数据库触发器 |
| `id` | INTEGER | 否 | `None（待分配）` | `序列生成` | 主键；记录主键 |
| `username` | VARCHAR(50) | 否 | `无` | `无` | 管理员用户名；日志中为登录标识或操作者快照 |
| `password_hash` | VARCHAR(255) | 否 | `无` | `无` | bcrypt 密码哈希，不存明文密码 |
| `last_login_at` | TIMESTAMP WITH TIME ZONE | 是 | `None` | `无` | 最近成功登录时间 |
| `avatar_url` | VARCHAR(500) | 是 | `None` | `无` | 头像 URL，文件位于上传目录 |
| `email` | VARCHAR(255) | 是 | `None` | `无` | 绑定邮箱 |
| `github_id` | VARCHAR(64) | 是 | `None` | `无` | 绑定的 GitHub 用户标识 |
| `wechat_openid` | VARCHAR(128) | 是 | `None` | `无` | 绑定的微信 OpenID |
| `phone` | VARCHAR(20) | 是 | `None` | `无` | 手机号；业务层规范化大陆手机号 |
| `is_active` | BOOLEAN | 否 | `True` | `true` | 账号启用标志 |
| `nickname` | VARCHAR(50) | 是 | `None` | `无` | 昵称 |
| `birth_date` | DATE | 是 | `None` | `无` | 出生日期 |
| `gender` | VARCHAR(20) | 是 | `None` | `无` | 性别：male、female、other，由请求模型限制 |

- 主键：`(id)`。
- 额外唯一约束：无（唯一索引另列）。

| 显式索引 | 列（顺序） | 唯一 |
| --- | --- | --- |
| `ix_users_email` | `(email)` | 是 |
| `ix_users_github_id` | `(github_id)` | 是 |
| `ix_users_is_active` | `(is_active)` | 否 |
| `ix_users_phone` | `(phone)` | 是 |
| `ix_users_username` | `(username)` | 是 |
| `ix_users_wechat_openid` | `(wechat_openid)` | 是 |

### 3.2. `posts` — 文章

保存原文、渲染结果、发布及置顶状态。 模型：[post.py](../apps/api/app/models/post.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `created_at` | TIMESTAMP WITH TIME ZONE | 是 | `now()` | `无` | 创建时间，应用 now() 提供 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | 是 | `now()` | `无` | 更新时间，更新业务显式维护，不是数据库触发器 |
| `id` | INTEGER | 否 | `None（待分配）` | `序列生成` | 主键；记录主键 |
| `title` | VARCHAR(200) | 否 | `无` | `无` | 标题 |
| `slug` | VARCHAR(200) | 否 | `无` | `无` | URL 标识 |
| `content_md` | TEXT | 否 | `''` | `无` | Markdown 原文 |
| `content_html` | TEXT | 否 | `''` | `无` | 由原文渲染的 HTML |
| `excerpt` | VARCHAR(500) | 是 | `None` | `无` | 摘要 |
| `cover_url` | VARCHAR(500) | 是 | `None` | `无` | 外链或 managed 封面 URL |
| `status` | VARCHAR(20) | 否 | `'draft'` | `无` | 文章状态：draft 或 published，业务层校验 |
| `published_at` | TIMESTAMP WITH TIME ZONE | 是 | `None` | `无` | 首次发布时由应用赋值 |
| `is_pinned` | BOOLEAN | 否 | `False` | `false` | 是否置顶 |
| `pinned_at` | TIMESTAMP WITH TIME ZONE | 是 | `None` | `无` | 置顶操作时间；取消置顶时清空 |

- 主键：`(id)`。
- 额外唯一约束：`(slug)`。

| 显式索引 | 列（顺序） | 唯一 |
| --- | --- | --- |
| `ix_posts_is_pinned` | `(is_pinned)` | 否 |
| `ix_posts_slug` | `(slug)` | 否 |
| `ix_posts_status` | `(status)` | 否 |

### 3.3. `tags` — 标签

标签名与 slug 分别唯一；没有独立标签管理 API。 模型：[post.py](../apps/api/app/models/post.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | `None（待分配）` | `序列生成` | 主键；记录主键 |
| `name` | VARCHAR(50) | 否 | `无` | `无` | 名称 |
| `slug` | VARCHAR(50) | 否 | `无` | `无` | URL 标识 |

- 主键：`(id)`。
- 额外唯一约束：`(name)`、`(slug)`。

| 显式索引 | 列（顺序） | 唯一 |
| --- | --- | --- |
| `ix_tags_slug` | `(slug)` | 否 |

### 3.4. `post_tags` — 文章标签关系

多对多关联，以 (post_id, tag_id) 联合主键防止重复关系。 模型：[post.py](../apps/api/app/models/post.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `post_id` | INTEGER | 否 | `None` | `无` | 主键；关联文章 ID |
| `tag_id` | INTEGER | 否 | `None` | `无` | 主键；关联标签 ID |

- 主键：`(post_id, tag_id)`。
- 额外唯一约束：无（唯一索引另列）。
- 显式索引：无（主键索引除外）。

### 3.5. `pages` — 固定页面

通过 slug 访问 about/projects；CLI seed-pages 创建缺失页面。 模型：[page.py](../apps/api/app/models/page.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | `None（待分配）` | `序列生成` | 主键；记录主键 |
| `slug` | VARCHAR(50) | 否 | `无` | `无` | URL 标识 |
| `title` | VARCHAR(200) | 否 | `无` | `无` | 标题 |
| `content_md` | TEXT | 否 | `''` | `无` | Markdown 原文 |
| `content_html` | TEXT | 否 | `''` | `无` | 由原文渲染的 HTML |
| `updated_at` | TIMESTAMP WITH TIME ZONE | 是 | `now()` | `无` | 更新时间，更新业务显式维护，不是数据库触发器 |

- 主键：`(id)`。
- 额外唯一约束：`(slug)`。

| 显式索引 | 列（顺序） | 唯一 |
| --- | --- | --- |
| `ix_pages_slug` | `(slug)` | 否 |

### 3.6. `friend_links` — 友链

按 sort_order、id 升序展示，LOGO 的 API 必填性不等于数据库非空。 模型：[friend_link.py](../apps/api/app/models/friend_link.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | `None（待分配）` | `序列生成` | 主键；记录主键 |
| `name` | VARCHAR(100) | 否 | `无` | `无` | 名称 |
| `url` | VARCHAR(500) | 否 | `无` | `无` | 友链目标地址 |
| `logo_url` | VARCHAR(500) | 是 | `None` | `无` | 友链 LOGO URL，数据库允许空，创建接口要求非空 |
| `sort_order` | INTEGER | 否 | `0` | `无` | 友链排序权重，升序使用 |
| `description` | VARCHAR(500) | 是 | `None` | `无` | 简介或说明 |

- 主键：`(id)`。
- 额外唯一约束：无（唯一索引另列）。
- 显式索引：无（主键索引除外）。

### 3.7. `page_views` — 访问记录

每次上报插入记录，后台按 path 聚合；不保存访客用户外键。 模型：[page_view.py](../apps/api/app/models/page_view.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | `None（待分配）` | `序列生成` | 主键；记录主键 |
| `path` | VARCHAR(500) | 否 | `无` | `无` | 被访问的路径 |
| `referrer` | VARCHAR(500) | 是 | `None` | `无` | 来源地址 |
| `visited_at` | TIMESTAMP WITH TIME ZONE | 是 | `now()` | `无` | 访问时间 |

- 主键：`(id)`。
- 额外唯一约束：无（唯一索引另列）。

| 显式索引 | 列（顺序） | 唯一 |
| --- | --- | --- |
| `ix_page_views_path` | `(path)` | 否 |
| `ix_page_views_visited_at` | `(visited_at)` | 否 |

### 3.8. `site_settings` — 站点配置

公开主题、品牌、分页及登录方式开关共用键值表。 模型：[site_setting.py](../apps/api/app/models/site_setting.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `key` | VARCHAR(64) | 否 | `无` | `无` | 主键；配置项名称 |
| `value` | VARCHAR(500) | 否 | `''` | `''` | 字符串配置值，按配置键解释 |

- 主键：`(key)`。
- 额外唯一约束：无（唯一索引另列）。
- 显式索引：无（主键索引除外）。

### 3.9. `ai_provider` — 模型提供商

提供商配置和加密 Key；默认模型唯一性由服务逻辑维护。 模型：[ai_provider.py](../apps/api/app/models/ai_provider.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `id` | UUID | 否 | `uuid4()` | `无` | 主键；记录主键 |
| `name` | VARCHAR(128) | 否 | `无` | `无` | 名称 |
| `provider_type` | VARCHAR(32) | 否 | `openai_compatible` | `无` | 模型提供商类型，存字符串而非数据库枚举 |
| `base_url` | VARCHAR(512) | 否 | `无` | `无` | 模型服务基地址 |
| `model` | VARCHAR(128) | 否 | `无` | `无` | 模型名称 |
| `api_key_encrypted` | TEXT | 是 | `None` | `无` | Fernet 密文，不返回给客户端 |
| `enabled` | BOOLEAN | 否 | `False` | `false` | 是否启用 |
| `is_default` | BOOLEAN | 否 | `False` | `false` | 是否默认模型提供商 |
| `extra_headers` | JSON | 是 | `None` | `无` | 附加请求头对象，JSON 类型而非 JSONB |
| `created_at` | TIMESTAMP WITH TIME ZONE | 是 | `now()` | `无` | 创建时间，应用 now() 提供 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | 是 | `now()` | `无` | 更新时间，更新业务显式维护，不是数据库触发器 |

- 主键：`(id)`。
- 额外唯一约束：无（唯一索引另列）。
- 显式索引：无（主键索引除外）。

### 3.10. `ai_skill` — 自定义 Skill

只保存自定义 Skill 元数据；内置 Skill 从仓库读取，不要求存在对应数据库行。 模型：[ai_skill.py](../apps/api/app/models/ai_skill.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `id` | UUID | 否 | `uuid4()` | `无` | 主键；记录主键 |
| `name` | VARCHAR(64) | 否 | `无` | `无` | 名称 |
| `description` | VARCHAR(1024) | 否 | `无` | `无` | 简介或说明 |
| `storage_path` | VARCHAR(512) | 否 | `无` | `无` | 自定义 Skill 目录路径，正文在磁盘 SKILL.md |
| `enabled` | BOOLEAN | 否 | `True` | `true` | 是否启用 |
| `created_at` | TIMESTAMP WITH TIME ZONE | 是 | `now()` | `无` | 创建时间，应用 now() 提供 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | 是 | `now()` | `无` | 更新时间，更新业务显式维护，不是数据库触发器 |

- 主键：`(id)`。
- 额外唯一约束：`(name)`。

| 显式索引 | 列（顺序） | 唯一 |
| --- | --- | --- |
| `ix_ai_skill_name` | `(name)` | 是 |

### 3.11. `ai_skill_default` — 场景默认 Skill

自定义默认值存 skill_id，内置默认值存 builtin_skill_name；两个字段的互斥由业务层维护。 模型：[ai_skill.py](../apps/api/app/models/ai_skill.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `scene` | VARCHAR(32) | 否 | `无` | `无` | 主键；默认 Skill 场景：polish、chat、generate |
| `skill_id` | UUID | 是 | `None` | `无` | 自定义 Skill 的物理外键；允许空 |
| `builtin_skill_name` | VARCHAR(64) | 是 | `None` | `无` | 内置 Skill 名称，逻辑关联仓库资源，无物理外键 |

- 主键：`(scene)`。
- 额外唯一约束：无（唯一索引另列）。
- 显式索引：无（主键索引除外）。

### 3.12. `ai_usage_log` — AI 用量记录

保存动作、首个 Skill、提供商、用量与延迟，不保存 prompt、文章正文或完整多 Skill 列表。 模型：[ai_usage_log.py](../apps/api/app/models/ai_usage_log.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | `None（待分配）` | `序列生成` | 主键；记录主键 |
| `action` | VARCHAR(32) | 否 | `无` | `无` | 动作字符串；取值由调用处控制 |
| `provider_id` | UUID | 是 | `None` | `无` | 模型提供商外键 |
| `skill_id` | UUID | 是 | `None` | `无` | 自定义 Skill 的物理外键；允许空 |
| `latency_ms` | INTEGER | 否 | `0` | `0` | 调用耗时，毫秒 |
| `prompt_tokens` | INTEGER | 否 | `0` | `0` | 输入 token 数 |
| `completion_tokens` | INTEGER | 否 | `0` | `0` | 输出 token 数 |
| `created_at` | TIMESTAMP WITH TIME ZONE | 是 | `now()` | `无` | 创建时间，应用 now() 提供 |

- 主键：`(id)`。
- 额外唯一约束：无（唯一索引另列）。
- 显式索引：无（主键索引除外）。

### 3.13. `password_reset_tokens` — 密码重置令牌

令牌单次使用且校验过期时间；默认有效期来自配置，未固化在表中。 模型：[password_reset_token.py](../apps/api/app/models/password_reset_token.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `created_at` | TIMESTAMP WITH TIME ZONE | 是 | `now()` | `无` | 创建时间，应用 now() 提供 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | 是 | `now()` | `无` | 更新时间，更新业务显式维护，不是数据库触发器 |
| `id` | INTEGER | 否 | `None（待分配）` | `序列生成` | 主键；记录主键 |
| `user_id` | INTEGER | 否 | `无` | `无` | 用户外键 |
| `token_hash` | VARCHAR(255) | 否 | `无` | `无` | 密码重置原始令牌的 SHA-256 哈希 |
| `expires_at` | TIMESTAMP WITH TIME ZONE | 否 | `无` | `无` | 到期时间 |
| `used_at` | TIMESTAMP WITH TIME ZONE | 是 | `None` | `无` | 已使用时间；null 表示尚未使用，不表示尚未过期 |

- 主键：`(id)`。
- 额外唯一约束：无（唯一索引另列）。

| 显式索引 | 列（顺序） | 唯一 |
| --- | --- | --- |
| `ix_password_reset_tokens_user_id` | `(user_id)` | 否 |

### 3.14. `sms_verification_codes` — 短信验证码

按手机号记录验证码；与 users.phone 只有业务匹配关系，无物理外键。 模型：[sms_verification_code.py](../apps/api/app/models/sms_verification_code.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | `None（待分配）` | `序列生成` | 主键；记录主键 |
| `phone` | VARCHAR(20) | 否 | `无` | `无` | 手机号；业务层规范化大陆手机号 |
| `code_hash` | VARCHAR(255) | 否 | `无` | `无` | 独立短信登录使用 SHA-256；密码二次验证使用绑定记录 ID 的 HMAC-SHA256 |
| `purpose` | VARCHAR(32) | 否 | `'login'` | `login` | `login` 为独立短信登录，`password_login` 为密码登录二次验证 |
| `attempts` | INTEGER | 否 | `0` | `0` | 密码二次验证错误次数，达到 5 次后将挑战标记为已使用 |
| `expires_at` | TIMESTAMP WITH TIME ZONE | 否 | `无` | `无` | 到期时间 |
| `used_at` | TIMESTAMP WITH TIME ZONE | 是 | `None` | `无` | 已使用时间；null 表示尚未使用，不表示尚未过期 |
| `created_at` | TIMESTAMP WITH TIME ZONE | 否 | `now()` | `无` | 创建时间，应用 now() 提供 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | 否 | `now()` | `无` | 更新时间，更新业务显式维护，不是数据库触发器 |

- 主键：`(id)`。
- 额外唯一约束：无（唯一索引另列）。

| 显式索引 | 列（顺序） | 唯一 |
| --- | --- | --- |
| `ix_sms_verification_codes_phone` | `(phone)` | 否 |

### 3.15. `login_log` — 登录审计

保留成功或失败登录、客户端及用户快照；被登录防护查询使用。 模型：[login_log.py](../apps/api/app/models/login_log.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | `None（待分配）` | `序列生成` | 主键；记录主键 |
| `user_id` | INTEGER | 是 | `None` | `无` | 用户外键 |
| `username` | VARCHAR(64) | 否 | `无` | `无` | 管理员用户名；日志中为登录标识或操作者快照 |
| `method` | VARCHAR(32) | 否 | `无` | `无` | 登录方式：password、sms、oauth_github、oauth_wechat |
| `success` | BOOLEAN | 否 | `False` | `false` | 登录是否成功 |
| `failure_reason` | VARCHAR(64) | 是 | `None` | `无` | 登录失败原因标识 |
| `ip_address` | VARCHAR(45) | 是 | `None` | `无` | 客户端 IP 字符串，最长 45 字符 |
| `user_agent` | VARCHAR(500) | 是 | `None` | `无` | 客户端 User-Agent，业务截断至 500 字符 |
| `created_at` | TIMESTAMP WITH TIME ZONE | 是 | `now()` | `无` | 创建时间，应用 now() 提供 |

- 主键：`(id)`。
- 额外唯一约束：无（唯一索引另列）。

| 显式索引 | 列（顺序） | 唯一 |
| --- | --- | --- |
| `ix_login_log_created_at` | `(created_at)` | 否 |
| `ix_login_log_method` | `(method)` | 否 |
| `ix_login_log_success` | `(success)` | 否 |
| `ix_login_log_username` | `(username)` | 否 |

### 3.16. `operation_log` — 操作审计

当前写入调用只覆盖用户启用、禁用和删除，不等于所有内容变更均被记录。 模型：[operation_log.py](../apps/api/app/models/operation_log.py)。

| 字段 | PostgreSQL 类型 | 可空 | 应用默认 | 数据库默认 | 含义 |
| --- | --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | `None（待分配）` | `序列生成` | 主键；记录主键 |
| `user_id` | INTEGER | 是 | `None` | `无` | 用户外键 |
| `username` | VARCHAR(64) | 否 | `无` | `无` | 管理员用户名；日志中为登录标识或操作者快照 |
| `action` | VARCHAR(64) | 否 | `无` | `无` | 动作字符串；取值由调用处控制 |
| `resource_type` | VARCHAR(32) | 是 | `None` | `无` | 操作资源类型，当前调用为 user |
| `resource_id` | VARCHAR(64) | 是 | `None` | `无` | 资源 ID 的字符串快照，无指向业务表的外键 |
| `detail` | VARCHAR(500) | 是 | `None` | `无` | 操作说明，不是结构化 JSON |
| `ip_address` | VARCHAR(45) | 是 | `None` | `无` | 客户端 IP 字符串，最长 45 字符 |
| `created_at` | TIMESTAMP WITH TIME ZONE | 是 | `now()` | `无` | 创建时间，应用 now() 提供 |

- 主键：`(id)`。
- 额外唯一约束：无（唯一索引另列）。

| 显式索引 | 列（顺序） | 唯一 |
| --- | --- | --- |
| `ix_operation_log_action` | `(action)` | 否 |
| `ix_operation_log_created_at` | `(created_at)` | 否 |
| `ix_operation_log_username` | `(username)` | 否 |

## 4. 业务规则与持久化边界

### 配置键

`site_settings` 的值全部是字符串。以下默认值是读取逻辑的回退值，不是迁移种子数据；迁移只创建空表。来源：[site_settings.py](../apps/api/app/services/site_settings.py)、[auth_settings.py](../apps/api/app/services/auth_settings.py)。

| key | 值的含义与可选值 | 缺失时 |
| --- | --- | --- |
| site.theme.mode | light / dark | light |
| site.theme.palette | editorial / forest / slate / ink / graphite / ocean / rose | editorial |
| site.brand.name | 站点名称 | xblog |
| site.brand.tagline | 副标题，可为空字符串 | Ink & Paper |
| site.brand.logo_url | LOGO URL | 无 LOGO |
| site.brand.icp_number | 备案号 | 无备案号 |
| site.content.posts_per_page | 整数字符串，读取时限制到 5–50 | 10；无法解析也回退 10 |
| auth.oauth.github.enabled | true / false | false |
| auth.oauth.wechat.enabled | true / false | false |
| auth.sms.enabled | true / false | false |
| auth.password_sms.enabled | true / false；密码登录后是否要求手机二次验证 | false |
| auth.turnstile.enabled | true / false | false |

布尔读取还接受 1、yes、on（忽略大小写与首尾空白），写入统一为 true/false。开关开启不代表外部凭据齐全，也不证明真实服务可用。后台个人外观存浏览器 localStorage，不在数据库。

### 内容与文件

- `status` 只允许 draft/published，由 [posts.py](../apps/api/app/services/posts.py) 校验。首次发布且 published_at 为空时赋值；撤回草稿不会清除 published_at，但会清除已有置顶状态。
- 公开排序为 is_pinned、pinned_at、published_at、id 降序，数据库没有为该组合建立联合索引；正文搜索使用 ILIKE，没有 tsvector/GIN 全文索引。
- 保存 Markdown 时同步生成 HTML。标签同步先删除原关系，再按去重后的标签列表重建；不存在的标签可自动创建。删除文章按迁移外键清理关系，不自动删除失去引用的标签。
- 友链 logo_url 列允许 NULL；创建接口要求非空，不能把接口约束当成数据库约束。图片 URL 不建立数据库文件外键。
- 文件操作与数据库事务不构成原子事务。封面、LOGO、头像、Skill 目录可能先于提交写入或删除，数据库回滚不能恢复已删文件。[孤儿清理](../apps/api/app/services/upload_cleanup.py) 仅覆盖 covers/link-logos 的过期未引用文件，不覆盖所有上传。

### 认证、审计与 AI

- 密码使用 bcrypt；重置令牌和短信验证码保存 SHA-256 哈希，使用后写 used_at。有效期来自配置（默认重置 60 分钟、短信 5 分钟），不是数据库表达式。业务校验过期，不会因时间到达自动删除行。
- 可空的邮箱、手机号、GitHub ID、微信 OpenID 使用普通唯一索引，允许多个 NULL；邮箱登录使用大小写不敏感查询，但迁移未定义 lower(email) 唯一索引或 CITEXT，不能据此保证大小写折叠后的唯一性。
- 用户不能禁用最后一个启用账号，也不能删除唯一账号，保护位于 [users.py](../apps/api/app/services/users.py)，不是数据库约束。用户名、角色授权和所有权也没有额外表支撑。
- 登录审计保留请求标识快照；`username` 日志长度为 64，而登录参数可达 255，长标识存在数据库长度约束风险。操作审计当前仅见 user.enable/user.disable/user.delete 写入调用，不能声称文章与站点配置已全面审计。
- provider_type 当前枚举为 openai、deepseek、zhipu、glm_coding、minimax、anthropic、openai_compatible；数据库只是 VARCHAR(32)。is_default 的互斥由服务清除其他默认值实现，没有部分唯一索引保证并发唯一。
- AI Key 使用 Fernet，密钥由 AI_KEY_ENCRYPTION_SECRET 或回退 SECRET_KEY 派生；备份必须保留配套密钥。extra_headers 是 JSON 字段，未按 Key 字段机制加密，不应当作加密秘密仓库。
- 内置 Skill 从 `apps/api/app/data/builtin_skills/` 加载，以名称派生 UUID。默认选择通过 builtin_skill_name 保存；自定义 Skill 才通过 skill_id 外键保存。场景行 polish/chat/generate 由迁移 005 插入；互斥规则无 CHECK。
- 用量日志仅记录首个 Skill 的 ID，action 支持 polish/expand/shorten/title/chat/generate。迁移验收已在隔离 PostgreSQL 复现并修复内置 UUID 外键冲突：内置 Skill 的日志 skill_id 写 NULL，自定义 Skill 写真实 UUID；SSE 仍返回选中的 Skill 标识。见 [任务清单](tasks.md) DB-02。
- 当前未发现登录日志、操作日志、AI 用量日志、访问记录及过期验证码/重置令牌的定时保留策略。不能把上传清理命令当成这些表的数据清理任务。

## 5. 迁移链与维护

以仓库迁移顺序列出，不代表目标实例的执行记录。

| revision | 变更 |
| --- | --- |

| [001_xblog](../apps/api/alembic/versions/001_xblog_initial.py) | 创建 users、tags、posts、post_tags、pages、friend_links、page_views |
| [002_user_last_login](../apps/api/alembic/versions/002_user_last_login.py) | users.last_login_at |
| [003_user_avatar](../apps/api/alembic/versions/003_user_avatar.py) | users.avatar_url |
| [004_site_settings](../apps/api/alembic/versions/004_site_settings.py) | site_settings 键值表 |
| [005_ai_tables](../apps/api/alembic/versions/005_ai_tables.py) | 四张 AI 表，初始化三个默认 Skill 场景 |
| [006_auth_oauth_reset](../apps/api/alembic/versions/006_auth_oauth_reset.py) | 邮箱/OAuth 绑定列与 password_reset_tokens |
| [007_phone_sms_auth](../apps/api/alembic/versions/007_phone_sms_auth.py) | 手机号与 sms_verification_codes |
| [008_ai_skill_default_builtin](../apps/api/alembic/versions/008_ai_skill_default_builtin.py) | ai_skill_default.builtin_skill_name |
| [009_user_is_active](../apps/api/alembic/versions/009_user_is_active.py) | users.is_active 及索引 |
| [010_user_nickname](../apps/api/alembic/versions/010_user_nickname.py) | users.nickname |
| [011_user_profile_fields](../apps/api/alembic/versions/011_user_profile_fields.py) | users.birth_date、gender |
| [012_audit_logs](../apps/api/alembic/versions/012_audit_logs.py) | login_log、operation_log 及索引 |
| [013_friend_link_description](../apps/api/alembic/versions/013_friend_link_description.py) | friend_links.description |
| [014_post_pinned](../apps/api/alembic/versions/014_post_pinned.py) | posts.is_pinned、pinned_at 与 is_pinned 索引 |
| [017_password_sms_attempts](../apps/api/alembic/versions/017_password_sms_attempts.py) | sms_verification_codes.attempts；保留已有验证码历史 |

[env.py](../apps/api/alembic/env.py) 使用模型 metadata，并开启 compare_type。迁移前先备份数据库、上传目录与配置，在隔离 PostgreSQL 环境确认迁移和恢复；完整顺序见 [部署文档](deployment.md)。新增字段需要新增迁移，不能只改模型后依赖 create_all 更新已有库。

以下命令由操作者在已配置的 backend 目录检查迁移状态，本文未执行连接数据库的 current：

```bash
cd backend
uv run alembic heads
uv run alembic history
uv run alembic current
```

预期仓库 head 为 `014_post_pinned`；current 需与之核对，不能根据迁移文件存在就断言数据库已更新。downgrade 会删列或删表，存在数据丢失风险，不等于恢复备份。

## 6. 模型与迁移差异

以下来自离线逐列、索引与外键对照。本文按迁移描述数据库目标，不修改模型或迁移来消除差异。

| 对象 | 迁移目标 | 当前模型 | 影响 |
| --- | --- | --- | --- |
| posts/pages 的 content_md、content_html | TEXT | 无长度 VARCHAR | 自动类型比较可能产生差异；测试 create_all 不是迁移结构 |
| post_tags 两个外键 | ON DELETE CASCADE | 未声明 ondelete | 直接以模型建库的删除行为不同 |
| password_reset_tokens.user_id | ON DELETE CASCADE | 未声明 ondelete | 业务手动清理不能替代模型与数据库一致性 |
| sms_verification_codes.created_at、updated_at | NOT NULL | nullable=True | 测试模型允许的空值可能在迁移库被拒绝 |
| posts.slug、tags.slug、pages.slug | 独立唯一约束 + 普通 slug 索引 | 唯一 slug 索引 | 两者均表达唯一性，但数据库对象布局不同 |
| ai_skill.name | 唯一约束 + 唯一索引 | 唯一索引 | 迁移目标存在重复唯一性结构 |
| login_log.created_at、operation_log.created_at | 各有显式索引 | 未声明索引 | 模型建库缺少迁移中的日志时间索引 |
| server defaults | 多列在迁移中声明 | 模型仅配置应用 default | 直接 SQL 插入与 ORM 插入默认行为不同 |

最后一项涵盖 users.is_active、posts.is_pinned、site_settings.value、ai_provider.enabled/is_default、ai_skill.enabled、ai_usage_log 三个计数字段、sms_verification_codes.purpose、login_log.success；具体值见字段表。时间字段没有数据库 now() 默认。

现有 [测试夹具](../apps/api/tests/conftest.py) 使用 SQLite 内存库和模型 create_all，不执行 Alembic。它不能替代 PostgreSQL 对迁移、外键、长度约束及索引的一致性验收；该套件已通过；另有隔离 PostgreSQL18.4 空库迁移与关键约束验证，两者均不替代生产数据升级验收。

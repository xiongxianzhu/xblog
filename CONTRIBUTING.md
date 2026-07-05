<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/项目-xblog-181717?style=for-the-badge&logo=github&logoColor=white" alt="xblog"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT"/></a>
</p>

<h1 align="center">参与贡献</h1>

<p align="center">
  <strong>感谢你对 xblog 的关注</strong><br/>
  <sub>Issue · Pull Request · 文档改进 · 缺陷反馈</sub>
</p>

<p align="center">
  <a href="docs/git-workflow.md"><b>Git 工作流详解</b></a>
  &nbsp;·&nbsp;
  <a href="AGENT.md"><b>AGENT.md</b></a>
  &nbsp;·&nbsp;
  <a href="docs/prd-xblog.md"><b>PRD</b></a>
</p>

<p align="center"><sub>— · — · —</sub></p>

---

## 开始之前

1. 阅读 [README.md](README.md) 完成本地环境搭建。
2. 较大改动前先浏览 [docs/prd-xblog.md](docs/prd-xblog.md) 或开 Issue 讨论。
3. **切勿**提交 `backend/.env`、`frontend/.env`、密钥、私人数据或 `uploads/` 用户文件。

---

## 协作流程（概览）

```text
Fork / Clone → 建分支 → 开发 → 本地检查 → Push → 开 Pull Request → Review → 合并
```

| 步骤 | 说明 |
|------|------|
| 1 | 从 `main` 拉最新代码 |
| 2 | 按规范创建分支（见下表） |
| 3 | 小步提交，信息清晰 |
| 4 | 通过质量检查后再提 PR |
| 5 | 在 PR 中说明动机、改动范围与测试方式 |
| 6 | 维护者 Review 通过后合并 |

完整说明 → **[docs/git-workflow.md](docs/git-workflow.md)**

---

## 分支命名

从 `main` 切出，使用 **小写 + 连字符**：

| 前缀 | 用途 | 示例 |
|------|------|------|
| `feat/` | 新功能 | `feat/giscus-theme-sync` |
| `fix/` | 缺陷修复 | `fix/isr-theme-stale` |
| `docs/` | 仅文档 | `docs/git-workflow` |
| `refactor/` | 重构（无行为变更） | `refactor/api-client` |
| `test/` | 测试 | `test/post-service` |
| `chore/` | 杂项维护 | `chore/deps-bump` |
| `ci/` | CI / 自动化 | `ci/github-actions` |
| `build/` | 构建 / 依赖 | `build/uv-lock` |

**不要**直接在 `main` 上堆叠无关改动。

---

## Commit 消息

采用 [Conventional Commits](https://www.conventionalcommits.org/)，**描述使用简体中文**。

```text
<type>[可选范围]: <简短描述>

[可选正文]

[可选页脚]
```

### 常用 type

| type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 缺陷修复 |
| `docs` | 文档 |
| `style` | 格式 / 样式（不改逻辑） |
| `refactor` | 重构 |
| `perf` | 性能 |
| `test` | 测试 |
| `build` | 构建 / 依赖 |
| `ci` | CI 配置 |
| `chore` | 其他维护 |

### 示例

```text
feat: 支持 Giscus 评论与主题环境变量
fix: 修复公开站主题 ISR 缓存未刷新
docs: 补充 Git 工作流与 PR 模板
```

---

## Pull Request

- 一个 PR 只做 **一件事**（功能 / 修复 / 文档择一）。
- 标题与 commit 风格一致，使用简体中文。
- 填写 [PR 模板](.github/PULL_REQUEST_TEMPLATE.md) 中的测试说明。
- 涉及 UI 请附截图；涉及 API 请说明端点与示例。
- 数据库结构变更 **必须** 含 Alembic 迁移。

### 合并方式

维护者默认使用 **Squash merge**，保持 `main` 历史简洁。合并前请确保 commit 消息可作为最终说明。

---

## 提交前检查

```bash
# 后端
cd backend && make check

# 前端
cd frontend && pnpm lint && pnpm build
```

---

## 报告问题

| 类型 | 方式 |
|------|------|
| Bug | [Bug 报告模板](.github/ISSUE_TEMPLATE/bug_report.yml) |
| 功能建议 | [功能建议模板](.github/ISSUE_TEMPLATE/feature_request.yml) |

Issue 请用 **中文或英文** 均可，描述复现步骤与环境。

---

## 行为准则

- 尊重维护者与贡献者的时间；讨论对事不对人。
- 不提交恶意代码、Spam 或与项目无关的 PR。
- 发现安全漏洞请 **不要** 公开 Issue，可通过仓库维护者私下联系。

---

<p align="center">
  <sub>再次感谢你的贡献 · <a href="LICENSE">MIT License</a></sub>
</p>

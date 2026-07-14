---
title: Skills管理
date: 2026-07-14
summary: 记录个人使用和管理Skills的经验
tags: [Skills]
status: Completed 
---


随着 Claude Code、Codex、Cursor 等 Coding Agent 开始支持 Agent Skills，我们可以把常用的工作流程整理成一个个独立的 `SKILL.md`，例如：

* 根据代码变更更新 README
* 使用 TDD 实现功能
* 分析和修复 Bug
* 根据 JD 生成定制化简历
* 审查 Pull Request
* 生成项目文档

当 Skill 数量逐渐增多，或者我们开始收集其他开发者编写的 Skill，就需要解决几个问题：

1. Skill 应该怎么安装？
2. `npm`、`npx` 分别是什么？
3. Skill 被安装到哪里？
4. `skills-lock.json` 有什么作用？
5. 如何创建自己的 `My-Skills` 仓库？
6. 如何更新和恢复第三方 Skill？
7. 如何处理版本、版权和安全问题？

本文将从最基础的命令开始，介绍一套适合个人长期维护的 Skill 管理方式。

> 本文以 2026 年 7 月的 `skills` CLI 1.5.x 行为为例。该工具仍在快速迭代，部分实验命令未来可能发生变化。

---

## 1. 什么是 Agent Skill

Agent Skill 可以理解为一份提供给 AI Agent 的可复用工作说明书。

一个最简单的 Skill 通常只有一个文件：

```text
update-project/
└── SKILL.md
```

`SKILL.md` 一般由两部分组成：

```markdown
---
name: update-project
description: Update project documentation based on recent code changes.
---

# Update Project

## Workflow

1. Inspect recent Git changes.
2. Identify features and structural changes.
3. Update the README.
4. Run documentation checks.
5. Create a conventional commit.
```

顶部的 YAML Frontmatter 至少需要包含：

```yaml
name: update-project
description: Update project documentation based on recent code changes.
```

其中：

* `name` 是 Skill 的名称。
* `description` 说明 Skill 做什么，以及模型应该在什么情况下使用它。
* 正文是 Agent 需要遵循的具体步骤、规则和完成标准。

`skills` CLI 将 Agent Skill 定义为带有 `name` 和 `description` Frontmatter 的 `SKILL.md`，并可以把它们安装到 Codex、Claude Code、Cursor 等 Agent 的对应目录中。

---

## 2. Node.js、npm 和 npx 是什么

安装 Skill 前，经常会看到这样的命令：

```bash
npx skills add owner/repo
```

要理解这条命令，需要先区分 Node.js、npm 和 npx。

### 2.1 Node.js

Node.js 是 JavaScript 的运行环境。

虽然我们使用 Skill 时不一定需要编写 JavaScript，但 `skills` CLI 本身是一个通过 npm 发布的 Node.js 命令行工具，因此需要先安装 Node.js。

安装 Node.js 后，可以检查版本：

```bash
node -v
```

例如：

```text
v24.4.1
```

### 2.2 npm

npm 是 Node.js 自带的包管理器。

它的作用类似于：

* Python 中的 `pip`
* Rust 中的 `cargo`
* Ubuntu 中的 `apt`

检查 npm：

```bash
npm -v
```

安装一个项目依赖：

```bash
npm install <package-name>
```

将工具安装为开发依赖：

```bash
npm install --save-dev skills
```

安装后，依赖信息会被记录在：

```text
package.json
package-lock.json
```

### 2.3 npx

`npx` 用于直接运行 npm 包提供的命令。

例如：

```bash
npx skills add owner/repo
```

可以拆解为：

```text
npx
└── 运行一个 npm 包提供的命令

skills
└── 要运行的 npm 包和命令名称

add
└── skills CLI 的子命令

owner/repo
└── Skill 来源
```

当 `skills` 没有安装在当前项目中时，`npx` 会临时从 npm 下载它，将其放入 npm 缓存，然后执行其中的命令。因此可能看到：

```text
Need to install the following packages:
skills@1.5.17
Ok to proceed? (y)
```

这是正常提示，不代表它正在把 Skill 本身安装成 npm 依赖。npm 官方文档说明，当请求的包不在当前项目依赖中时，`npx` 会把它安装到 npm 缓存目录，并在执行前显示确认提示。

可以跳过确认：

```bash
npx --yes skills@latest add owner/repo
```

需要注意，属于 `npx` 的参数必须写在包名之前：

```bash
# 正确
npx --yes skills@latest add owner/repo

# 这里的 --yes 会被传给 skills，而不是 npx
npx skills@latest add owner/repo --yes
```

`skills` 自己也有 `--yes` 参数，所以在实际命令中可能同时出现：

```bash
npx --yes skills@latest add owner/repo --yes
```

前一个 `--yes` 跳过 npx 的包安装确认，后一个 `--yes` 跳过 `skills` CLI 的交互确认。npm 官方文档也说明，使用 `npx` 时，它自己的选项需要出现在第一个位置参数之前。

---

## 3. 临时运行还是安装到项目

使用 `skills` CLI 有两种方式。

### 3.1 每次通过 npx 临时运行

```bash
npx skills@latest add owner/repo
```

优点：

* 不需要初始化 npm 项目。
* 命令简单。
* 总是可以请求最新版。

缺点：

* 可能反复出现临时安装提示。
* 不同时间运行时，CLI 版本可能不同。
* 团队成员使用的 CLI 版本可能不一致。

这种方式适合偶尔安装一两个 Skill。

### 3.2 将 skills CLI 固定为项目依赖

对于专门维护 Skill 的仓库，更推荐：

```bash
npm init -y
npm install --save-dev skills@latest
```

仓库会生成：

```text
My-Skills/
├── node_modules/
├── package.json
└── package-lock.json
```

之后运行：

```bash
npx skills add owner/repo
```

`npx` 会优先使用当前项目中安装的 `skills`，不再临时下载另一个版本。

其中：

* `package.json` 声明项目使用了 `skills`。
* `package-lock.json` 锁定 `skills` CLI 及其 npm 依赖的具体版本。
* `node_modules` 保存实际安装的 npm 包。

`.gitignore` 中应该添加：

```gitignore
node_modules/
```

应该提交到 Git 的文件包括：

```text
package.json
package-lock.json
```

新电脑克隆仓库后，可以使用：

```bash
npm ci
```

按照 `package-lock.json` 恢复相同版本的 CLI。

---

## 4. 使用 skills CLI 安装 Skill

最基本的命令是：

```bash
npx skills add <source>
```

例如安装 GitHub 官方的 Awesome Copilot Skills：

```bash
npx skills add github/awesome-copilot
```

也可以使用完整地址：

```bash
npx skills add https://github.com/github/awesome-copilot
```

`skills` CLI 支持 GitHub 简写、完整 GitHub URL、GitLab URL、任意 Git URL以及本地目录。

### 4.1 查看仓库里有哪些 Skill

在真正安装之前，可以先列出可用 Skill：

```bash
npx skills add github/awesome-copilot --list
```

### 4.2 只安装指定 Skill

```bash
npx skills add github/awesome-copilot --skill documentation-writer
```

也可以安装多个：

```bash
npx skills add github/awesome-copilot --skill documentation-writer --skill create-implementation-plan
```

### 4.3 指定目标 Agent

安装到 Codex：

```bash
npx skills add github/awesome-copilot --skill documentation-writer --agent codex
```

安装到 Claude Code：

```bash
npx skills add github/awesome-copilot --skill documentation-writer --agent claude-code
```

安装到多个 Agent：

```bash
npx skills add github/awesome-copilot --skill documentation-writer --agent codex --agent claude-code
```

### 4.4 非交互式安装

```bash
npx skills add github/awesome-copilot --skill documentation-writer --agent codex --yes
```

常用参数如下：

| 参数                | 作用                       |
| ----------------- | ------------------------ |
| `--list`          | 只列出 Skill，不安装            |
| `--skill <name>`  | 选择指定 Skill               |
| `--agent <name>`  | 指定目标 Agent               |
| `--global` 或 `-g` | 安装为全局 Skill              |
| `--yes` 或 `-y`    | 跳过交互确认                   |
| `--copy`          | 使用复制而不是符号链接              |
| `--all`           | 安装仓库中的全部 Skill 到所有 Agent |

这些参数均由当前 `skills` CLI 官方文档提供。

---

## 5. 项目级安装和全局安装

Skill 可以安装到当前项目，也可以安装到用户全局目录。

### 5.1 项目级安装

默认情况下：

```bash
npx skills add owner/repo --skill my-skill
```

会安装到当前项目对应的 Agent 目录中。

常见目录包括：

```text
Codex:
.agents/skills/

Claude Code:
.claude/skills/
```

项目级 Skill 的特点是：

* 只影响当前项目。
* 可以与项目代码一起提交。
* 团队成员可以共享。
* 可以根据不同项目使用不同版本。

### 5.2 全局安装

添加 `--global`：

```bash
npx skills add owner/repo --skill my-skill --global
```

全局 Skill 的特点是：

* 所有项目都可以使用。
* 更适合通用个人习惯。
* 不会自动随某个项目仓库分发。

通常建议：

* 项目专属工作流使用项目级安装。
* 通用的个人 Skill 使用全局安装。
* 需要版本管理和团队共享的 Skill 优先使用项目级安装。

`skills` CLI 官方将项目级安装定位为可随项目提交和共享的方式，将全局安装定位为跨项目可用的用户级方式。

---

## 6. Windows 下的符号链接问题

`skills` CLI 默认推荐使用符号链接，让不同 Agent 指向同一份 Skill。

这样可以避免：

```text
.agents/skills/my-skill/
.claude/skills/my-skill/
.cursor/skills/my-skill/
```

各自保存一份独立副本。

但是 Windows 创建符号链接时，可能受到以下因素影响：

* Windows 开发者模式是否开启
* 当前终端是否有权限
* 文件系统是否支持符号链接
* 公司设备的安全策略

遇到符号链接权限问题，可以直接使用复制模式：

```bash
npx skills add owner/repo --skill my-skill --copy
```

复制模式会为目标 Agent 创建独立副本，兼容性更好，但后续更新时需要重新同步。

官方 CLI 同时支持 Symlink 和 Copy 两种安装方式，并提供 `--copy` 参数。

---

## 7. skills-lock.json 是什么

项目级安装 Skill 后，仓库根目录可能出现：

```text
skills-lock.json
```

它用于记录当前项目安装了哪些 Skill，以及这些 Skill 来自哪里。

示例：

```json
{
  "version": 1,
  "skills": {
    "documentation-writer": {
      "source": "github/awesome-copilot",
      "sourceType": "github",
      "skillPath": "skills/documentation-writer/SKILL.md",
      "computedHash": "c31f..."
    }
  }
}
```

常见字段包括：

| 字段             | 作用                             |
| -------------- | ------------------------------ |
| `source`       | Skill 的来源仓库                    |
| `sourceUrl`    | 原始远程地址，部分 Git 来源会记录            |
| `sourceType`   | 来源类型，例如 `github`、`git`、`local` |
| `ref`          | 安装时使用的分支、标签或 Git ref           |
| `skillPath`    | Skill 在源仓库中的路径                 |
| `computedHash` | Skill 文件夹内容的 SHA-256 哈希        |

项目级 `skills-lock.json` 被设计为应当提交到版本控制中，并且会按照 Skill 名称排序，以减少 Git 合并冲突。

### 7.1 它和 package-lock.json 的区别

这两个 Lock 文件管理的是不同对象。

| 文件                  | 管理内容                    |
| ------------------- | ----------------------- |
| `package-lock.json` | `skills` CLI 和其他 npm 依赖 |
| `skills-lock.json`  | 通过 CLI 安装的 Agent Skills |

可以理解为：

```text
package-lock.json
└── 锁定“管理 Skill 的工具”

skills-lock.json
└── 记录“被管理的 Skill”
```

因此，在 `My-Skills` 仓库中，通常应该同时提交：

```text
package.json
package-lock.json
skills-lock.json
```

---

## 8. skills-lock.json 是否等于严格版本锁

不完全等于。

`skills-lock.json` 会保存 Skill 的来源、路径、ref 和内容哈希，但如果安装时使用的是仓库默认分支：

```bash
npx skills add github/awesome-copilot
```

那么后续恢复时，可能从最新的默认分支重新获取内容。

换句话说：

```text
skills-lock.json
≠ 一定锁定到某个 Git Commit
```

如果追求严格可复现，可以使用：

* Git Tag
* 固定分支
* Commit SHA

例如直接指定 Commit 对应的仓库路径：

```bash
npx skills add https://github.com/owner/repo/tree/<commit-sha>/skills/my-skill
```

两种常见策略如下。

### 跟随上游更新

```bash
npx skills add owner/repo --skill my-skill
```

适合：

* 希望持续获得作者更新
* 可以接受偶尔检查变更
* 个人使用的通用 Skill

### 固定版本

```bash
npx skills add https://github.com/owner/repo/tree/<commit-sha>/path/to/skill
```

适合：

* 团队项目
* CI 环境
* 对结果可复现性要求较高
* 修改过第三方 Skill，不希望被上游覆盖

---

## 9. 创建自己的 My-Skills 仓库

假设需要创建一个专门收集常用 Skill 的仓库：

```text
My-Skills
```

首先创建并初始化：

```bash
mkdir My-Skills
cd My-Skills

git init
npm init -y
npm install --save-dev skills@latest
```

创建 `.gitignore`：

```gitignore
node_modules/
```

此时结构大致为：

```text
My-Skills/
├── node_modules/
├── .gitignore
├── package.json
└── package-lock.json
```

---

## 10. 两种 My-Skills 管理模式

创建个人 Skill 仓库时，需要先明确目标：

1. 只为自己保存一套安装清单。
2. 把仓库作为 Skill 集合提供给其他人安装。

这两种模式的目录结构不同。

---

## 11. 模式一：个人 Skill 环境仓库

这种模式最简单，适合在多台电脑之间同步自己的 Skill 环境。

在仓库根目录运行：

```bash
npx skills add github/awesome-copilot --skill documentation-writer --agent codex
```

得到：

```text
My-Skills/
├── .agents/
│   └── skills/
│       └── documentation-writer/
│           └── SKILL.md
├── node_modules/
├── package.json
├── package-lock.json
└── skills-lock.json
```

继续安装其他 Skill：

```bash
npx skills add mattpocock/skills --skill tdd --agent codex
```

`skills-lock.json` 会继续增加记录，而不是被整体覆盖。

这种模式中：

```text
skills-lock.json
```

是第三方 Skill 的来源清单，而：

```text
.agents/skills/
```

是当前安装后的实际文件。

### 建议提交哪些文件

推荐提交：

```text
package.json
package-lock.json
skills-lock.json
README.md
```

是否提交 `.agents/skills/` 取决于需求。

#### 不提交 `.agents/skills/`

优点：

* 仓库更干净。
* 不重复保存第三方文件。
* 可以依靠 Lock 重新恢复。

缺点：

* 恢复依赖远程仓库仍然存在。
* 上游默认分支变化时，内容可能不同。
* 实验恢复命令未来可能变化。

#### 提交 `.agents/skills/`

优点：

* 克隆后可以直接使用。
* 即使上游仓库消失，仍保留一份副本。
* 可以清楚审查 Skill 的实际内容。

缺点：

* 可能涉及第三方许可证和再分发问题。
* 更新后会产生较大的 Git Diff。
* 需要自己处理上游同步。

个人私有仓库中，提交实际 Skill 文件通常比较方便；公开仓库则必须先检查许可证。

---

## 12. 模式二：可供他人安装的 Skill 集合

假设希望别人能够执行：

```bash
npx skills add BoBo-Ye/My-Skills
```

这时不能只把第三方 Skill 记录在 `skills-lock.json` 中。

原因是：

```text
skills-lock.json
```

描述的是当前项目安装的依赖，不会自动变成一个可递归安装的 Skill 包管理清单。

为了让外部用户扫描到 Skill，需要把要发布的 Skill 放在标准目录中：

```text
My-Skills/
├── skills/
│   ├── documentation-writer/
│   │   └── SKILL.md
│   ├── tdd/
│   │   └── SKILL.md
│   └── update-project/
│       └── SKILL.md
├── ATTRIBUTION.md
├── README.md
├── package.json
└── package-lock.json
```

之后别人可以运行：

```bash
npx skills add BoBo-Ye/My-Skills --list
```

查看可安装 Skill：

```text
documentation-writer
tdd
update-project
```

然后安装：

```bash
npx skills add BoBo-Ye/My-Skills --skill documentation-writer
```

`skills` CLI 会优先扫描仓库中的 `skills/` 目录以及各 Agent 的标准 Skill 目录。

---

## 13. 推荐的 My-Skills 目录结构

如果既想跟踪第三方来源，又希望发布一个整理后的 Skill 集合，可以使用两层结构：

```text
My-Skills/
├── upstream/
│   ├── .agents/
│   │   └── skills/
│   └── skills-lock.json
│
├── skills/
│   ├── documentation-writer/
│   ├── tdd/
│   └── update-project/
│
├── scripts/
│   └── sync-skills.ps1
│
├── .gitignore
├── ATTRIBUTION.md
├── README.md
├── package.json
└── package-lock.json
```

其中：

### `upstream/`

用于通过官方 CLI 管理第三方来源：

```bash
cd upstream

npx skills add github/awesome-copilot --skill documentation-writer --agent codex
npx skills add mattpocock/skills --skill tdd --agent codex
```

这里生成：

```text
upstream/
├── .agents/skills/
└── skills-lock.json
```

### `skills/`

保存经过审查、准备公开发布的 Skill。

```text
skills/
├── documentation-writer/
├── tdd/
└── update-project/
```

### `ATTRIBUTION.md`

记录第三方 Skill 的作者、来源和许可证：

```markdown
# Third-Party Skills

## documentation-writer

- Author: GitHub
- Source: github/awesome-copilot
- Original path: skills/documentation-writer
- License: See upstream repository
- Modifications: None

## tdd

- Author: Matt Pocock
- Source: mattpocock/skills
- Original path: skills/engineering/tdd
- License: See upstream repository
- Modifications: Adjusted for local project conventions
```

这种结构将“上游依赖管理”和“对外发布内容”分开，比较适合长期维护。

---

## 14. 更新 Skill

查看当前安装的 Skill：

```bash
npx skills list
```

更新项目级 Skill：

```bash
npx skills update --project
```

简写：

```bash
npx skills update -p
```

只更新指定 Skill：

```bash
npx skills update documentation-writer --project
```

跳过确认：

```bash
npx skills update --project --yes
```

更新全局 Skill：

```bash
npx skills update --global
```

当前 `skills` CLI 支持更新全部 Skill、指定 Skill，并可通过 `--project` 或 `--global` 选择更新范围。

更新后应该检查：

```bash
git status
git diff
```

重点关注：

* `skills-lock.json` 是否变化
* Skill 正文是否出现新的工具调用
* 是否新增脚本
* 是否修改删除文件的规则
* 是否改变权限或网络访问行为
* 自己之前的本地修改是否被覆盖

确认后再提交：

```bash
git add .
git commit -m "chore: update agent skills"
```

---

## 15. 在新电脑上恢复 Skill

首先克隆仓库：

```bash
git clone <your-repository-url>
cd My-Skills
```

恢复相同版本的 `skills` CLI：

```bash
npm ci
```

如果仓库已经提交了实际 Skill 文件，通常不需要额外操作。

如果只提交了 `skills-lock.json`，当前 CLI 提供：

```bash
npx skills experimental_install
```

用于根据当前目录中的 `skills-lock.json` 恢复项目 Skill。

该命令目前仍带有 `experimental_` 前缀，说明接口尚未完全稳定。当前 CLI 帮助信息将其定义为“从 `skills-lock.json` 恢复 Skill”。

完整恢复流程：

```bash
git clone <your-repository-url>
cd My-Skills
npm ci
npx skills experimental_install
```

恢复后检查：

```bash
npx skills list
git status
```

---

## 16. 删除 Skill

交互式删除：

```bash
npx skills remove
```

删除指定 Skill：

```bash
npx skills remove documentation-writer
```

删除多个：

```bash
npx skills remove documentation-writer tdd
```

删除全局 Skill：

```bash
npx skills remove --global documentation-writer
```

删除全部：

```bash
npx skills remove --all
```

CLI 删除项目级 Skill 时，还应同步更新对应的 Lock 记录。删除完成后建议检查：

```bash
git diff skills-lock.json
```

官方 CLI 提供 `remove`、`rm`、指定 Skill、全局范围和全部删除等操作。

---

## 17. 创建自己的 Skill

可以通过 CLI 创建模板。

进入 `skills/`：

```bash
cd skills
```

创建一个新 Skill：

```bash
npx skills init update-project
```

生成：

```text
skills/
└── update-project/
    └── SKILL.md
```

初始文件类似：

```markdown
---
name: update-project
description: A brief description of what this skill does
---

# update-project

Instructions for the agent to follow when this skill is activated.
```

之后需要补充：

* 明确的触发条件
* 输入和输出
* 按顺序执行的步骤
* 每一步的完成标准
* 需要读取的参考文件
* 失败时如何处理
* 哪些内容不能修改
* 最终如何向用户汇报

一个较完整的结构可以是：

````markdown
---
name: update-project
description: Update project documentation after feature or structural changes.
---

# Update Project

## Purpose

Keep the README and project documentation synchronized with the current codebase.

## Workflow

### 1. Inspect Changes

Run:

```bash
git status
git diff --stat
git log --oneline -10
````

Identify new features, removed modules, dependency changes, and structural changes.

### 2. Update Documentation

Update only documentation affected by the current changes.

### 3. Validate

Confirm that all referenced paths and commands still exist.

### 4. Commit

Create a conventional commit:

```text
docs: update project documentation
```

## Completion Criteria

* Every meaningful code change is reflected in documentation.
* No unrelated documentation is rewritten.
* All referenced paths exist.
* The working tree contains only intended changes.

````

---

## 18. README 中记录 Skill 清单

`My-Skills` 仓库最好维护一个清晰的 Skill 表格：

```markdown
# My Skills

A curated collection of Agent Skills used in my daily development workflow.

## Skills

| Skill | Category | Source | Description |
|---|---|---|---|
| `update-project` | Documentation | Original | Update README after development |
| `documentation-writer` | Documentation | GitHub | Write structured technical documentation |
| `tdd` | Engineering | Matt Pocock | Implement features using red-green-refactor |
````

还可以标记修改状态：

```markdown
| Skill | Source | Status |
|---|---|---|
| `documentation-writer` | Third-party | Unmodified |
| `tdd` | Third-party | Locally adapted |
| `update-project` | Original | Maintained |
```

这样可以快速判断：

* 哪些是自己编写的
* 哪些来自第三方
* 哪些经过修改
* 哪些可以直接从上游更新
* 哪些需要手动合并

---

## 19. 第三方 Skill 的许可证问题

从其他仓库复制 Skill 到自己的公开仓库，本质上属于重新分发第三方内容。

因此需要检查：

1. 上游仓库是否有 `LICENSE`
2. 许可证是否允许复制和修改
3. 是否要求保留版权声明
4. 是否要求使用相同许可证
5. 是否需要注明修改内容

没有明确许可证的仓库，不代表内容可以随意复制和公开发布。

比较稳妥的做法是：

* 私有仓库：保存个人使用副本。
* 公开仓库：只收录具有明确许可证的 Skill。
* 始终保留作者和来源信息。
* 修改后明确注明 `Modifications`。
* 不删除原作者版权声明。

`ATTRIBUTION.md` 应该和 Skill 文件一起提交。

---

## 20. Skill 的安全问题

Skill 虽然通常只是 Markdown，但它会指导具有工具权限的 Agent 执行操作，例如：

* 运行终端命令
* 删除文件
* 修改 Git 仓库
* 创建 Commit
* Push 到远程仓库
* 访问网络
* 读取环境变量
* 调用 MCP 工具
* 操作 Issue 和 Pull Request

因此，安装 Skill 前不应该只看名称和描述。

至少需要检查：

```text
SKILL.md
scripts/
references/
agents/
```

重点搜索：

```text
rm
del
Remove-Item
git push
curl
wget
Invoke-WebRequest
.env
token
credential
secret
sudo
administrator
```

推荐流程：

```text
列出 Skill
    ↓
查看源仓库
    ↓
检查许可证
    ↓
阅读 SKILL.md
    ↓
检查附带脚本
    ↓
项目级安装
    ↓
观察 Git Diff
    ↓
确认后提交
```

`skills-lock.json` 记录的是来源和内容状态，不等于安全审计结果。

---

## 21. 常见问题

### 21.1 为什么每次都提示安装 skills@1.5.17

因为当前项目没有本地安装 `skills`，`npx` 正在临时调用 npm 包。

解决方法一：

```bash
npx --yes skills@1.5.17 add owner/repo
```

解决方法二，推荐用于长期仓库：

```bash
npm install --save-dev skills@1.5.17
```

之后：

```bash
npx skills add owner/repo
```

### 21.2 为什么没有生成 skills-lock.json

常见原因包括：

* 使用了全局安装 `--global`
* 当前 CLI 版本较旧
* 安装没有真正完成
* 当前目录不可写
* Skill 已经存在，安装被取消
* 命令是在其他目录中运行的

先确认当前目录：

```bash
cd
dir
```

再检查安装结果：

```bash
npx skills list
```

### 21.3 skills-lock.json 应该放进 .gitignore 吗

不应该。

项目级 `skills-lock.json` 本来就是用于版本控制和团队恢复的，应当提交到 Git。

### 21.4 node_modules 应该提交吗

不应该。

提交：

```text
package.json
package-lock.json
```

忽略：

```text
node_modules/
```

### 21.5 为什么修改 Skill 后更新会被覆盖

第三方 Skill 的更新通常会重新获取上游版本。

对于经过本地修改的 Skill，可以：

1. 复制到自己维护的 `skills/`。
2. 修改 Skill 名称，避免与上游重名。
3. 在 `ATTRIBUTION.md` 中注明来源和修改。
4. 不再将它作为自动更新的上游副本。
5. 或使用 Git Commit SHA 固定上游版本。

### 21.6 My-Skills 仓库中有 skills-lock.json，别人安装时会自动安装全部依赖吗

不会。

下面的命令：

```bash
npx skills add BoBo-Ye/My-Skills
```

主要扫描仓库中的可发现 `SKILL.md`。

它不会把仓库中的 `skills-lock.json` 当成类似 `package.json` 的递归依赖清单。

因此，要让别人安装你的 Skill 集合，需要把准备发布的 Skill 放在：

```text
skills/<skill-name>/SKILL.md
```

---

## 22. 推荐的日常工作流

### 添加 Skill

```bash
cd My-Skills

npx skills add github/awesome-copilot --list

npx skills add github/awesome-copilot --skill documentation-writer --agent codex

git status
git diff
```

### 检查并提交

```bash
git add package.json package-lock.json skills-lock.json .agents skills
git commit -m "feat: add documentation writer skill"
```

### 更新 Skill

```bash
npx skills update --project
git diff
git commit -am "chore: update agent skills"
```

### 新电脑恢复

```bash
git clone <repository>
cd My-Skills
npm ci
npx skills experimental_install
```

### 发布自己的 Skill 集合

```bash
npx skills add . --list
```

确认本地可以被扫描后推送到 GitHub：

```bash
git push
```

其他人即可运行：

```bash
npx skills add <username>/My-Skills
```

---

## 23. 最终目录建议

对于一个同时包含原创和第三方 Skill 的公开仓库，推荐：

```text
My-Skills/
├── skills/
│   ├── documentation-writer/
│   │   └── SKILL.md
│   ├── tdd/
│   │   └── SKILL.md
│   └── update-project/
│       └── SKILL.md
│
├── upstream/
│   ├── .agents/
│   │   └── skills/
│   └── skills-lock.json
│
├── scripts/
│   └── sync-skills.ps1
│
├── .gitignore
├── ATTRIBUTION.md
├── LICENSE
├── README.md
├── package.json
└── package-lock.json
```

各部分职责如下：

| 路径                          | 职责                |
| --------------------------- | ----------------- |
| `skills/`                   | 对外发布的 Skill       |
| `upstream/`                 | 通过 CLI 管理的第三方上游副本 |
| `upstream/skills-lock.json` | 记录第三方 Skill 来源    |
| `scripts/`                  | 更新和同步脚本           |
| `ATTRIBUTION.md`            | 第三方作者、来源和许可证      |
| `package-lock.json`         | 固定 skills CLI 版本  |
| `README.md`                 | 展示 Skill 清单和安装方式  |

---

## 总结

Agent Skill 管理可以分成三个层次：

```text
npm / package-lock.json
└── 管理 skills CLI

skills CLI / skills-lock.json
└── 管理安装的第三方 Skill

My-Skills / skills/
└── 管理自己准备长期使用或公开发布的 Skill 集合
```

对于个人使用，最简单的方式是：

```bash
npx skills add owner/repo --skill skill-name
```

对于长期维护，建议在 `My-Skills` 中固定 CLI：

```bash
npm install --save-dev skills
```

并提交：

```text
package.json
package-lock.json
skills-lock.json
```

对于公开发布的 Skill 集合，则需要将实际 Skill 放入：

```text
skills/<skill-name>/SKILL.md
```

同时维护：

```text
ATTRIBUTION.md
LICENSE
README.md
```

最重要的是，不要把 Skill 只当成普通 Markdown 文件。它实际上是一组会影响 Agent 行为、工具调用和文件操作的工程指令。一个可靠的 Skill 管理流程不仅要解决“如何安装”，还要同时考虑：

* 来源追踪
* 版本固定
* 更新审查
* 多设备恢复
* 第三方许可证
* 工具权限和安全性

只有这些问题都被纳入管理后，Skill 才能真正成为可复用、可维护、可共享的 Agent 工程资产。

---

## 参考资料

* npm 官方 `npx` 文档：说明本地与远程 npm 包执行、缓存安装和确认提示。
* Vercel Labs `skills` CLI：安装来源、命令参数、更新、删除和 Agent 目录说明。
* `skills` CLI 项目 Lock 实现：`skills-lock.json` 的结构、存放位置和版本控制定位。
* `skills` CLI 帮助信息：当前 `experimental_install` 恢复命令。

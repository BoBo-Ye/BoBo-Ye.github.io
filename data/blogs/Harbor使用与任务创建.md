---
title: Harbor 使用与任务创建
date: 2026-08-19
summary: 从 Harbor 的核心概念开始，通过一个完整示例学习如何编写环境、参考解法和验证器，并运行自己的 Agent 任务。
tags: [Agent, Benchmark, Harbor]
status: Completed
---

Harbor 是一个在容器环境中评测和优化 AI Agent 的框架，可以用于运行评测、生成 rollout、准备训练数据和优化提示词。它把任务说明、运行环境、Agent 和评分逻辑拆成独立模块，让同一个任务可以交给不同 Agent 和模型执行，也让每次实验更容易复现。

本文先介绍 Harbor 的核心概念和特色，然后从零创建一个最小但完整的任务。完成后，我们将拥有一个可以通过 Oracle 自检、可以交给真实 Agent 执行、也可以在 Viewer 中分析结果的任务目录。

> 本文根据 2026 年 8 月的 Harbor 文档整理。Harbor 仍在快速迭代，如果本地命令与本文不同，应优先查看 `harbor --help`、`harbor task --help`、`harbor run --help` 和[官方文档](https://www.harborframework.com/docs)。本文中的 Harbor 指 Agent 评测框架，不是同名的 OCI 镜像仓库项目。

---

## 1. Harbor 的核心概念

### 1.1 Task

Task 是一个可以独立运行和评分的任务，通常包括：

* 给 Agent 阅读的任务说明。
* Agent 操作的容器环境。
* 检查任务是否完成的验证脚本。
* 可选的参考解法。

一个标准 Task 的目录如下：

```text
hello-harbor/
├── instruction.md
├── task.toml
├── environment/
│   └── Dockerfile
├── solution/
│   └── solve.sh
└── tests/
    └── test.sh
```

### 1.2 Agent

Agent 是实际执行任务的程序。它会读取 `instruction.md`，进入任务容器，通过终端命令和工具完成工作。Harbor 内置了多种常见 Agent，也允许通过 Python 接口接入自己的 Agent。

### 1.3 Environment

Environment 是 Agent 工作的隔离环境，通常使用 Dockerfile 定义。任务需要的软件、系统工具和初始文件都应在这里准备，而不是假设运行者的电脑已经安装。

本地调试通常使用 Docker；批量实验也可以切换到 Daytona、Modal、E2B 等云端 sandbox provider。

### 1.4 Solution 与 Oracle

`solution/solve.sh` 是任务作者提供的参考解法。Oracle Agent 会执行这个脚本，用来检查：

* 环境是否包含完成任务所需的工具。
* 任务是否真的可以完成。
* Verifier 能否正确识别成功结果。

Oracle 通过不代表任务设计一定完美，但 Oracle 失败通常说明任务本身还不适合交给真实 Agent。

### 1.5 Verifier 与 Reward

Verifier 在 Agent 结束后运行 `tests/test.sh`，检查容器中的最终状态，并向 `/logs/verifier/` 写入 reward。

最简单的评分文件是：

```text
/logs/verifier/reward.txt
```

内容通常为 `1` 或 `0`。需要多个评分指标时，也可以写入 `reward.json`。

### 1.6 Trial 与 Job

Trial 是某个 Agent 对某个 Task 的一次独立尝试，也可以理解为一次 rollout。Trial 会留下 Agent 轨迹、Verifier 日志、耗时、token 用量和 reward。

Job 是一组 Trial。一次 Job 可以包含多个任务、模型或重复实验，并控制它们的并发执行。

整体流程可以概括为：

```text
Task → 创建容器 → Agent 执行 → Verifier 检查 → Trial Reward → Job 汇总
```

### 1.7 Dataset

Dataset 是多个 Task 的集合。先把单个任务开发和验证好，再把一组相关任务组织成 Dataset，就可以系统地比较不同 Agent 或模型。

---

## 2. Harbor 的特色

### 2.1 模块化

任务、Agent、模型和运行环境可以分别替换。同一个 Task 可以交给不同 Agent 运行，而不需要重写环境和评分逻辑。

### 2.2 容器化与可复现

Task 自己声明依赖、资源和网络策略。相比直接在宿主机执行脚本，容器环境更容易复现，也能限制 Agent 的操作范围。

### 2.3 自动记录执行过程

Harbor 会保存每次运行的配置、Agent 轨迹、Verifier 输出、reward、异常和性能信息。失败时可以区分是 Agent 没完成任务，还是镜像、网络、超时或测试脚本出了问题。

### 2.4 支持本地和云端运行

开发阶段可以使用本地 Docker 逐个调试任务；任务稳定后，可以切换云端 sandbox 并提高并发数。

### 2.5 易于扩展

Harbor 支持自定义 Agent、多步任务、资源限制、网络策略、独立 Verifier 环境、自定义指标和 LLM-as-a-Judge，适合构建自己的 Agent benchmark。

---

## 3. 安装 Harbor

### 3.1 准备 Docker

本地运行前需要安装并启动 Docker。检查 Docker CLI 和 daemon：

```bash
docker --version
docker info
```

`docker --version` 只说明 CLI 已安装；`docker info` 能正常返回信息，才说明 Docker daemon 已经启动。

### 3.2 安装 uv 和 Harbor

macOS 可以使用 Homebrew 安装 uv：

```bash
brew install uv
```

再安装 Harbor：

```bash
uv tool install harbor
```

检查安装结果：

```bash
harbor --version
harbor --help
harbor task --help
harbor run --help
```

升级 Harbor：

```bash
uv tool upgrade harbor
```

---

## 4. 从零创建一个 Harbor Task

下面创建一个名为 `hello-harbor` 的任务。Agent 需要生成 `/app/result.txt`，文件内容必须精确等于 `Hello, Harbor!` 并以换行结尾。

这个任务虽然简单，但包含了 Harbor Task 的全部基本组成部分。

### 4.1 初始化目录

```bash
harbor task init hello-harbor
```

如果当前 Harbor 版本使用统一初始化入口，可以根据 `harbor --help` 改用：

```bash
harbor init --task "example/hello-harbor"
```

初始化后进入任务目录：

```bash
cd hello-harbor
```

### 4.2 编写 instruction.md

```markdown
# Create a greeting file

Create a file at `/app/result.txt` whose complete content is exactly:

`Hello, Harbor!`

The file must end with a newline. Do not create the result at any other path.
```

任务说明应描述目标和约束，不应告诉 Agent 具体使用哪条命令。一个好的 instruction 应该：

* 明确最终产物和路径。
* 明确格式、边界条件和禁止事项。
* 只描述 Agent 能在环境中观察到的信息。
* 避免依赖任务作者脑中的隐含条件。

### 4.3 配置 task.toml

```toml
schema_version = "1.4"

[task]
name = "example/hello-harbor"
version = "1.0.0"
description = "Create a text file with an exact greeting."
authors = [{ name = "Your Name", email = "you@example.com" }]
keywords = ["files", "shell", "beginner"]

[metadata]
category = "file-operations"
difficulty_explanation = "The task requires creating one file with exact content."

[agent]
timeout_sec = 120.0

[verifier]
timeout_sec = 30.0

[environment]
os = "linux"
network_mode = "no-network"
build_timeout_sec = 300.0
cpus = 1
memory_mb = 512
storage_mb = 1024
```

几个重要字段：

| 字段 | 用途 |
| --- | --- |
| `task.name` | 任务的唯一名称，发布时通常使用 `组织/名称` |
| `task.version` | 任务内容版本 |
| `agent.timeout_sec` | Agent 最长执行时间 |
| `verifier.timeout_sec` | Verifier 最长执行时间 |
| `environment.os` | 容器目标系统，默认是 Linux |
| `environment.network_mode` | `public`、`no-network` 或 `allowlist` |
| `cpus`、`memory_mb`、`storage_mb` | 任务声明的资源需求 |

本例完全不需要网络，因此使用 `no-network`。如果任务需要下载依赖，应明确配置网络策略，不要无意间让测试结果依赖外部服务。

### 4.4 编写 environment/Dockerfile

```dockerfile
FROM ubuntu:24.04

WORKDIR /app
```

Dockerfile 定义 Agent 看到的初始环境。实际任务可以在这里：

* 安装系统包和语言运行时。
* 复制初始项目或数据。
* 创建工作目录和普通用户。
* 固定依赖版本。

不要把参考答案复制进环境，也不要在镜像中留下能直接推断答案的测试代码。

### 4.5 手动进入环境验证思路

在写自动解法前，可以启动交互式容器：

```bash
harbor task start-env -p . -e docker -a -i
```

进入容器后手动验证：

```bash
printf 'Hello, Harbor!\n' > /app/result.txt
cat /app/result.txt
exit
```

这一步用于确认工作目录、权限、依赖和预期解法在真实环境中成立。

### 4.6 编写 solution/solve.sh

```bash
#!/bin/bash
set -euo pipefail

printf 'Hello, Harbor!\n' > /app/result.txt
```

Solution 应该是稳定、非交互且可重复执行的。它的作用是证明任务可解，不是教真实 Agent 如何作答。

### 4.7 编写 tests/test.sh

```bash
#!/bin/bash
set -u

mkdir -p /logs/verifier
printf 'Hello, Harbor!\n' > /tmp/expected.txt

if cmp -s /app/result.txt /tmp/expected.txt; then
  echo 1 > /logs/verifier/reward.txt
else
  echo 0 > /logs/verifier/reward.txt
fi
```

Verifier 应检查最终结果，而不是检查 Agent 是否执行了某条特定命令。本例使用 `cmp` 同时检查文字内容和末尾换行。

路径尽量写成绝对路径。Harbor 会把相关目录映射到容器中的特殊位置：

| 路径 | 用途 |
| --- | --- |
| `/app` | 常见的 Agent 工作目录 |
| `/solution` | Oracle 运行时使用的参考解法目录 |
| `/tests` | Harbor 放置验证脚本的目录 |
| `/logs/agent` | Agent 日志目录 |
| `/logs/verifier` | Verifier 日志和 reward 目录 |

### 4.8 添加执行权限

回到任务目录的上一级，执行：

```bash
chmod +x hello-harbor/solution/solve.sh
chmod +x hello-harbor/tests/test.sh
```

脚本缺少执行权限是 Oracle 失败的常见原因之一。

---

## 5. 使用 Oracle 验证任务

```bash
harbor run -p ./hello-harbor -a oracle
```

Oracle 会创建任务环境、运行 `solution/solve.sh`，再执行 `tests/test.sh`。正确结果应得到 reward `1`。

如果 Oracle 失败，按以下顺序排查：

1. Docker 是否正常运行，镜像是否构建成功。
2. `solve.sh` 和 `test.sh` 是否有执行权限。
3. Dockerfile 是否安装了 Solution 和 Verifier 需要的工具。
4. Solution 写入的路径是否与 Verifier 检查的路径一致。
5. `test.sh` 是否确实写入 `/logs/verifier/reward.txt` 或 `reward.json`。
6. 超时、内存、磁盘或网络限制是否过严。

每次修改环境或验证逻辑后，都应重新运行 Oracle。

---

## 6. 使用真实 Agent 运行任务

Oracle 通过后，再使用真实 Agent：

```bash
harbor run \
  -p ./hello-harbor \
  -a "<agent>" \
  -m "<model>"
```

不同 Agent 使用不同的凭据和模型命名方式。通常先在当前终端设置 API Key，再把需要的环境变量传给 Agent；具体方式应查看对应 Agent 文档。

不要把 API Key 写入以下位置：

* `instruction.md`
* `task.toml` 的明文值
* Dockerfile
* Solution 或测试脚本
* Git 仓库中的 `.env` 文件

重复运行和并发运行：

```bash
harbor run \
  -p ./hello-harbor \
  -a "<agent>" \
  -m "<model>" \
  --n-attempts 3 \
  --n-concurrent 2
```

其中：

* `--n-attempts` 或 `-k` 表示每个 Task 独立运行多少次。
* `--n-concurrent` 或 `-n` 表示最多同时运行多少个 Trial。

任务开发阶段建议保持 `-k 1 -n 1`，先保证单次结果正确，再增加重复次数和并发数。

---

## 7. 查看运行结果

`harbor run` 默认把结果保存到 `jobs/`。启动 Viewer：

```bash
harbor view ./jobs
```

Viewer 中重点检查：

* Job 和 Trial 的最终 reward。
* Agent 的命令、工具调用和观察结果。
* Verifier 的标准输出和错误输出。
* 环境创建、Agent 执行和验证分别花费的时间。
* token 用量、异常和超时。

指定端口：

```bash
harbor view ./jobs --port 8090
```

调试真实 Agent 失败时，不要只看 reward。先判断是否存在镜像、网络、凭据、资源或 Verifier 异常，再分析 Agent 的行为。

---

## 8. 如何设计可靠的任务

### 8.1 Instruction 和 Verifier 保持一致

Verifier 检查的每个关键条件都应该能从 instruction 中合理推导。不要在测试里偷偷要求 Agent 完成未说明的工作。

### 8.2 验证结果，不绑定解法

如果目标是生成正确文件，就检查文件内容；不要要求 Agent 必须调用某条命令。否则任务测到的是对特定实现的模仿，而不是解决问题的能力。

### 8.3 保持评分确定性

相同结果应得到相同 reward。尽量避免把当前时间、随机网络状态或不固定版本的外部服务作为评分条件。

### 8.4 防止答案泄漏

Agent 不应看到 `solution/` 和私有评分逻辑。不要把答案、断言或测试期望值意外复制到 Agent 可读的环境中。

### 8.5 固定依赖版本

基础镜像、语言包和测试工具发生变化，可能让同一个 Task 在不同时间得到不同结果。正式任务应尽量固定关键依赖版本。

### 8.6 先小后大

推荐开发顺序：

1. 手动进入容器验证任务可完成。
2. 编写 Solution 和 Verifier。
3. 使用 Oracle 得到稳定的满分。
4. 使用一个真实 Agent 单次运行。
5. 重复运行检查稳定性。
6. 最后加入 Dataset 并提高并发。

### 8.7 区分任务失败与基础设施失败

Agent 没完成任务可以记为低 reward；镜像构建失败、凭据错误或 Verifier 崩溃则属于评测异常。分析 benchmark 时不应把两者混在一起。

---

## 9. 进阶能力

### 9.1 独立 Verifier 环境

默认情况下，Verifier 与 Agent 共用环境。如果评分代码需要保密、需要不同依赖，或者希望避免 Agent 修改测试工具，可以在 `task.toml` 中配置独立 Verifier 环境。

### 9.2 多指标 Reward

简单任务可以使用 `reward.txt`。如果希望同时记录正确率、格式、效率等多个指标，可以生成：

```json
{
  "accuracy": 1.0,
  "format": 1.0,
  "efficiency": 0.8
}
```

并保存到：

```text
/logs/verifier/reward.json
```

### 9.3 多步任务

长流程任务可以拆成多个顺序执行的 step。各 step 可以有自己的 instruction、测试和初始化逻辑，同时共享同一个任务环境。

### 9.4 Dataset

当多个 Task 都通过 Oracle 并完成稳定性检查后，再把它们组织为 Dataset。Dataset 适合统一运行、聚合指标、版本管理和分享。

### 9.5 自定义 Agent

Harbor 支持外部 Agent 和安装到容器内运行的 Agent。接入自己的 Agent 后，可以复用已有 Task、Verifier、环境和结果分析工具。

---

## 10. 常用命令速查

| 目的 | 命令 |
| --- | --- |
| 查看 Harbor 帮助 | `harbor --help` |
| 查看任务命令 | `harbor task --help` |
| 查看运行参数 | `harbor run --help` |
| 创建任务 | `harbor task init <task-name>` |
| 启动交互式环境 | `harbor task start-env -p <path> -e docker -a -i` |
| Oracle 自检 | `harbor run -p <path> -a oracle` |
| 使用真实 Agent | `harbor run -p <path> -a <agent> -m <model>` |
| 设置重复次数 | `--n-attempts <n>` 或 `-k <n>` |
| 设置并发数 | `--n-concurrent <n>` 或 `-n <n>` |
| 查看结果 | `harbor view ./jobs` |
| 指定 Job 配置 | `harbor run -c ./job.yaml` |

## 参考资料

* [Harbor 官方文档](https://www.harborframework.com/docs)
* [Harbor 核心概念](https://www.harborframework.com/docs/core-concepts)
* [Harbor Task 教程](https://www.harborframework.com/docs/tasks/task-tutorial)
* [Harbor Task 结构](https://www.harborframework.com/docs/tasks)
* [运行评测与查看结果](https://www.harborframework.com/docs/run-jobs/run-evals)

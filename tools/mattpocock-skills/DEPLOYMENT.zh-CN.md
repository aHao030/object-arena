# Matt Pocock Skills 使用说明

本文件夹保存 [mattpocock/skills](https://github.com/mattpocock/skills) 的完整源码快照，便于统一存放、查看和后续安装。原作者为 Matt Pocock，原始内容遵循 [MIT 许可证](LICENSE)。

## 来源版本

- 上游提交：`4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`
- 上游版本：`1.3.2`
- 整理日期：2026-11-05（Asia/Shanghai）
- 原始文件：184 个，另附本说明和 `UPSTREAM.json`。

## 内容与用途

| 目录 | 用途 |
| --- | --- |
| `skills/engineering/` | 20 个工程技能，包含需求澄清、任务拆分、开发、测试、调试和代码评审 |
| `skills/productivity/` | 7 个通用工作流技能，包含追问梳理、学习和任务交接 |
| `skills/misc/` | 4 个较少使用的技能，不在上游正式插件发布列表中 |
| `skills/in-progress/` | 8 个试验中的技能，不在上游正式插件发布列表中 |
| `docs/` | 技能的使用场景和说明 |
| `.claude-plugin/` | 上游插件描述与发布列表 |

常见流程：`grill-with-docs` 澄清开发需求，`to-spec` 整理需求说明，`to-tickets` 拆分任务，`implement` 推进实现，配合 `tdd`、`diagnosing-bugs` 和 `code-review` 完成验证。一般计划梳理可从 `grill-me` 开始。

## 如何使用

将文件保存到 GitHub 只是建立源码存档，不会自动在本机安装或启用技能。需要安装时，按 [上游 README](README.md) 中与你的 AI 助手相对应的方法操作；上游 README 的安装命令指向原作者仓库。

安装单个技能时应保留其配套文件，并留意技能之间的依赖，例如 `grill-me` 会调用 `grilling`，`implement` 会调用 `tdd` 和 `code-review`。

无需为了存放这些文件运行 `npm install`。`scripts/link-skills.sh` 是作者的开发辅助脚本，会处理本机同名技能目录，不应作为本文件夹的默认安装入口。

## 更新与维护

这是固定版本的快照，不自动跟随上游更新。更新时先比较上游变化，保留本说明和原始 LICENSE，然后同步源码并更新 `UPSTREAM.json` 中的提交、版本、文件数量和日期。

上游 `AGENTS.md` 为指向 `CLAUDE.md` 的符号链接。通过 Git 对象导入本目录时保留原始文件模式；某些 Windows 解压工具会将其展开为仅包含 `CLAUDE.md` 的普通文件，遇到这种情况请直接阅读 `CLAUDE.md`。

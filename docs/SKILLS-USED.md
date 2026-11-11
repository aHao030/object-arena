# Matt Pocock 工作流使用记录

2026-11-11续用记录：机体方向的真实用户回答已写入v0.4总览，按既有domain-modeling、to-spec、to-tickets结构生成新术语/ADR/规格/独立任务，并以并行主源研究、三类质询、复核和定点修订形成新记录。新文件位于docs/mecha-v0.4/与.scratch/mecha-arena/；原始技能快照和全局安装均未改动。

## 来源与核验

用户指定仓库：[aHao030/ai-skills / mattpocock-skills](https://github.com/aHao030/ai-skills/tree/main/mattpocock-skills)。2026-11-10 在线读取 UPSTREAM.json，记录其上游是 mattpocock/skills 1.3.2、提交 `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`。线上 to-spec 文件的 Git blob 为 `3f52599ae2a4347aee5a07432c2707518e691a7f`，与本机源快照一致。

本次按需读取并应用这些指令，没有将源快照安装为全局技能，也没有运行 link-skills.sh。

| 指令 | 本次产物 |
|---|---|
| [setup-matt-pocock-skills](https://github.com/aHao030/ai-skills/blob/main/mattpocock-skills/skills/engineering/setup-matt-pocock-skills/SKILL.md) | 本地任务约定、领域文档约定、AGENTS.md |
| [grill-with-docs](https://github.com/aHao030/ai-skills/blob/main/mattpocock-skills/skills/engineering/grill-with-docs/SKILL.md) / grilling | 已问真实用户的操控方式；其余场景由模拟用户质询，保留假设 |
| [domain-modeling](https://github.com/aHao030/ai-skills/blob/main/mattpocock-skills/skills/engineering/domain-modeling/SKILL.md) | GLOSSARY.md、精简 ADR |
| [research](https://github.com/aHao030/ai-skills/blob/main/mattpocock-skills/skills/engineering/research/SKILL.md) | 并行的第一方来源调研与带链接证据 |
| [to-spec](https://github.com/aHao030/ai-skills/blob/main/mattpocock-skills/skills/engineering/to-spec/SKILL.md) | 按其七节结构生成 spec.md |
| [to-tickets](https://github.com/aHao030/ai-skills/blob/main/mattpocock-skills/skills/engineering/to-tickets/SKILL.md) | 按可演示的完整路径拆分、逐文件记录依赖 |

## 适配说明

原流程包含用户逐轮确认、配置确认和发布任务。本次用户明确要求自主生成并循环质询，因此先交付可审阅的本地草案，将未确认选择显式标记为设计默认，未发布到外部任务系统。模拟角色意见不记作用户同意；测试边界和任务拆分也仍可修改。

这是人工执行其提示式工作流，不声称存在自动运行的 Matt Pocock 代码生成器。本项目原创文档不复制上游技能正文，相关工作流版权归原作者，源快照使用 MIT 许可证。

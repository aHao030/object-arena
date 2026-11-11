# Issue tracker: Local Markdown

本工作区起始为空，没有既有远程仓库。用户已授权生成项目文件与自主迭代；因此选择本地任务作为可撤回的设计默认，不创建外部 Issue。

- 规格：`.scratch/mecha-arena/spec.md`。
- 每个任务一个文件：`.scratch/mecha-arena/issues/NN-slug.md`。
- 状态：draft、ready-for-agent、in-progress、done、blocked、superseded。当前任务均为 draft：内容完整，尚未做技术验证和排期。
- Blocked by 只列真实前置依赖；没有依赖的任务可并行。
- 每个任务须包含可演示行为、通过条件及失败场景。
- 文档完成不能将开发任务标记 done。

旧.scratch/object-arena/任务已标superseded，仅供历史追溯，不能按旧清单实现新机体规则。

# 物竞场：把自己的模型变成可驾驶机体

当前设计v0.4 · 2026-11-11。用户确认：照片或3D模型→可驾驶机体→改装→实时对战；采用统一可解释物理，允许受限推进器和科幻武器。

玩家在机库带入作品，确认分件/关节或主动选择核心外壳路线，装上规则武器、护盾和推进模块，在3D场地驾驶、射击、近战和短时升空；通过回放理解命中与资源，再返回改装。

## 当前有效文件

- [v0.4设计总览](docs/mecha-v0.4/README.md)
- [产品规格](.scratch/mecha-arena/spec.md)
- [制作与改装](docs/mecha-v0.4/DESIGN.md)、[战斗规则](docs/mecha-v0.4/COMBAT-RULES.md)、[技术合同](docs/mecha-v0.4/TECHNICAL-SPEC.md)
- [GitHub调研与选型](docs/mecha-v0.4/RESEARCH.md)
- [MuJoCo接入设计](docs/mecha-v0.4/MUJOCO-PLAN.md)
- [验证门槛](docs/mecha-v0.4/VALIDATION.md)、[质询记录](docs/mecha-v0.4/REVIEW-LOOP.md)、[新开发任务](.scratch/mecha-arena/issues/)
- [术语](GLOSSARY.md)、[技术决策](docs/adr/)、[Matt Pocock工作流](docs/SKILLS-USED.md)

优先验证原创机体跨端手感，随后必须让自己的模型接入装配、试驾与对战；仅预置射击不代表完成项目。照片、分件和绑定各有失败边界，不承诺单图自动恢复全部机械功能。

模型API费用、平台PC和竞技CP继续分离。生成质量与付费不能购买额外伤害或参赛上限，比赛不让大模型当裁判。

## 历史原型

v0.3普通物体加底座推台已被新方向替代。根docs带历史标识的旧规则与旧任务只供追溯，不作当前实施依据。

[已有展示](showcase/README.md)与[私密在线版](https://object-arena-demo-ahao.sweetowlet132.chatgpt.site)仍是旧推台Canvas样机，未改成机甲战斗。根DESIGN.md与.impeccable/design.json记录其视觉系统，不代表新功能实现。旧v0.3压缩包保留原版本。

本轮完成调研、重新设计和质询修订，没有实现机甲平台、运行候选游戏或做真机验证。参数、资产成功率、手感和成本仍须原型实测。

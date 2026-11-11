# 实际集成与第三方来源

日期：2026-11-11。这里记录安装物、源码检查点、许可证及接入边界，不把设计复核或 npm 安装成功当作功能验收。

机器可读记录在 [registry.json](../../integrations/registry.json)，完整许可保存在 [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)。依赖的实际发行物由根 package-lock.json 的版本、resolved 和 integrity 固定；源码 commit、Git blob 和本地 SHA-256 是不同证据，不能互相冒充。

## 本轮采用

| 依赖 | 实际版本 | 接入位置和边界 | 本次治理核查 |
|---|---|---|---|
| Three.js | 0.187.0 | apps/web：3D场景与后续GLB预览；不裁定胜负 | 本地MIT已读；npm gitHead在官方仓可解析；已发布包用lock完整性固定 |
| Rapier JS compat | 0.21.0 | packages/sim：服务器根体与碰撞 | 本地Apache-2.0已读；npm源提交在官方Rust仓可解析，其标题为Rust 0.36.0，不能把Rust/JS版本混同 |
| Colyseus core / SDK / ws-transport | 0.18.28 / 0.18.10 / 0.18.5 | apps/server与apps/web：房间、动作与权威快照 | 三份本地MIT已读；发行物精确锁定；见下方陈旧gitHead说明 |
| 官方MuJoCo WASM | 4.0.0 | apps/lab/src/index.js：隔离机械测试，非比赛裁判 | npm与官方源码Apache-2.0一致；发布包缺LICENSE文件，已保留固定源码许可全文 |
| Astryx core / CLI / neutral主题 | 0.7.13 | apps/web、astryx-themes.ts与开发期模板/组件文档工作流 | core发布包缺LICENSE、CLI/主题附MIT；官方v0.7.13 tag源码版本核对；不声称tag证明npm构建来源 |
| StyleX runtime / Babel插件 | 0.19.1 | Astryx的peer运行依赖及CLI工具链；应用未启用自定义StyleX编译 | 已核对官方0.19.1 tag及MIT；发布包缺许可文件，全文补存；npm旧仓facebook/stylex已转到meta/stylex |

React、React DOM、Heroicons和开发工具同样从安装包及lock记录。registry的installedPackages与noticeInventory包含当前本机可见的传递依赖；项目自己的workspace不作为第三方。runtime按实际测试范围登记，详见日志；编译通过不代表浏览器视觉或真机验收通过。

## 源码定位不能假精确

Three npm gitHead为`7e89746a687bb88271253698fa108b1dd59825d0`，Rapier为`b716d375efc0201003f0cd9ef7168eee0b62c177`，MuJoCo为`ac60eae30fa7e0d31315c38d9476752fb81be67e`；这些在官方仓可以解析，但仍不构成独立可复现构建证明。

Colyseus core发布元数据给出的`c45b410e99eadffff4b74e701339992e2faa15f8`源码package.json实际为`0.15.0-preview.8`，ws-transport给出的`320a0325f01eff3cd7afa8fb2efa80077ebdbf4a`实际为`0.14.17-alpha.8`，SDK未给gitHead。因此不将这两个旧hash写成当前0.18的实际源码。已另核对官方源码检查点`ce781b98bfc595d7fe243409b9a79087c8785109`，三个package.json版本确为0.18.28/0.18.10/0.18.5。这个检查点仍是版本匹配的源码参考，发行物来源是否与之逐字对应未证明。

Astryx官方tag v0.7.13解析为`7a298e616fa241b9858670757c8b3fa99abdf5f7`；core、CLI及neutral主题源码package.json均为0.7.13。根package.json与lock根记录中的neutral主题都已精确固定为0.7.13。StyleX 0.19.1的annotated tag对象为`ae681b0eb9f200ce6f438afc45e916a6b982883a`，解析到commit`1fcb9a51cbecad2c82255e0f4b45cc072fa1a95a`。npm都未提供gitHead，registry分别保留tag对象、source checkpoint与artifact integrity，不捏造发布源提交。

## Matt Pocock工作流实际采用范围

用户指定的源码快照已由主实施者保留到 [tools/mattpocock-skills](../../tools/mattpocock-skills/README.md)，上游1.3.2/commit `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`，MIT全文与UPSTREAM.json随源码保留。这是项目内可阅读的工作流来源；未运行link-skills.sh，也不将源码复制说成全局技能安装。

本轮实际读取research、tdd、implement和code-review的SKILL.md。采用一手来源、规格/任务关联、公开接口的行为测试、实现后对照规格复核这些原则。registry记录所读原文SHA-256。完整red→green仅在有先失败、后通过证据的具体切片上记为执行；只写测试不称TDD。完整code-review要求固定基线与Standards/Spec两轴独立复核，尚未执行时保留pending，不能用早期设计质询冒充代码审查。

本轮基线为`e77794f3f8f77eb071e5d2df451c47e4250f95fa`（文档与完整Matt快照）；具体测试与复核证据参见 [集成日志](../../logs/2026-11-11-integration.md)。

## 仅作参考和推迟

RobotWarrior仅研究驾驶/HUD/部位和热量设计，没有复制整款游戏、代码或素材。其玩家主机合作网络、直接改坐标的移动，以及不同画质可见距离不适合作为本项目竞技裁判。记录为reference-only。

本轮不额外加入整款Godot机甲游戏、第三方MuJoCo封装、TRELLIS或大模型权重。既有Three发行包已经包含GLTFLoader和SkeletonUtils，后续GLB/骨架适配优先从现有依赖评估；官方MuJoCo npm避免引入不必要封装。Babylon/Havok保留对照，照片服务、任意分件/绑定、真实API收费、排位、全关节比赛及真机支持仍为deferred，不因这次安装就变成可用功能。

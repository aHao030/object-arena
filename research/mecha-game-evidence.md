# 可驾驶与改装机甲项目：GitHub 调研证据

核验日期：2026-11-11。对应用户新增方向：实物模型/3D 文件上传 → 可驾驶机体 → 改装 → 实时对战。本轮只调研与修订设计；不修改或发布既有网页。

## 结论与检索边界

在本次公开 GitHub 关键词检索及下列六项重点核查中，**没有找到可直接接入本项目、同时完成“自带实物照片/任意 3D → 机体语义分件与绑定 → 模块改装 → 浏览器跨端、服务器权威实时 PvP”的成熟开源替代品**。这只是本轮有限检索的结果，不表示全网不存在，也不表示任一同名商业游戏已经开源。

最值得继续做小规模技术评估的是 **RobotWarrior**：它有浏览器机甲驾驶、部位损伤、热量、触屏及多人合作的明确实现证据。不过其合作网络、手写移动碰撞和跨设备辅助规则均不能直接满足本项目的权威 PvP 与物理要求。更合理的采用方式是评估其有 MIT 授权的驾驶/HUD/部位与热量模块或设计；不把整个项目当成已经具备上传、改装和竞技后端的基础。

检索使用 agent-reach 的 GitHub/dev 路由，优先通过已连接 GitHub 工具读取公开仓库。搜索词包含：`Gundam Gunpla`、`mech combat godot`、`modular robot game`、`robocraft game`、`terratech`、`robocraft clone`、`modular mech`、`robot building godot`、`robot combat multiplayer`、`mech combat multiplayer`、`TerraTech clone`、`mecha game`、`robot builder`、`modular combat game`、`robocraft godot`、`robot battle game`。另核查主调研提供的具名候选。搜索会混入模型展示、网站、机器人科研和商业游戏 Mod，因此不能按名称或 star 数直接推荐。

证据来自默认分支 README、许可证、目录与关键源码，以及 GitHub 元数据和默认分支最新提交。以下六项在核验时均 `archived=false`。最新提交日期按 GitHub commit 的 committer 字段记录，**不同于仓库 `pushed_at`**，不把未归档或近期推送等同于稳定维护。未克隆、构建、运行游戏、测试多人连通或作许可证法律审查；下文“支持”指项目文档/源码所声明或显示的能力。

## 六项重点核查

| 项目与类型 | 已核实的内容 | 多人与浏览器 | 修改与分发边界 | 本项目取舍 |
|---|---|---|---|---|
| [michaelcrosato/robot-warrior](https://github.com/michaelcrosato/robot-warrior) · 有单人战役与合作闭环的浏览器游戏 | README 和架构展示三种预设机体、驾驶、喷气、热量及八部位伤害；`src/data/chassis.js` 确有机体/武器参数；模型与场地由程序生成 | README 明确四人 WebRTC 合作和手机触屏；架构明确玩家主机运行权威仿真。没有把合作模式说成 PvP；没有任意照片/GLB 机体上传证据 | 根目录 MIT，可在遵守版权与许可保留要求下评估修改/分发代码；商业原作音乐明确不在仓库，不能把音乐或品牌权利算进 MIT | **优先评估部分模块**：驾驶体验、HUD、部位与热量。上传绑定、改装图、受限动力与服务器 PvP 仍需独立实现 |
| [deanthecoder/MechRewired](https://github.com/deanthecoder/MechRewired) · 原生机甲游戏重实现，开发中 | 重实现 MechWarrior 2；README 描述驾驶舱、躯干转向、跳跃喷气、导弹与热量，开发文档指定 Godot .NET | README 展示原作单人任务；本轮未取得多人能力的确认。文档提供桌面和 Quest 路线，没有浏览器导出验收证据 | 源码 MIT；必须由用户提供合法原作游戏数据，原作模型/任务/品牌并未因源码 MIT 变成可自由分发素材 | **参考驾驶与系统分层**，不作为浏览器首发整包、不把原作数据打包进本产品。Quest 测试包可能包含本地原作数据，尤其不能直接转发 |
| [s-haha-n/Flying-Mech-Controller](https://github.com/s-haha-n/Flying-Mech-Controller) · Godot 机甲控制原型 | README 明确为飞行角色控制器；源码有冲刺、锁定、射击、生命值及姿态动画，`player.gd` 使用 CharacterBody3D 与速度插值 | 未取得多人实现证据；项目默认 Godot 4.6 / Forward Plus / Jolt，没有已验证 Web 发布配置，不能由“Godot”推断浏览器即用 | 递归目录与 README 未找到覆盖项目的根许可证；不能把公开可读当成已获修改/分发授权；模型、音效还需分别核对 | **只作动作与交互研究**：锁定、飞行镜头、手臂瞄准。获得许可并重做动力限制前不复制代码或素材 |
| [turuko/Robot-Builder](https://github.com/turuko/Robot-Builder) · Unity 模块拼装原型 | 仓库描述为受 Robocraft 启发；无 README。`BuildManager.cs` 有部件选择/放置/删除与质量累加，`RobotRoot.cs` 有碰撞体整理，工程版本 Unity 2022.3.5f1 | 关键脚本显示本地构建逻辑；本轮未取得驾驶、完整战斗、多人或可用 WebGL 发布的确认 | 未找到覆盖自有游戏代码的根许可证；目录中的 ColliderUtility/MIConvexHull 等第三方许可证不能覆盖整款游戏 | **参考模块装配流程**，不作为现成对战游戏。直接复用需先补齐授权、构建验收和物理正确性评估 |
| [dddontshoot/RoboCraftAssembler](https://github.com/dddontshoot/RoboCraftAssembler) · Blender 资产装配/归档工具 | README 明确下载既有游戏 bot 数据并在 Blender 装配网格；CSV 记录部件资源，含 `.blend`、无纹理网格及导入脚本 | 不是可驾驶游戏，也不是多人服务器；运行依赖旧 Blender/Python 工作流，不是浏览器应用 | 根目录与递归目录未找到覆盖项目的 LICENSE；已有游戏网格和下载器不能当成获得商业游戏全部资产授权 | **只研究“部件 ID + 变换 + 资源映射”数据形式**。本项目应建立自己的部件与资产权限，不导入其商业游戏素材包 |
| [GaiusSensei/Project-Plavsky-Particle](https://github.com/GaiusSensei/Project-Plavsky-Particle) · 同人桌面规则文档骨架 | README 仅说明 Gundam Build Fighter Wargaming；递归目录的五章 Rulebook 和一份 Appendix 全部 0 字节，未形成可用规则书，更无游戏代码 | 没有软件、浏览器或联网实现 | LICENSE 声明同人文本 CC BY-SA 3.0 PH 并承认 Gundam 等属于原权利方。这个文本许可不等于获得官方高达 IP 或素材授权 | **排除开发依赖**。可了解创作意图，但不能作为完整规则、技术基础或官方授权依据 |

## 固定证据与维护快照

| 项目 | 默认分支最新提交（committer 日期，UTC） | 对应的主要证据 |
|---|---|---|
| RobotWarrior | [e1d118e194b8791cdd39fccb561d3de51eeeb81f](https://github.com/michaelcrosato/robot-warrior/commit/e1d118e194b8791cdd39fccb561d3de51eeeb81f)，2026-09-23 | [README](https://github.com/michaelcrosato/robot-warrior/blob/main/README.md)、[MIT](https://github.com/michaelcrosato/robot-warrior/blob/main/LICENSE)、[架构](https://github.com/michaelcrosato/robot-warrior/blob/main/docs/architecture.md)、[音频边界](https://github.com/michaelcrosato/robot-warrior/blob/main/docs/assets.md)、[移动与碰撞](https://github.com/michaelcrosato/robot-warrior/blob/main/src/sim/movement.js)、[部位与机体参数](https://github.com/michaelcrosato/robot-warrior/blob/main/src/data/chassis.js) |
| MechRewired | [2151bcea58d5447436cb9362eca9d6f8a987493e](https://github.com/deanthecoder/MechRewired/commit/2151bcea58d5447436cb9362eca9d6f8a987493e)，2026-10-13 | [README 与权属说明](https://github.com/deanthecoder/MechRewired/blob/main/README.md)、[MIT](https://github.com/deanthecoder/MechRewired/blob/main/LICENSE)、[开发要求](https://github.com/deanthecoder/MechRewired/blob/main/docs/DEVELOPMENT.md) |
| Flying Mech Controller | [3f420ee4b33485a4993d84a5099ab743bcd2156a](https://github.com/s-haha-n/Flying-Mech-Controller/commit/3f420ee4b33485a4993d84a5099ab743bcd2156a)，2026-06-13 | [README](https://github.com/s-haha-n/Flying-Mech-Controller/blob/main/README.md)、[工程配置](https://github.com/s-haha-n/Flying-Mech-Controller/blob/main/project.godot)、[控制脚本](https://github.com/s-haha-n/Flying-Mech-Controller/blob/main/scenes/player/player.gd) |
| Robot Builder | [b151f4296282cf4327105c7a2751f95414d87aa0](https://github.com/turuko/Robot-Builder/commit/b151f4296282cf4327105c7a2751f95414d87aa0)，2024-05-14 | [BuildManager](https://github.com/turuko/Robot-Builder/blob/main/Assets/Scripts/BuildManager.cs)、[RobotRoot](https://github.com/turuko/Robot-Builder/blob/main/Assets/Scripts/RobotRoot.cs)、[Unity 版本](https://github.com/turuko/Robot-Builder/blob/main/ProjectSettings/ProjectVersion.txt) |
| RoboCraftAssembler | [7d3d602c76fa01e734a3d1a08c2af121362542cc](https://github.com/dddontshoot/RoboCraftAssembler/commit/7d3d602c76fa01e734a3d1a08c2af121362542cc)，2023-07-13 | [README](https://github.com/dddontshoot/RoboCraftAssembler/blob/master/README.md)、[目录](https://github.com/dddontshoot/RoboCraftAssembler/tree/master) |
| Project Plavsky Particle | [6880760a5e1a0f804d0b01c84ca775d6d9c3a0ea](https://github.com/GaiusSensei/Project-Plavsky-Particle/commit/6880760a5e1a0f804d0b01c84ca775d6d9c3a0ea)，2014-02-03 | [README](https://github.com/GaiusSensei/Project-Plavsky-Particle/blob/master/README.md)、[LICENSE](https://github.com/GaiusSensei/Project-Plavsky-Particle/blob/master/LICENSE.md)、[空章节目录](https://github.com/GaiusSensei/Project-Plavsky-Particle/tree/master/Rulebook) |

元数据来源为各项目 `https://api.github.com/repos/{owner}/{repo}`；提交来源为同仓库 `/commits?per_page=1`。针对无 LICENSE 的结论同时检查了根目录和未截断的递归树；Robot Builder 确有第三方许可证文件，但未发现覆盖自有工程的授权说明。不做“没有根 LICENSE 所以任何文件都无许可证”的泛化。

## 很像但不应混入推荐的搜索结果

- [maxcmiller/craftoid](https://github.com/maxcmiller/craftoid)：[README](https://github.com/maxcmiller/craftoid/blob/master/README.md) 将其说明为与 Robocraft 相关的小型 Rails 应用；最近推送 2014-09-29，未归档、没有根 LICENSE。它是粉丝 Web 应用，不是 Robocraft 开源游戏或物理战斗引擎。
- [iLoveL504/Gundam-build-fighters](https://github.com/iLoveL504/Gundam-build-fighters)：仓库元数据 size 为 0、描述为 all episodes；GitHub contents API 明确返回 repository is empty。无游戏实现可评估。
- [andres-fernandez-fuks/Batalla-de-Gunplas](https://github.com/andres-fernandez-fuks/Batalla-de-Gunplas)：算法课程 Python 项目；目录无 README/根 LICENSE。源码确有部件选择、队伍和回合攻击，但没有照片、3D、实时驾驶或网络实现证据，不能因为主题吻合便推荐为平台基础。
- [hshi74/robocraft](https://github.com/hshi74/robocraft)：[README](https://github.com/hshi74/robocraft/blob/main/README.md) 明确为弹塑性物体操作、图网络动力学与规划的研究代码。它属于**科研模拟框架**，不是 Freejam 的 Robocraft 游戏，也不是模块机甲 PvP。
- TerraTech 搜索主要命中 Mod loader、Mod manager 和部件注入库。比如 [terratech-steam-mod-loader](https://github.com/FLSoz/terratech-steam-mod-loader) 的定位就是加载器；Mod/注入工具不等于拥有商业游戏本体、联网服务或素材的分发权。本轮没有把它们当成独立完整游戏。

## 对本项目设计的具体启发

以下是基于上述证据的工程建议，尚非已实现能力：

1. **以可驾驶机体替代“任意物体放上推台底座”作为新主循环。** 第一步应有原创、许可清楚的参考机体，可驾驶、射击/近战与被击败；再扩展上传和改装。不要让上传或重建任务成为验证手感的前置依赖。
2. **外观、功能部件、骨架/运动控制和碰撞物理分开。** 任意照片或静态 GLB 不会自行带出关节、推进器、武器插槽或可信功率。建议先支持经过用户确认的标准机体模板和有限部位映射，再让上传外观附着其上；语义分件或完整自定义机构另设验证阶段。
3. **模块改装保存“部件实例—挂点—变换—功能—预算”的图，而不是只保存一张拼好的网格。** RoboCraftAssembler 的资源 ID 与装配变换能启发数据边界，但其游戏资源不应复制到本产品。失去手臂导致挂载武器失效的规则，可参考 RobotWarrior 的部位模型后重新设计。
4. **明确物理近似，避免将动作演示包装成真实机械仿真。** RobotWarrior 的 `moveActor` 直接增量更新坐标并用几何半径避障；Flying Mech Controller 用目标速度插值后 `move_and_slide()`。这些适合研究手感，不能自动证明受力、惯量、电池、接触牵引或多关节机构守恒。采用何种运动控制应在新规则与 ADR 中明示。
5. **合作主机网络不能直接替代竞技服务器。** RobotWarrior 文档为主机 40 Hz、10 Hz 快照的 WebRTC 合作；本项目仍需自己的服务器判定、反作弊、规则冻结与回放证据，不让房主成为可修改的最终裁判。
6. **触屏友好与竞技公平分别验证。** RobotWarrior 的手机辅助瞄准/自动冷却及画质档绘制距离差异在合作游戏有用；它的架构文档明确低/高档机体绘制距离不同。本项目竞技模式不能未经设计就照搬，否则画质或输入方式会改变战场信息和动作能力。
7. **高达创战者是体验参照，原创机体与规则才是默认交付素材。** 仓库根 MIT/CC 不能授权原权利方的高达、机战品牌、原作模型或商业音乐。项目内置示例、宣传与公开共享资源应各自留有可验证来源；不将个人收藏的模型照片直接等同可对外分发的官方素材授权。

## 下一步最小评估

建议在后续开发任务中分别验证：原创参考机体可驾驶；一个替换部件影响质量/预算与功能；一段用户外观映射到确认的机体模板；两台设备完成同一场服务器权威 1v1。RobotWarrior 可先对照阅读/试运行其 MIT 范围内的驾驶与 HUD 模块，**不要以下载成功、README 功能表或这份调研文档代替实际集成验收**。

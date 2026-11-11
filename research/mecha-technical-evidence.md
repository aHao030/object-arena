# 可驾驶机体、拼装与联网战斗：技术证据

核查日期：2026-11-11。用途：支撑用户确认的“自己的照片/模型变成可驾驶机体，再拼装武器与推进器”的产品修订。本文只作研究，不修改旧推台样机或宣布机甲玩法已经实现。

核查方法：读取官方 GitHub README、LICENSE、源码、示例与文档；最近提交用于记录维护迹象，不代表稳定发行版已包含所有 master 功能。未安装这些引擎、跑性能基准或完成移动端真机测试。

## 结论与建议

优先保留 Three.js + Rapier + Colyseus 的浏览器路线，增加“标准机体模板、可确认的硬表面分段、插槽模块、规范动作状态、服务器武器判定”。用户已有的模型应能成为机体外观，但平台不能承诺把任意单张照片或整体静态网格直接变成完整活动关节机器人。

用户已确认统一可解释物理，允许受限推进器和科幻武器。可采用**动态根体 + 受限驱动 + 受控动作的混合方案**：根体处理重力、碰撞、有限推进力和击退；腿部姿态、握枪、瞄准及步行动画通过模板动作实现；打击范围来自服务器规范姿态。它是游戏动力学与动作规则的结合，不是被拍摄玩具的机械数字孪生。

Babylon.js + Havok 是值得进行同等小原型比较的整合方案；Godot 更适合团队愿意采用完整游戏编辑器并承担 Web 导出取舍的路线；Jolt 可作为后续复杂关节与物理机体候选。不要在第一版同时维护几套权威物理引擎。

## GitHub 可复用项目

| 项目及证据 | 当前核实事实 | 对本项目的价值与取舍 |
|---|---|---|
| [Three.js](https://github.com/mrdoob/three.js)；[SkeletonUtils](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/utils/SkeletonUtils.js)；[MIT LICENSE](https://github.com/mrdoob/three.js/blob/dev/LICENSE) | 提供骨骼/动画显示工具；SkeletonUtils 的 retarget/retargetClip 接收已有的源/目标骨架并可映射骨名 | 继续用作显示、装配和动画。重定向不是自动切割模型、生成关节或判断肘膝方向，Three.js 本身也不是角色物理与联网裁判 |
| [Rapier](https://github.com/dimforge/rapier)；[角色控制器文档源码](https://github.com/dimforge/rapier/blob/master/website/docs/user_guides/templates/character_controller.mdx)；[关节文档](https://github.com/dimforge/rapier/blob/master/website/docs/user_guides/templates/joint_constraints.mdx)；[Apache-2.0](https://github.com/dimforge/rapier/blob/master/LICENSE) | 内置 Kinematic Character Controller 处理 move-and-slide、台阶/坡面等；运动学体不因接触、重力或冲量自然运动；另有动态刚体及关节系统 | 根体受力路线可继续用动态刚体。KCC 可作另一种受控角色方案，但不能将它的质量字段、人工重力或速度控制描述为完整受力仿真。关节功能也不等于已解决双足平衡 |
| [Ecctrl](https://github.com/pmndrs/ecctrl)；[README](https://github.com/pmndrs/ecctrl/blob/main/readme.md)；[package.json](https://github.com/pmndrs/ecctrl/blob/main/package.json)；[MIT](https://github.com/pmndrs/ecctrl/blob/main/LICENSE) | 当前 2.0.2，基于 R3F/Rapier；有 ShapeCast 地面检测、弹簧/阻尼支撑、移动平台、输入和运行时动画状态；也有推进式 drone 控制 | 很适合研究动态根体如何连到动作状态和触屏；可选局部复用或移植控制思路。它不是服务器权威机甲游戏；React/R3F 依赖不能直接塞进 Node 房间，需要分离纯仿真部分。悬浮弹簧亦需说明是辅助近似 |
| [Babylon.js](https://github.com/BabylonJS/Babylon.js)；[角色控制器](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/physics/v2/characterController.md)；[ragdoll 文档](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/physics/v2/ragdolls.md)；[Apache-2.0](https://github.com/BabylonJS/Babylon.js/blob/master/license.md) | 集成物理、骨骼与 ragdoll 工具。角色控制示例通过支撑检测、目标速度与 integrate 循环驱动；ragdoll 需提供骨骼映射、形状尺寸及约束，当前文档明确不自动计算尺寸 | 比 Three.js 更完整的引擎备选。可加快规范角色/倒地效果；不代表任意上传模型自动得到关节。当前 ragdoll 文档还限制导入 GLB/glTF 在右手场景中工作，须统一坐标系 |
| [Havok for the Web](https://github.com/BabylonJS/havok)；[实际包 LICENSE](https://github.com/BabylonJS/havok/blob/main/packages/havok/LICENSE)；[包清单](https://github.com/BabylonJS/havok/blob/main/packages/havok/package.json) | 当前核查 `@babylonjs/havok` 包清单为 1.3.14，JS/WASM 网页运行时使用 MIT；Babylon 核心的 Apache-2.0 与它分开 | 不能笼统写“Babylon 的 Havok 插件是收费专有”。本次核查对象是此网页发行物；其他原生 Havok SDK、导航/布料等产品不能据此视为同一许可。JS/WASM 发行包许可也不意味着原生引擎全部源码开放 |
| [Godot](https://github.com/godotengine/godot)；[MIT](https://github.com/godotengine/godot/blob/master/LICENSE.txt)；[Web 导出文档](https://github.com/godotengine/godot-docs/blob/master/tutorials/export/exporting_for_web.rst) | 当前文档要求 WebAssembly + WebGL2；Web 使用 Compatibility 渲染，Forward+/Mobile 渲染路线不能直接导出；Godot 4 C# 项目当前不能 Web 导出；单线程 Web 导出自 4.3 起提供并成为默认 | 游戏编辑器、动画和场景工作流完整，未来原生版也有价值；浏览器主线需用支持的语言和渲染器。移动浏览器有性能与 Safari 兼容注意项，不能把原生版表现当 Web 结果。浏览器联网需 HTTP/WebSocket/WebRTC，不能照搬原生低级网络路线 |
| [Godot 官方示例](https://github.com/godotengine/godot-demo-projects)；[角色示例](https://github.com/godotengine/godot-demo-projects/tree/master/3d/kinematic_character)；[ragdoll 示例](https://github.com/godotengine/godot-demo-projects/tree/master/3d/ragdoll_physics)；[根 LICENSE](https://github.com/godotengine/godot-demo-projects/blob/master/LICENSE.md) | 两个示例 README 均标为 GDScript / Forward+；前者是 CharacterBody3D 受控移动，后者是预先配置骨骼的 ragdoll | 可学习角色和倒地状态，不能宣称原样复制就能在手机浏览器运行。需要改 Compatibility、简化资产并验证；引擎许可与示例中的角色/声音/纹理许可分别核查 |
| [Colyseus](https://github.com/colyseus/colyseus)；[MIT](https://github.com/colyseus/colyseus/blob/master/LICENSE)；[Rewind 源码](https://github.com/colyseus/colyseus/blob/master/packages/core/src/Rewind.ts) | 官方 0.18+ 现有客户端预测、输入确认和延迟补偿；Rewind 对附加的数值字段保留有界历史；框架不自动了解机甲骨骼、武器或伤害 | 继续承担房间与权威状态。可减少从零写网络基础的工作，但需自己实现服务器规范机体姿态、3D 命中代理、武器规则和补偿政策；数值字段历史不是整套物理世界回滚 |
| [Colyseus Prediction Playground](https://github.com/colyseus/prediction-playground)；[MIT](https://github.com/colyseus/prediction-playground/blob/main/LICENSE) | 有分开的预测、插值和 lag compensation 实验；README 当前仍提醒部分依赖指向本地 sibling checkout，独立克隆时必须检查实际依赖 | 可复用为网络验证起点，尤其是可注入延迟的可视化测试；不是机甲成品。官方 Learn 页的 ColyStrike 等 Premium Demos 源码属于赞助者私库，不能列作已可自由克隆的公开项目 |
| [Jolt Physics](https://github.com/jrouwe/JoltPhysics)；[JoltPhysics.js](https://github.com/jrouwe/JoltPhysics.js)；[MIT 核心](https://github.com/jrouwe/JoltPhysics/blob/master/LICENSE) / [MIT JS](https://github.com/jrouwe/JoltPhysics.js/blob/main/LICENSE) | 有刚体角色、virtual character、骨架映射和 animated ragdoll；JS 绑定有 WASM/asm 及多线程构建，存在 [powered rig](https://github.com/jrouwe/JoltPhysics.js/blob/main/Examples/rig/powered_rig.html) 的 motor 驱动示例 | 若后续需要主动关节机体值得比较。JS 绑定要求明确释放/引用计数管理；示例并非生产清理范本。多线程、确定性构建需单独选定，不应成为移动首发必需条件；更多关节会增加同步与计算负担 |

维护证据：本次读取到的最近提交分别为 Babylon [2026-11-11](https://github.com/BabylonJS/Babylon.js/commit/d58297f77111b06d80b135d6482d7d86a26f1c2a)、网页 Havok [2026-07-27](https://github.com/BabylonJS/havok/commit/21a30bdbc338ef7c808862152431ccb00b88ef8c)、Godot [2026-11-10](https://github.com/godotengine/godot/commit/7a37606a433c0e7735525037cdf774f043146a21)、Ecctrl [2026-09-06](https://github.com/pmndrs/ecctrl/commit/e2cab804f9f15661a642e76f52d09f0b2db63f35)、Rapier [2026-10-10](https://github.com/dimforge/rapier/commit/475caa3ff4646fd9a796b67d14116256f4962bc7)、Colyseus [2026-11-10](https://github.com/colyseus/colyseus/commit/ce781b98bfc595d7fe243409b9a79087c8785109)、Prediction Playground [2026-10-21](https://github.com/colyseus/prediction-playground/commit/90d7dd247158d18a1d9b024ecc1087a7de5ddf2e)、Jolt 核心 [2026-11-09](https://github.com/jrouwe/JoltPhysics/commit/6a985659a781c5a196b8f34a8394b2ccf6a9e1cc)、Jolt JS [2026-10-29](https://github.com/jrouwe/JoltPhysics.js/commit/784c98c0c09e51c6d47700bc16fbbe8c211eb434)。这些是维护迹象；安装时仍须锁定兼容的稳定发行物。

## 任意静态 mesh 为什么不等于可驾驶机体

[glTF 2.0 规范](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skins) 将 skin、关节节点、绑定矩阵和顶点骨骼属性分别定义；静态 mesh 可以完全没有这些内容。glTF 也允许把刚性物体挂到关节节点，例如手上的武器。因此，硬表面机甲不必把所有装甲做成柔性蒙皮，可以用分开的刚性片段随模板关节运动。

但一个扫描到的整体网格仍缺少以下语义，图像转 3D 服务不会天然保证输出这些内容：

- 哪些三角面属于胸部、上臂、前臂、腿和可拆装零件；被遮挡的内表面是否存在。
- 肩、肘、髋、膝的旋转中心、局部轴向、运动范围、父子层级和左右侧映射。
- 标准站姿、手掌握持点、脚底接触点、枪口/推进器方向以及待机/行走/受击等动作映射。
- 玩法允许的质量、命中代理、插槽类别、动力和武器能力。这些不应由照片外观直接决定。

建议输入分级：

1. **照片或整体静态模型**：生成/导入外观，用户确认主体与朝向，再选人形模板；平台尝试分段，用户必须查看并确认映射。不能分段时可保留为局部装甲或整块外观载荷，不显示“自动关节已成功”。
2. **已分段硬表面模型**：用户将部件映射到标准骨骼节点和插槽，验证接缝、动作范围和代理包络。
3. **已有 rig/动画的 GLB**：验证骨骼、绑定矩阵和比例后做映射/重定向；不能仅按同名骨头就保证正确，原骨架动作也不能绕过服务器动作规则。

统一虚拟作战尺度与原扫描尺度分开保存。18 cm 玩具可以映射到标准作战机体的外观，但不能直接把长度放大 100 倍，再以真实密度立方放大质量。作战高度、根体质量、装甲/武器/推进器重量来自标准模块表；扫描尺度是来源元数据，展示中明确说明转换关系。这会改变旧推台版本的质量/体积规则，必须建立新的机体规则版本，不沿用旧 CP 公式冒充已平衡。

## 三种控制路线的取舍

以下为本项目设计分析，不是引用某个引擎对本产品的性能承诺。

| 路线 | 如何移动与站立 | 收益 | 应说明的限制 |
|---|---|---|---|
| 运动学胶囊 + 动画 | 程序指定期望运动，控制器处理障碍、台阶和滑动；动画负责双足 | 容易做稳定手感和预测，服务器负担较低 | 质量和受力不是自然驱动来源；重力、击退和推进器需要游戏逻辑额外实现。不能称全动力学 |
| 动态根体 + 受限控制 + 动画 | 一个动态根刚体接受重力、接触力、驱动/推进与受击冲量；动作跟随其状态 | 适合当前“统一可解释物理”的目标，同时避免每条腿都要平衡 | 单一胶囊并未模拟真实脚掌和每个膝关节。悬浮支撑、自动扶正或锁定旋转均须明确为辅助约束，限制适用条件 |
| 全关节主动物理机体 | 每个肢体为带质量/惯量的刚体，电机/关节驱动，需平衡、接触和步态控制 | 可研究摔倒、肢体受力、扭矩不足和部件碰撞 | 并非挂上 ragdoll 就能走；每次改变肢体比例、质量或装备都可能影响稳定性。网络、性能、控制与制作成本显著提高，不宜作为任意上传模型的首发承诺 |

**混合方案必须明确的边界：**

- 根体是受力动态体还是运动学体，规则和实现必须一致。不能在动力学宣传下每帧直接设位置/速度，再把受到的击退立刻覆盖。
- 地面行走可用有界支撑与推进控制，但支撑只在合格地面接触/检测范围内生效；不能在悬空状态无限维持高度。水平驱动力受地面反力、牵引上限和模块功率约束。
- 自由空中平移、加速或滞空需要受限推进器；无推进器时不能把“空中操控”当免费力。推进力作用点决定扭矩，或把简化的姿态辅助明确写入规则。
- 若锁定俯仰/横滚来保持站立，说明这是辅助约束，不声称已模拟双足平衡；若使用扶正电机，则限制力矩、工作状态和资源。不能把装饰腿部动画误称为脚掌产生的完整动力。
- 质量来自标准模块，并确实进入根体惯性/加速度。不要用 `F=m×固定目标加速度` 无上限补偿重量，从而让重型机与轻型机在相同动力下完全相同。
- 刚性模块可以并入根体质量/惯量；“画面上随骨骼活动”不自动意味着物理中存在活动刚体。第一版应避免一边声称精确多体惯量、一边只用一个永不变化的胶囊。

## 视觉骨骼、物理关节、命中代理要分开

推荐保存三份可版本化的映射：

| 层 | 权威来源 | 负责什么 |
|---|---|---|
| 视觉骨架与硬表面分段 | 资产模板 + 已确认映射 | 显示、动画混合、局部 IK、装饰关节 |
| 根体/物理约束 | 服务器机体规则与模块表 | 位移、重力、接触、受限推进、击退；需要时再加真实活动关节 |
| 命中代理/武器插槽 | 服务器规范动作、瞄准角与动作相位 | 身体/盾牌/武器的有效空间，枪口位置，近战扫掠，服务器射线判定 |

服务器只需运行足够表达判定的规范姿态，可以使用少量球/胶囊/盒代理；不必同步所有蒙皮顶点。客户端 IK 和动画 LOD 是外观调整，不可扩大刀刃、缩小受击面积或把枪口穿过墙。若手部 IK 与规范武器插槽有误差，需要有可验收的视觉容差和预览，不能出现“看着挡住了、服务器却完全没挡住”的常态。

武器与推进器采用允许列表插槽，保存类型、局部变换、质量、功率/能量、弹药/冷却、作用方向、命中代理、规则版本；拒绝循环连接、无限层级、非法缩放与穿入躯体的安装。不能从上传模型里看起来像枪的部分自动赋予高伤害。装饰口径、枪管长度、装甲材质与玩法模块数值必须分清。

若倒地 ragdoll 仅是淘汰后的视觉效果，可以客户端表现并不参与后续碰撞/遮挡；若倒地或断肢会影响掩体、命中面积和再起身，它就是服务器状态，必须同步其代理和转态，不能只让不同设备各算一份。

## 射击、近战与延迟补偿

官方 [Colyseus 延迟补偿文档](https://docs.colyseus.io/netcode/lag-compensation) 已提供 `allowRewindState`、`lastSeenBy` 和有界历史视图；[客户端预测](https://docs.colyseus.io/netcode/client-prediction) 支持输入、预测与确认。它们可以作为基础，仍需把本项目的 3D 命中形状和时间策略接进去。服务器位置历史不等于自动重放全部骨骼、掩体和物理。

建议先做三种明确不同的判定：

1. **即时射线武器**：服务器核验弹药、冷却、射击状态、瞄准转速与枪口；在有界历史中检查目标。必须记录射击序号和判定时间，去重，客户端不提交可信命中结果。
2. **有飞行时间的弹体**：服务器生成并推进，碰撞采用扫掠/CCD及资源上限。不要在未设计回滚副作用的情况下，把弹体任意生成到过去并重复结算伤害。
3. **近战**：服务器启动有前摇/有效期/收招的规范动作；按规范武器代理在相邻 tick 之间扫掠，同一攻击 ID 对同一目标按规则最多结算一次。客户端画面帧数不产生更多攻击机会。

以下为项目应制定的规则建议：

- 回溯上限、允许的网络区间和客户端实际插值延迟一起冻结；文档示例默认 500 ms 不是本项目竞技平衡答案。高速推进下可能出现较明显的掩体后被击中，需要在回溯窗口、区域匹配与可玩性之间做实测选择。
- 客户端时间戳只作受约束提示；服务器根据时钟同步、输入序列和历史范围校验，不能允许伪造数秒前的射击。不要同时重复补偿 RTT 和客户端插值延迟。
- 回溯目标时还需处理盾牌朝向、动作相位、装备状态和会移动的遮挡物；只把目标位置往回放而用当前掩体/枪口随意混合，会制造不一致判定。初期可限制地图为静态掩体并明确遮挡时间政策。
- 第三人称摄像机能看见目标不等于枪口能射中。先校验服务器枪口到目标的遮挡，避免摄像机绕墙偷窥后让子弹穿墙；枪口来自规范插槽，不来自客户端动画。
- 命中历史宜存服务器计算后的简化代理与动作标识；四元数/骨骼不能简单按四个数字线性插值就假定有效姿态。明确旋转插值和姿态切换边界。
- 重放/对账需保存命中事件 ID、原始输入、应用 tick、使用的历史 tick、代理/规则哈希与最终裁决。预测弹痕、扣血或受击动画不是权威结果。

官方 [Learn 页](https://docs.colyseus.io/learn) 区分公开 MIT 的 Prediction Playground 与赞助者专属完整游戏源码。选型和工作量不能把专属 FPS 示例当作已经可直接带入本项目的开源模块。

## 手机与电脑的控制一致性

以下是首发建议，尚无本产品对局或设备测试证据。

- 移动输入使用相同世界/相机相对向量映射，长度不超过 1，防止斜向加速；瞄准与移动为独立通道。键盘、摇杆均经过服务端相同加速度、速度、转向/炮口角速度和资源限制。鼠标可以快速转动观察镜头，但不能让机体或枪口绕过服务器转速上限。
- 手机可用移动摇杆、拖动视角和独立射击/冲刺按钮；禁止必须同时用过多手指才能完成的核心动作。所有动作在电脑端和触屏端具备同等触发能力，桌面快捷键不独占强力动作。
- 如果提供锁定，推荐把它做成所有输入方式都可主动使用的统一模块/规则：相同锁定锥、距离、切换冷却、视线检查、转向上限和解除条件。锁定不是自动命中，不能穿墙、无限追踪或让手机端秘密获得额外武器精度。
- 客户端只提出目标 ID 和动作意图，服务器验证目标可见性/距离/规则；不能相信客户端宣称“已经锁定”。输入偏好匹配可作为公平性验证后的选择，不能先宣称混合输入天然公平。
- 射击、冷却、能量与动画有效期都用固定服务器 tick；30 FPS 手机和 120 FPS 电脑不能产生不同的射速/近战次数。低档位不移除有判定意义的武器、盾牌、弹体和预警。
- 所有档位共用同一根体、命中代理与模块规则；只减少皮肤骨骼细节、贴图、阴影和粒子。骨骼动画 LOD 若简化了手臂，武器仍要贴合规范判定位置。

## 许可需要分成至少四层

1. **引擎/框架代码**：Three.js、Godot、Colyseus、Ecctrl、Jolt 与 Jolt JS 当前核查为 MIT；Rapier、Babylon 核心为 Apache-2.0。保留相应发行物的许可证、版权及 NOTICE。
2. **物理插件/运行时**：Babylon 集成层与 `@babylonjs/havok` 分别记录，后者实际网页包为 MIT；不得把其他 Havok 产品许可套进来，也不得反向推断获得其全部 SDK。
3. **人物、机体、贴图、音效、动画**：逐资产记录来源和许可，不能从代码仓库根 MIT 推断附件全都 MIT。[Khronos 样例库](https://github.com/KhronosGroup/glTF-Sample-Assets) 明确要求查看每个模型 README；例如 [Cesium Man](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/CesiumMan/README.md) 既有 CC-BY-4.0 模型信息，也有独立标志说明。Ecctrl 的 [NOTICE](https://github.com/pmndrs/ecctrl/blob/main/NOTICE) 另列示例动画来自 CC0 资源。
4. **生成服务、模型权重及用户上传**：供应商 API 条款、权重许可与用户模型来源单独追踪。浏览器引擎的开源许可不授予任何现成动漫机体或商标素材的发布权限；机体模板优先原创或使用明确授权资源。BYOK 不使上传资产权利或供应商数据政策自动消失。

## 原型与验收要优先回答的问题

- 同一个规范模板分别套用照片生成外观、整体静态模型和分段模型，用户能否理解哪些部位真实映射、哪些仍用模板？失败是否仍能保留原件，而不显示虚假的关节成功？
- 重型/轻型模块在相同推进器下是否确实有不同加速度；无地面支撑且无推进器时是否会下落；扶正约束是否公开、有限且一致？
- 同一架机体在桌面和中低端手机，运动、枪口、盾牌与近战代理是否相符？降低动画帧率和骨骼细节会不会改变命中？
- 100/150 ms RTT 与抖动下，射线命中、推进闪避、掩体与近战是否可解释？重复开火、伪造历史时间、客户端改枪口、连发积压和重复攻击 ID 能否越权？
- 锁定/自由瞄准、键鼠/触屏、不同画质的实战胜率与操作失败是否存在明显偏差？功能一致不等于手感已公平，需真人对局验证。
- 活动关节数、同步字段数、机体复杂度和每秒弹体量的最坏预算是否受控？没有这些负载基准，不能承诺手机能运行全物理多体机甲战。

建议开发顺序：预置原创机体的双端移动/瞄准/一枪一刀一推进器闭环 → 服务器规范姿态与伤害/回放 → 模板部件改装 → 用户分段模型映射 → 照片/整体模型分段辅助。全关节主动平衡、真实结构断裂和任意机械拓扑放到后续独立研究，不作为首发照片导入的隐含保证。

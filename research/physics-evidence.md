# 物理引擎、实时联机与多设备证据

核查日期：2026-11-10。核查方法：经 GitHub 连接器读取仓库、README、LICENSE、源码、最近提交与发布记录。以下把事实、设计建议、未验证项分别写清。未运行设备实测或联机压测，不能据此承诺帧率和并发。

## 推荐结论

第一版推荐浏览器 WebGL2 渲染、Rapier 服务器权威刚体仿真、Colyseus 房间/消息/状态同步，客户端负责键盘与触屏输入、插值和可选预测。所有付费模型推理在赛前执行，比赛过程中不调用大模型判胜。物体采用公开参数和碰撞代理，胜负由服务器的擂台出界规则决定。

React 适合资产编辑器与产品界面；3D 层可用 Three.js 或 React Three Fiber。`react-three-rapier` 作为预览工具可复用，但不把 React 状态更新循环当作服务器物理循环，不假设其内置依赖与最新 Rapier 一致。

## GitHub 项目核查

| 项目 | 已核实的事实 | 复用位置与限制 | 维护证据 |
|---|---|---|---|
| [Rapier](https://github.com/dimforge/rapier) | Apache-2.0；有 Rust、TypeScript/JavaScript 绑定；支持刚体、碰撞体、质量属性、CCD、力/冲量 | 服务器仿真和客户端沙盒首选。动态物体优先凸形复合碰撞体；显示网格与碰撞网格分开。输出是可解释的刚体近似，不能从照片自动得出真实材料参数 | [最新核查提交](https://github.com/dimforge/rapier/commit/475caa3ff4646fd9a796b67d14116256f4962bc7)，2026-10-10；本次 releases API 无发布条目，应核对实际 npm/crates 发行物 |
| [react-three-rapier](https://github.com/pmndrs/react-three-rapier) | MIT；Rapier WASM 的 R3F 包装；v2 对应 React 19 / R3F 9 | 快速制作物理编辑器、碰撞体预览和训练场。自动 hull 会填平凹槽，不能直接无提示用于正式比赛 | [2.2.0](https://github.com/pmndrs/react-three-rapier/releases/tag/%40react-three/rapier%402.2.0)，2025-11-03；[当前 package.json](https://github.com/pmndrs/react-three-rapier/blob/main/packages/react-three-rapier/package.json) 仍依赖 `@dimforge/rapier3d-compat` 0.19.2；不能描述为近期持续发布 |
| [Three.js](https://github.com/mrdoob/three.js) | MIT；有 WebGL/WebGPU 渲染器与 GLTFLoader；当前 WebGLRenderer 明确要求 WebGL2，r163 起无 WebGL1 | 客户端显示、GLB 加载、LOD 与画质档位。先以 WebGL2 为基线，WebGPU 作为后续增强，避免成为第一版硬要求 | [r187](https://github.com/mrdoob/three.js/releases/tag/r187)，2026-10-30；[核查提交](https://github.com/mrdoob/three.js/commit/0ab98694281ab46b15b5c8998ec2e41d1b86e568)，2026-11-10 |
| [Colyseus](https://github.com/colyseus/colyseus) | MIT；Node.js/TypeScript 权威多人房间、状态同步与客户端 SDK | 承载匹配、房间、断线重连、输入与状态快照；物理、输入合法性、作弊检测和排名仍需项目实现，使用框架不能宣称已防作弊 | [0.18.12](https://github.com/colyseus/colyseus/releases/tag/colyseus%400.18.12)，2026-11-07；master 中可见 fixed-timestep/input 功能，具体 API 是否在所选发行版内须安装时确认 |
| [MuJoCo](https://github.com/google-deepmind/mujoco) | 源码 Apache-2.0；文档素材另有 CC-BY-4.0；当前已有官方 WASM/JS 支持 | 保留为复杂关节、控制和机器人赛道的候选，第一版不引入双引擎。不能以“无法浏览器运行”为排除理由；主要取舍是模型配置、接入成本和产品需求 | [4.0.0](https://github.com/google-deepmind/mujoco/releases/tag/4.0.0)，2026-11-06；[WASM 文档](https://github.com/google-deepmind/mujoco/blob/main/wasm/README.md) 描述现代浏览器构建及手工释放 WASM 对象要求 |
| [Genesis World](https://github.com/Genesis-Embodied-AI/genesis-world) | Apache-2.0；原 `Genesis-Embodied-AI/Genesis` 地址已重定向；Python 多物理平台，提供刚体、FEM、MPM、粒子与 GPU/CPU 后端 | 可作后续离线软体/破坏研究工具；当前没有本次核查证据证明其能直接作为移动浏览器游戏 runtime。多物理并不等于任何物体可真实模拟 | [v1.4.6](https://github.com/Genesis-Embodied-AI/genesis-world/releases/tag/v1.4.6)，2026-11-08；[核查提交](https://github.com/Genesis-Embodied-AI/genesis-world/commit/96a37f2b77c9faddcfdc7553a0d9a289b079eafc)，2026-11-10 |

许可证入口：[Rapier](https://github.com/dimforge/rapier/blob/master/LICENSE)、[react-three-rapier](https://github.com/pmndrs/react-three-rapier/blob/main/LICENSE)、[Three.js](https://github.com/mrdoob/three.js/blob/dev/LICENSE)、[Colyseus](https://github.com/colyseus/colyseus/blob/master/LICENSE)、[MuJoCo](https://github.com/google-deepmind/mujoco/blob/main/LICENSE)、[Genesis World](https://github.com/Genesis-Embodied-AI/genesis-world/blob/main/LICENSE)。正式引入时应保留对应发行物的许可证和声明，并逐个核查传递依赖及示例资产。

## Rapier 确定性的官方资料冲突

这是本次研究发现的实质问题，不能省略：

- [当前 TypeScript 绑定 README](https://github.com/dimforge/rapier/blob/master/bindings/typescript/README.md) 区分普通、SIMD、deterministic 构建，并说明普通版本不保证跨平台确定性。`-compat` 的含义是把 WASM 以 base64 嵌入 JS，解决打包兼容，不等于不依赖 WASM，也不等于确定性。
- [当前确定性文档模板](https://github.com/dimforge/rapier/blob/master/website/docs/user_guides/templates/determinism.mdx) 的 JS 段又笼统声称 WASM/JS 版本跨平台确定。两份官方资料表述不一致。
- [旧 rapier.js 仓库](https://github.com/dimforge/rapier.js) 已归档，README 指向合并后的主仓。旧文章里的构建行为不能直接视为当前发行物事实。

决策：比赛以唯一服务器结果为准；回放保存服务器状态与结果记录，不依赖每个手机重新仿真得出相同结果。锁定引擎发行物、构建选项、资产哈希、插入顺序、固定时间步、输入序列及规则版本。若要实现回滚或纯输入重放，需要用实际构建在 Windows/Linux/macOS 与移动浏览器进行相同输入的快照哈希对照；通过后才能做确定性承诺。应用自己的三角函数、随机数、时间读取也会破坏条件。

## “遵循真实世界物理”的可实现边界

1. 使用 SI 单位，长度米、质量千克、时间秒、力牛顿、扭矩牛米、能量焦耳；默认重力可以取 9.81 m/s²，规则集记录实际值。尺寸、密度、实体材料体积、质量、质心和惯量必须互相一致。
2. 单张照片能提供外观线索，不能唯一决定深度、实际尺度、内部空心结构、密度、质量和摩擦。用户需确认至少一个尺寸，并选择经过标定的材料/结构预设；不确定参数必须展示为假设。空心杯子不能按外包围盒体积乘钢密度计算质量。
3. 显示网格、碰撞代理、材料体积与质量分布是不同概念。凸包会填平凹槽；复合凸包可能重叠，其体积之和也不能直接当真实实体体积。必须提供碰撞体叠加预览，并由服务器批准版本。
4. [Rapier 碰撞文档](https://github.com/dimforge/rapier/blob/master/website/docs/user_guides/templates/colliders.mdx) 说明三角网格是无厚度边界，常用于静态场景；对任意动态凹形高面数网格，不应直接启用而没有清洗、分解、稳定性检查与复杂度上限。
5. [摩擦文档](https://github.com/dimforge/rapier/blob/master/website/docs/user_guides/templates/collider_friction.mdx) 说明当前不区分静/动摩擦系数，接触系数还由 combine rule 合成。这足以表明产品不能称为现实材料的完整数字孪生。第一版不承诺真实断裂、烧毁、流体、柔性、空气动力学或材料强度预测。
6. [CCD 文档](https://github.com/dimforge/rapier/blob/master/website/docs/user_guides/templates/rigid_body_ccd.mdx) 与[积分参数文档](https://github.com/dimforge/rapier/blob/master/website/docs/user_guides/templates/integration_parameters.mdx) 可用于高速穿透与时间步设置。CCD 不是任意速度下永不穿模的保证；需要速度、最小厚度、步长和压力测试共同约束。
7. 一块石头无法从键盘获得无源驱动。推荐上传物体作为竞技装置的外壳/载荷，添加公开且受规则限制的驱动组件。输入映射到受限力、扭矩和能量消耗，不直接改位置或无条件设速度。驱动组件的质量/惯量也应纳入总量。第一版采用出界判负，避免用任意“血量”冒充材料损伤。

## 多设备与实时操作建议（设计目标，待实测）

基线是支持 WebGL2、WASM、WebSocket 和 Pointer Events 的现代浏览器，覆盖桌面 Windows/macOS/Linux、Android Chrome、iOS/iPadOS Safari。按能力检测和实测报告发布支持名单，不按“能打开网页”宣称支持游戏。电视、手表、阅读器、主机浏览器及陈旧 WebView 不属于第一版承诺范围。

- 键盘：WASD/方向键移动、独立的短时加力键；焦点丢失清空按键，禁止浏览器快捷键造成卡键。
- 触屏：同一套归一化输入，虚拟摇杆和大按钮，多指操作、左手模式、触控安全区；不依赖 hover、键盘或强制全屏。iOS 相机、文件选择、横竖屏、来电/后台恢复需真机验证。
- 低档客户端：优先降低分辨率、阴影、后处理、纹理和显示 LOD，目标 30 FPS；中高档目标 60 FPS。客户端档位不得改变服务器质量、摩擦、碰撞代理、仿真步长和胜负判定。
- 默认单线程 WASM，不把 SIMD、SharedArrayBuffer、跨源隔离或 WebGPU 作为初次运行硬要求。WASM 失效时可退化为仅状态插值（若实现）；WebGL2 不可用保留资产管理/赛果页并明确无法进入 3D 对战。`-compat` 包不能让无 WASM 的设备获得物理支持。
- 低性能设备可以只渲染权威快照，关闭本地预测，但操作体验会受网络往返影响。必须显示延迟状态，不将其描述为与预测设备完全相同。

联机初始设计：服务器 60 Hz 固定仿真，客户端输入 30 Hz、服务器快照 20 Hz，三者独立；这些是起点而非验证后的最佳值。输入只有方向/按钮/序号，服务器验证范围、频率、所有权和可用能量；拒绝客户端坐标、质量、材质或判胜信息。远端物体插值；本地预测有服务器确认与校正，不能让预测结果裁决碰撞。

断网或失焦立即发送/应用中性输入，服务器将超过短时 TTL 的输入归零；例如 250 ms 的 TTL 需通过弱网体验测试定值。建议提供约 10 秒重连窗口，期间物体仍参与比赛且不会自动无敌；超时按明确规则判负。服务器无法维持仿真频率时标记比赛异常，不静默更改物理参数。需要覆盖 50/100/200 ms RTT、抖动、丢包、后台恢复、消息堆积、重连和重复输入。

## 计费和公平预算建议

不要把三维体积称为模型 token。模型供应商可能按文本 token、图片、请求、生成任务、GPU 时间等计费；这些与物体几何体积无固定映射。简单大球可能比微小复杂齿轮更便宜。

采用三个分离账本：

1. **模型成本**：用户自己的 API 凭据产生的供应商账单；平台事前显示供应商、模型、任务和最高预算，实际使用按供应商回执记录。成本不可预知的 provider 只能在用户设定并认可任务上限的专用适配器里执行，不能把估算显示为确定账单。
2. **平台处理额度**：资产转换、清洗、凸分解、存储、仿真和带宽的资源成本。初期可以给每个任务固定档位价格与硬上限，并记录实际 CPU/GPU 秒、字节和重试。报价后不可因一次后台自动重试无限追加扣费。
3. **竞技构筑预算**：无现金价值的规则点数，限制体积、总质量、驱动功率、最大能量和碰撞复杂度。付更多模型费用不能突破同联赛上限。建议首版质量/尺寸分组匹配，付费仅影响创造和外观选择。

可测量仿真工作量而非用体积猜费用：

`Work ≈ Σstep[a·activeBodies + b·broadphaseCandidates + c·contactManifolds + d·joints + e·CCDWork] · solverIterations`

该式仅是工程估计模型；系数必须通过实际硬件和场景基准拟合。凸块数、顶点数、接触数量、关节数、高速 CCD 和步数通常比显示体积更能反映负载。真实平台成本按 `CPU秒×单价 + GPU秒×单价 + 存储字节时×单价 + 出站字节×单价` 估算，并把固定运营成本单独核算。

初始硬限制可试验为：每个竞技体最多 16 个凸块、每凸块最多 64 顶点、每个房间 2 个竞技体、单局不超过 180 秒；所有数值都必须经资产质量与服务器负载基准再定。不能把这些建议值表述为当前已验证的稳定上限。

## 上线前必须给出的验证结果

- 实际锁定依赖版本与许可证清单；React/R3F/Rapier 对应关系检查。
- 自由落体、不同质量碰撞、斜坡/摩擦、空心/凹形/薄片、极端质量比、驱动能量限制、CCD穿透回归。
- 客户端伪造属性、超频输入、重复/过期输入、超大模型和压缩炸弹限制。
- 双方同时出界、卡住、超时、断线、服务器异常时的确定裁决及回放。
- 设备矩阵报告：至少一台中低端 Android、一台 iPhone、一台 iPad、集显 Windows、macOS；记录浏览器/系统/GPU、加载时间、内存、温度/降频、P95 帧时间和输入延迟。
- 实际场景压测：记录每房间 P95 物理步耗时、快照流量、目标并发下队列长度，不用单个空场景 FPS 推断服务容量。

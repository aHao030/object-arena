# MuJoCo 如何接入可驾驶机体平台

核查日期：2026-11-11。结论：**能用，而且对机架、关节、电机与接触的验证有实际价值。建议先纳入后台机械验证与可选的浏览器试验室，暂不直接替换 Rapier 的首发竞技裁判。**

本次重新读取官方 README、LICENSE、WASM README、模型/执行器/接触文档和加载源码；没有安装、跑模型或完成设备验收。除特别标注外，下列技术事实核查到 **4.0.0 标签**，避免把 main 的变化误当稳定发行能力。当前 releases API 返回的最新发布为 [4.0.0，2026-11-06](https://github.com/google-deepmind/mujoco/releases/tag/4.0.0)。

## 直接回答“能用上吗”

对本项目最合适的用途是：将已确认的标准机架、身体段、关节轴、模块质量和受限驱动导出成 MJCF，在后台检查装配是否合理、关节是否反向、力矩是否不足、接触是否异常，并产生可以查看的报告和轨迹。已有合格机体继续走当前 Three.js/Rapier/Colyseus 比赛主线，MuJoCo 验证服务不进入每个射击 tick。

如果之后确实要把“全关节主动机体”作为玩法核心，MuJoCo 可以成为主仿真引擎候选，而不只是辅助工具；届时需要同一场景的网络、控制与手机资源原型证明收益，单独冻结新引擎规则，不把它作为无成本替换。

## 当前官方浏览器能力

| 能力 | 已核实的事实 | 对本项目的意义 |
|---|---|---|
| 官方 JavaScript/TypeScript 绑定 | [4.0.0 WASM README](https://github.com/google-deepmind/mujoco/blob/4.0.0/wasm/README.md) 提供 `@mujoco/mujoco`，包括预编译 WASM、ESM 和类型声明；`mj_step`、`mj_loadXML` 等主要 API 已有测试 | 不是只能通过 Python 或第三方非官方移植运行；可嵌入自有网页试验室 |
| 单线程构建 | 同一 README 指定默认单线程构建，不要求多线程特殊隔离头，面向现代浏览器 | 可作为移动浏览器试验的起点；不代表本项目机体规模已能在所有手机流畅运行 |
| 多线程构建 | `/mt` 使用 Workers 与 SharedArrayBuffer，要求 COOP/COEP，缺少隔离条件会初始化失败 | 不能作为首发手机/平板运行的强制前提；还会影响页面跨源资源策略 |
| MuJoCo Live | [Studio 网页文档](https://github.com/google-deepmind/mujoco/blob/4.0.0/doc/studio/web_viewers.rst) 描述纯浏览器 WASM 仿真，可静态托管；可拖入 `.xml`、`.mjb` 和自包含 `.mjz`/`.zip`；iOS WebKit 有专用单线程构建 | 可给研究者或玩家一个机械试验入口；不能把拖入普通 GLB 等同于拖入可运行机器人模型 |
| Python WebViewer | 同一文档提供后台 Python 仿真、向浏览器流送场景/UI 的方式；默认只有一个 Controller，其余连接为 Spectators | 可用于工程师协作看机架；**不是**已经完成的 1v1 多人游戏服务器，不具备本项目的双人输入/反作弊/结算合同 |
| 成熟度与内存 | WASM README 仍标 WIP；部分模型编辑 API 未在真实 Web 应用充分验证。Embind 对象需显式 `.delete()`，复制的 contact 数据可能在下一步后过期 | 需做生命周期、峰值资源、反复加载和持续运行测试；不能以“用了 WASM”替代真机验收 |

绑定 README 还保留“截至 2025-11-13，Windows 支持实验性”的备注，语境是安装/开发过程，且文档主要开发平台是 Linux/Chrome。不能把它扩大解释成“Windows 浏览器不能运行 MuJoCo”，也不能忽略该备注直接宣称 Windows 开发体验已经验证稳定。应分别验证开发安装、网页运行和目标设备。

**两种网页形态不能混为一谈：** MuJoCo Live 在浏览器里算物理；WebViewer 的物理在后台、浏览器负责显示与控制界面。选择后台方案可以减少终端仿真负担，但仍有网络延迟、渲染与流量成本；官方 viewer 协议本身不替代竞技协议。

## 模型格式：为什么 GLB 仍不能直接变机器人

官方 [模型指南](https://github.com/google-deepmind/mujoco/blob/4.0.0/doc/modeling.rst) 将 MJCF 定义为原生 XML 动力学描述；也能加载 URDF 等模型格式。MJCF 的 body 树、joint、geom、inertial 与 actuator 描述机械系统，和普通模型的外观三角网格不是同一层。

[XML mesh 文档](https://github.com/google-deepmind/mujoco/blob/4.0.0/doc/XMLreference.rst#asset-mesh) 列出的基础 mesh 文件为二进制 STL、OBJ、自定义 MSH，或 XML 内的顶点/面数据。普通 GLB 需要经过本项目资产流程转换/提取；即使几何已能显示，也不会因此获得：

- 身体分段、关节中心/轴向/活动范围及父子关系；
- 各段质量、质心和惯量；
- 电机、传动、控制范围、力/力矩限制和控制器；
- 足部接触、碰撞分组、摩擦与求解参数；
- 标准站姿、步态平衡、武器/推进器插槽及游戏规则。

照片→3D 服务通常只能提供其中的外观部分，MuJoCo 不自动推断其余结构。平台应从已确认的 `FrameTemplateVersion + ModuleProfileVersion + MachineBuildVersion` 生成动力学模型，而不是把任意上传文件直接交给仿真器并宣称绑定成功。

**URDF 也不是万能捷径。** 官方模型指南说明它只覆盖 MuJoCo 元素的一个子集；URDF 有关节 effort 限制，但没有 MuJoCo actuator 模型，需要补充执行器。导入时 `fusestatic`、`discardvisual` 等默认行为与 MJCF 不同，某些原有 URDF 非物理参数会被拒绝；拼错的 URDF 属性还有被静默忽略的风险。导入后的模型必须检查编译报告与实际关节行为，不能只看“文件加载成功”。

## 多关节、电机和接触能帮助什么

根据 [MJCF XML reference](https://github.com/google-deepmind/mujoco/blob/4.0.0/doc/XMLreference.rst) 与[计算原理](https://github.com/google-deepmind/mujoco/blob/4.0.0/doc/computation/index.rst)：

- body 可通过 hinge、slide、ball、free 等 joint 表达自由度；不定义 joint 的 body 与父体刚性连接。适合表达机体肩肘髋膝与自由根体。
- inertial 可明确给质量与惯量；若省略，编译器可能从 geom 推断。因此本项目要显式采用标准模块数据，避免用户外观密度/几何意外改写竞技质量。
- motor、position 等执行器与 transmission 把控制输入映射为广义力；当前 4.0.0 还提供 DC motor 类型及可选电气/摩擦/热特性。**执行器存在不等于会自动平衡或正确走路**，仍要设计/调试控制器。
- `ctrlrange`、`forcerange` 及相应限制开关可以约束输入/输出；全局设置也可能改变是否执行某些钳制，必须纳入冻结配置。不能用不受限 position actuator 把肢体强行拉到动画位置，再宣称力矩与功率受限。
- 接触是有参数的近似模型，需要摩擦、接触维度、`solref`/`solimp` 等配置和标定。MuJoCo 文档明确讨论软接触与现实近似，不应将它描述为自动取得真实材料性能。
- 普通 mesh geom 的碰撞会使用凸化形状；可见凹槽不保证发生相同接触。初期优先使用规范的基础/复合碰撞代理。复杂非凸接触的其他建模方式需要单独验证，不自动开放任意上传高面数网格。

可用这些能力检查“膝关节反向”“新增背包后重心偏移”“电机力矩不足”“脚底严重穿透/打滑”“动作中肢体自撞”等问题。实际是否解决取决于模型与控制器质量，不能只用一次稳定站立录像证明所有装配可行。

## `simulate` 与加载入口的实际边界

官方 [`simulate` README](https://github.com/google-deepmind/mujoco/blob/4.0.0/simulate/README.md) 描述的是 GLFW/OpenGL 原生交互查看器，不是普通网页组件。它支持命令行和拖放加载。

本次读取的 [`simulate/main.cc::LoadModel`](https://github.com/google-deepmind/mujoco/blob/4.0.0/simulate/main.cc) 对 `.mjb` 调用 `mj_loadModel`，对 `.xml` 调用 `mj_loadXML`，其他格式走 `mj_parse` 后编译。这里的“能拖放模型”是解析器接受的动力学模型，不是任意图片/GLB 自动变机械系统；依赖 mesh、纹理和 include 必须可用且编译通过。

MuJoCo Live 的自包含归档用于打包模型及依赖；这不改变本平台原件上传目前的安全边界。第一步可只导出平台生成、白名单资源组成的 MJCF 包，不向普通玩家开放任意 MJCF 插件、任意路径 include 或后台代码执行。自定义模型包能力应作为独立输入路线验证。

## 接到当前 v0.4 的具体支持方案

以下是建议新增的实现合同，尚未开发，不表示已有对应接口。

### 1. 两种验证 profile

| profile | 来源与目标 | 可证明什么 | 不能证明什么 |
|---|---|---|---|
| `game-proxy` | 从当前动态根体、质量、推进/扶正限制和简化接触代理导出 | 检查数据与单位一致性，做自由落体、受力响应、推进/功率和基础接触实验 | 不能据此声称已经验证真实双足每个关节或 MuJoCo 与 Rapier 逐 tick 相同 |
| `articulated-lab` | 从标准分段机架、joint、每段惯量和受限 actuator 导出 | 检查机械装配与多关节控制，测试动作、背包/武器载荷和步态研究 | 不自动作为首发参赛门槛；标准动画驱动的游戏机体不应被假装成已有主动平衡机器人 |

`core-shell` 用户不应因为没有自己的身体关节而被这个服务重新卡住：其标准机架沿用已有验证版本，用户外壳只做几何/动作适配检查。只有功能性机架/模块或控制配置变化时，才需要相应机械验证；不为每次换色重新跑昂贵动力学。

### 2. 输入与输出

输入：冻结的机架/模块/机体 build、规范碰撞代理、控制器版本、验证 profile 和样例场景。显式转换坐标轴、关节局部轴、角度/长度单位和四元数约定，不能直接把渲染矩阵当 MJCF 动力学参数。

输出建议为 `MechanicalValidationReport`：包含 build/profile/MuJoCo 构建/导出器/控制器/场景哈希、编译错误与警告、检查项目结果、关节/接触/功率峰值、异常时刻、轨迹和可复现包引用。状态建议 `queued → running → completed / failed / resource-limited`；`completed` 不等于通过所有检查，报告中各项分别判定。

可以增加类似 `POST /v2/machine-builds/{id}/mechanical-check` 和 `GET /v2/mechanical-checks/{id}` 的异步边界；后台进程有时间、内存、模型复杂度和并发限制。平台额度 PC 显示本次验证预算，和照片模型 API 费用及竞技 CP 分开。首发不因失败自动切换更贵控制器训练或反复消耗额度。

### 3. 可选浏览器试验室

读取报告的已批准模型包，展示关节轴、碰撞代理、电机限幅与报告轨迹。先使用单线程 WASM与小模型；能力不足则提供后台轨迹播放，不把失败设备直接标为不支持整个平台。使用已批准产物，既不要求玩家交出 API 密钥，也不将第三方模型链接当作可信下载地址。

对原件与派生机械包继续检查所有者/授权；报告或 viewer 不向对手公开原图、完整制作模型与凭证。若采用官方 WebViewer 做内部工具，其默认单控制者和网络暴露方式需明确，不能直接挂成公开多人比赛。

## 后台支持与替换主引擎的取舍

| 用法 | 建议 | 原因 |
|---|---|---|
| 后台机架/模块验证 | 近期纳入具体支持路线 | 正好利用多关节/执行器/接触能力，不要求所有手机每帧运行复杂机体 |
| 浏览器关节试验与报告回放 | 做小规模可选原型 | 官方 WASM 已具基础；可让用户看到修正依据，但需验证移动资源和接口成熟度 |
| 直接取代当前 Rapier 房间 | 暂不默认执行 | 还要补多人输入、预测校正、碰撞/命中规则、武器与能量账、恢复/回放、跨端性能；官方 viewer 不是这些系统 |
| 全关节主动机体竞技 | 后续独立候选路线 | 有技术适配性，但控制/平衡、模型制作与网络预算要重新验证，不能由“MuJoCo 支持关节”推导产品已可行 |

**不要采用双裁判：** 不能本局 Rapier 已判定命中，随后用 MuJoCo 后台重算并改写胜负；两引擎的接触/积分/控制近似不同。MuJoCo 报告是机械与模型开发证据，比赛只使用赛前冻结的唯一权威引擎。若以后切换主引擎，应升级规则与协议，并保留旧对局解释。

## 许可及验收

MuJoCo [源码 LICENSE](https://github.com/google-deepmind/mujoco/blob/4.0.0/LICENSE) 为 Apache-2.0；官方 README 另说明 `doc` 下文档、图片、视频为 CC-BY-4.0。示例机器人、第三方 mesh、纹理、插件和用户原件仍要逐项记录来源，不能由引擎许可推断全部资产可自由发布。

最小验证顺序：标准机架可导出并编译 → 关节轴/限位/质量惯量检查 → 相同控制输入的受限动作与接触实验 → power/energy 与失能逻辑对照 → 修改模块后可解释的报告差异 → 单线程浏览器加载/反复销毁/手机资源测试。任何“机械验证通过”都必须附模型、控制器、测试与运行构建范围，不称为现实机甲认证。

当前结论是“已核实可接入，并定义了支持方式”，不是已经完成 MuJoCo 集成。

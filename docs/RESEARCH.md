> 历史v0.3：对应底座推台设计，仅供追溯。当前机体设计见 [v0.4](mecha-v0.4/README.md)，不把旧规则和任务当现行方案。

# GitHub 开源选型与复用方案

调研时间：2026-11-10。优先读取项目官方仓库、源码、README、许可证与发布记录；未安装或运行候选，不以 star 数当质量和维护证明。以下选择为工程建议，原始证据见 [图像与资产](../research/3d-evidence.md)、[物理与联机](../research/physics-evidence.md)。

## 首发推荐组合

| 环节 | 选项 | 具体复用方式 | 必须补上的工作 |
|---|---|---|---|
| 浏览器显示 | [Three.js](https://github.com/mrdoob/three.js)，MIT | GLB 加载、相机、LOD、场景与触控界面 | 设备检测、视野公平、上下文恢复 |
| 物理求解 | [Rapier](https://github.com/dimforge/rapier)，Apache-2.0 | 服务器刚体、碰撞、CCD、惯量 | 真实单位、动力模型、规则、固定版本验证 |
| 多人房间 | [Colyseus](https://github.com/colyseus/colyseus)，MIT | 房间、状态同步、消息与重连机制 | 输入校验、物理接线、结果持久化、滥用控制 |
| 资产优化 | [glTF Transform](https://github.com/donmccurdy/glTF-Transform)，MIT | GLB 优化、去重、纹理和网格压缩 | 非闭合几何检查、碰撞代理、尺寸确认 |
| 单图基线 | [TripoSR](https://github.com/VAST-AI-Research/TripoSR)，README 声明代码与预训练模型 MIT | 作为可替换服务生成初始 mesh | 透明背面推测、尺度校准、碰撞与质量档案 |
| 高质量选配 | [TRELLIS.2](https://github.com/microsoft/TRELLIS.2)，代码与模型 MIT | 由独立 GPU 服务导出 PBR GLB | 作者要求 ≥24GB 显存/Linux；成本、拓扑和移动端资源要另验 |

首发导入优先，图像生成异步处理，不把高显存要求转嫁给手机。使用某个图像模型不代表已存在稳定托管 API；自部署和第三方服务是不同交付路线。

## 有价值但暂不默认采用

| 项目 | 用处 | 暂缓理由 |
|---|---|---|
| [react-three-rapier](https://github.com/pmndrs/react-three-rapier) | 快速搭预览/训练场 | 不是联机服务器；React/R3F/Rapier 版本耦合，包装层当前依赖不能假定与新引擎一致 |
| [TRELLIS](https://github.com/microsoft/TRELLIS) | mesh、Gaussian、radiance fields 的多表示研究 | 只接收 mesh 分支；非网格输出不能直接计算碰撞 |
| [Stable Fast 3D](https://github.com/Stability-AI/stable-fast-3d) | 单图 UV 与带材质 GLB | 自定义社区许可，须核对商业条件、权重获取和维护情况 |
| [Hunyuan3D-2](https://github.com/Tencent-Hunyuan/Hunyuan3D-2) | 几何与纹理生成及 API 示例 | 2.0 自定义社区许可含地域/规模条件，不能当全球默认商用方案；版本之间不能混用许可结论 |
| [COLMAP](https://github.com/colmap/colmap) | 多视角真实扫描 | BSD 许可；拍摄与重建流程更复杂，仍需尺度校准和补洞，留在后续阶段 |
| [MuJoCo](https://github.com/google-deepmind/mujoco) | 复杂关节、机器人控制 | 已有官方 WASM 支持，但首发不需要第二引擎和更复杂建模工作流 |
| [Genesis World](https://github.com/Genesis-Embodied-AI/genesis-world) | 多物理离线研究 | 尚无本次证据支持直接作为移动浏览器游戏 runtime；软体/破坏不在首发范围 |

许可证条款以具体 commit、模型权重、依赖和部署方式为准；引入前留存许可文本及 NOTICE，不把本表视为完成所有授权审核。

## 研究直接改变了什么

1. 生成外观、物理档案和碰撞代理分开验收，模型输出不直接参赛。
2. 上传物体加标准驱动底座，明确动力和电量，避免无源移动。
3. 体积进入 CP，费用按供应商用量和平台资源分别计量。
4. 比赛不调用大模型，模型断线不改变现有物体对战。
5. 手机降低画质但共享碰撞规则；当前 Three.js 没有 WebGL1 降级通路。[官方 WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)
6. 保存服务器权威位姿回放，不依赖任意设备或新版本从输入重算都完全相同。Rapier 当前构建说明与确定性文档表述存在差异，必须通过实际构建验收。[绑定说明](https://github.com/dimforge/rapier/blob/master/bindings/typescript/README.md)

## 采用前的小型比较实验

准备实心方块、杯子、细杆、空壳、反光与低纹理物体各至少一个；分别生成/导入，记录可用 mesh 率、人工修复时间、代理误差、尺寸确认、实际费用、手机解码峰值和是否能完成一局。相同输入比较 TripoSR 与可用高质量适配器；不直接引用论文或 demo 的秒数作为产品 SLA。

通过标准先看闭环是否可信和可玩，再比较外观精细度。若照片生成仍不稳定，保留导入和预置物体路线，照片入口明确为试用功能；不能因此取消用户已明确要求的最终照片路线。

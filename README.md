# 物竞场：把自己的模型变成可驾驶机体

当前可运行原型 v0.5 · 2026-11-11。私有代码仓库：[aHao030/object-arena](https://github.com/aHao030/object-arena)。产品目标：照片或3D模型→可驾驶机体→改装→实时对战；统一可解释物理，允许受限推进器和科幻武器。

本次已接入 Three.js + Rapier + Colyseus + MuJoCo。可以进入真实3D训练场、驾驶原创标准机体、有限推进/升空、射击靶标，或者让两个浏览器进入同一个对战房间。支持本机GLB躯干外壳预览，以及独立的MuJoCo双关节机械臂负载验证。

这只是首条可运行路径。导入外壳不改变碰撞或机体能力，其他玩家仍看到标准机体。照片生成、任意模型自动分件/骨骼、完整改装、近战、护盾、部位失能、回放、账户与模型API尚未实现。不扣除token，也不发送用户文件给模型供应商。

## 运行

安装 Node.js 22 或更新版本，在仓库根目录运行：

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:5173 。网页开发服务5173直接连接竞技服务器2567；两者默认只监听本机。先点击“进入训练场”，再点击战场驾驶。鼠标右键拖动观察；浏览器允许时，也可单击战场或“启用鼠标视角”锁定光标，Esc释放。默认WASD按镜头方向移动，Space短按起跳/保持续升，Shift加速推进，左键射击，C缓行；这些操作可并行。Q/E/R/T为四个未装备技能槽。点击“修改键位”可重绑移动/升空/推进/缓行与技能槽，自动保存在当前设备，可恢复默认；冲突键和浏览器保留键不可使用。设置期间不发驾驶动作，但服务器不会暂停。推进余量空中不回，耗尽后需落地恢复；落地回正期间不能再次起跳/推进。触屏有对应按钮和滑杆。双人房间可复制房间号分享给另一浏览器。

生产构建与同源本机服务：

```sh
npm run check
npm start
```

构建后打开 http://127.0.0.1:2567 。同一服务提供网页、HTTP接口与WebSocket。容器部署、跨设备配置和边界见[部署说明](docs/engineering/DEPLOYMENT.md)。本轮未购买云服务器或发布公网服务。

独立运行真实机械试验：`npm run lab -- --payload 0.1`。轻载与重载的实际报告保存在[机械验证证据](apps/lab/evidence/)；接口与限制见[验证说明](apps/lab/VERIFICATION.md)。

## 代码与来源

| 目录 | 用途 |
|---|---|
| `apps/web` | Astryx界面、Three.js机体与本地GLB预览 |
| `apps/server` | Colyseus房间、HTTP与静态网页服务 |
| `apps/lab` | 隔离Worker内的真实MuJoCo WASM机械验证 |
| `packages/sim` | Rapier权威仿真、输入规则、命中与结算 |
| `packages/protocol` | 版本化协议、机体目录与实际能力 |
| `tests` | 真实物理、机械与SDK联机行为测试 |
| `integrations` | 版本、来源、发布物完整性与许可登记 |
| `tools/mattpocock-skills` | 保留原文与许可的指定工作流快照 |
| `legacy/showcase` | 退役推台展示，仅供历史追溯 |

[本次切片规格](.scratch/integration-v0.5/spec.md) · [接入与取舍](docs/engineering/INTEGRATIONS.md) · [第三方许可全文](THIRD_PARTY_NOTICES.md) · [实际日志](logs/2026-11-11-integration.md)。后续每次本项目开发都遵守项目内保留的Matt工作流：规格、分解、行为测试、实现、双轴审查与日志，不把设计目标当成已实现能力。

当前规则mecha-slice-0.3，采用Minecraft键鼠骨架与EXVS式有限机动，按用户最终要求调整键位。具体取舍见[参考与映射](docs/engineering/MOVEMENT-REFERENCES.md)、[组合控制规格](.scratch/mecha-arena/combined-controls-spec.md)、[最新日志](logs/2026-11-11-combined-controls.md)。此前已观察3D训练、鼠标、起跳续升、左键命中与390px布局；最新改键的浏览器证据见最新日志。内置浏览器拒绝Pointer Lock，成功锁定与原生Esc释放仍需允许该能力的浏览器复验；GLB视觉、2D降级与真实手机触屏仍待验。

本轮54项本地测试、类型检查与构建通过；远端自动检查与独立审查结果见最新日志。

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

[历史展示源码](legacy/showcase/README.md)与[旧私密在线版](https://object-arena-demo-ahao.sweetowlet132.chatgpt.site)仍是退役推台Canvas样机，不代表本次3D集成版。根DESIGN.md与.impeccable/design.json记录旧视觉系统。旧v0.3压缩包不进入新仓库。

v0.4文档保留完整目标设计。实施状态以本README、v0.5规格和实际日志为准。当前浏览器适配与真实引擎测试不能替代手机/平板真机性能验收。

# GitHub机体平台选型

核验日期2026-11-11。本轮搜索Gundam/Gunpla、机甲战斗、模块拼装、Robocraft类、浏览器多人、骨架与分件等关键词，并读取重点仓库的README、许可证和关键源码。没有运行、构建或做真机评测。

本轮未找到覆盖“任意照片/模型→分件绑定→改装→跨端服务器PvP”全流程的成熟替代品；这不是全网不存在的证明。可采用部分模块与工具组合，不能将一个名字相似的仓库当成完整平台。

## 最接近的项目

| 项目 | 真实可借鉴内容 | 本项目怎么用 |
|---|---|---|
| [RobotWarrior](https://github.com/michaelcrosato/robot-warrior) | MIT浏览器游戏，有驾驶、喷气、热量、部位损伤、触屏、四人WebRTC合作 | 优先评估驾驶/HUD/部位事件等模块；玩家主机合作改为服务器PvP，移动/碰撞重做，补上传与改装 |
| [MechRewired](https://github.com/deanthecoder/MechRewired) | MIT代码，Godot .NET原生机甲重实现，有驾驶系统参考 | 参考机体/热量/控制分层；不作为Web首发整包，原作游戏数据并非随源码自由分发 |
| [Flying Mech Controller](https://github.com/s-haha-n/Flying-Mech-Controller) | Godot飞行/锁定/射击原型 | 研究动作与镜头；未找到覆盖工程的根许可证，暂不复制分发 |
| [Robot Builder](https://github.com/turuko/Robot-Builder) | Unity本地模块拼装原型 | 参考部件放置/删除/质量累计；没有完整驾驶、多人与Web闭环证据，授权须补齐 |
| [RoboCraftAssembler](https://github.com/dddontshoot/RoboCraftAssembler) | Blender部件装配工具 | 只研究部件ID和变换结构，不带入商业游戏素材 |
| [Project Plavsky Particle](https://github.com/GaiusSensei/Project-Plavsky-Particle) | 同人桌面规则文档骨架，章节为空 | 排除开发依赖，不能称完整规则或游戏 |

完整证据、固定提交和许可证边界见[游戏研究](../../research/mecha-game-evidence.md)。Robocraft同名软体科研代码、空的Gundam-build-fighters、粉丝网站与商业游戏Mod不算本项目所需成品。

RobotWarrior最关键的源码取舍：移动直接改actor坐标，不等于受力机体；其画质档与手机辅助适合合作，不可原样带入跨端竞技；其MIT也不覆盖未随仓库分发的商业原作音乐。[移动源码](https://github.com/michaelcrosato/robot-warrior/blob/main/src/sim/movement.js)、[架构](https://github.com/michaelcrosato/robot-warrior/blob/main/docs/architecture.md)、[素材说明](https://github.com/michaelcrosato/robot-warrior/blob/main/docs/assets.md)

## 真正需要补齐的工具链

| 环节 | 项目 | 采用决定 |
|---|---|---|
| 外观/动画 | [Three.js](https://github.com/mrdoob/three.js)，MIT | 沿用显示、骨架与重定向；不承担自动分件或战斗裁判 |
| 根体物理 | [Rapier](https://github.com/dimforge/rapier)，Apache-2.0 | 采用动态根体；不混淆内置运动学控制器与受力角色 |
| 动态角色参考 | [Ecctrl](https://github.com/pmndrs/ecctrl)，MIT | 研究地面检测、受限支撑与输入；纯仿真从React显示分离 |
| 联机验证 | [Colyseus](https://github.com/colyseus/colyseus)与[Prediction Playground](https://github.com/colyseus/prediction-playground)，MIT | 房间、输入/预测/延迟试验，自己实现机甲命中与资源规则；示例依赖须检查 |
| 骨架建议 | [UniRig](https://github.com/VAST-AI-Research/UniRig)，代码MIT、官方模型卡MIT | 候选生成＋人工确认；不把可动画直接等同可战斗，机甲硬表面优先刚性分件 |
| 分件候选 | [Hunyuan3D-Part](https://github.com/Tencent-Hunyuan/Hunyuan3D-Part)，自定义社区许可 | 有分割/补全部件能力，公开X-Part是轻量版，地域/商业条款需对应审核，首发不强依赖 |
| 整合引擎备选 | [Babylon.js](https://github.com/BabylonJS/Babylon.js) / [网页Havok包](https://github.com/BabylonJS/havok) | 核心Apache-2.0、核查网页包MIT，不能笼统说收费专有；用同场景原型决定是否更换 |
| 完整编辑器备选 | [Godot](https://github.com/godotengine/godot)，MIT | Web有语言/渲染/浏览器约束，不能直接拿原生C#项目宣称浏览器可用 |
| 后续关节物理 | [Jolt](https://github.com/jrouwe/JoltPhysics) / [JoltPhysics.js](https://github.com/jrouwe/JoltPhysics.js)，MIT | 真正需要主动关节机体时再比较，不在首发混用第二权威引擎 |
| 用户指定机械验证 | [MuJoCo](https://github.com/google-deepmind/mujoco)，Apache-2.0 | 关节、电机、接触验证；有官方WASM路线，先接机械工作台，全关节比赛再验收唯一权威后端 |

详见[技术证据](../../research/mecha-technical-evidence.md)与[可动化证据](../../research/mecha-asset-evidence.md)。旧版调研的图像转3D与glTF清洗仍可作为资产阶段候选，不能因此绕过骨架、分件、模块映射等新增步骤。

## 复用顺序

先运行许可清晰的驾驶/联机小原型；选取能服务于本项目合同的模块，记录所用commit与许可证。再用自己的原创参考机体测试导入、映射和改装；最后让自带API的照片路线接入同一流程。不先下载一大包原作机体、音乐或商业游戏资源。

新机体核心属于平台自己的装配图、规则目录和资产验证，不绑死某款完整同人游戏。代码、权重、素材和品牌四层分别核对；某层开源不自动授权其他层。

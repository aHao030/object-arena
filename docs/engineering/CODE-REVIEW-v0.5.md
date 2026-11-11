# v0.5 双轴独立代码审查

遵循保留的Matt code-review流程，两代理均从fresh context开始，分别审查Standards与Spec，未相互交流。固定基点`e77794f3f8f77eb071e5d2df451c47e4250f95fa`已解析，非空diff为`git diff e77794f3f8f77eb071e5d2df451c47e4250f95fa...HEAD`；首轮审查HEAD为`23daf41d8f2116ab48fe33a0efe0768f370390c9`，commit `feat: integrate authoritative mech arena and real MuJoCo lab`。以下报告只清理格式，保留各轴结论，不合并排序。

## Standards

硬性规范：

- `.scratch/integration-v0.5/tasks.md:7–10`：四项任务仅存汇总表，状态使用“已实现”等自由文本，未建立独立任务文件。违反 `docs/agents/issue-tracker.md:6–7` 的“一任务一文件”和状态枚举；应补独立记录并保留待验项。

可复现行为缺陷：

- **[P2] 独立升空操作无效**：`packages/sim/src/index.ts:198` 仅在 `current.boost` 时处理升空；原App分别发送两个按钮。真实Rapier连续90步lift:true高度仍1.020m；同时boost:true则6.081m。界面承诺的E/“升空”不能单独工作。关联AGENTS.md“先验证外部行为”。
- **[P2] 贴身射击无法伤害对手**：`packages/sim/src/index.ts:266–268` 将枪口前0.9m内所有碰撞都当障碍。真实双机接触、中心间距0.84m后互射一秒，各消耗四发，双方HP仍1000，全部产生muzzle-blocked。应区分受击代理和场景遮挡并补失败测试；关联AGENTS.md“物理……失败路径必须覆盖”。
- **[P2] 慢请求独占机械工作台**：`apps/server/src/index.ts:52–58` 在完整读取请求体前占全局锁，读取没有专用截止。真实HTTP请求声明100字节但仅发送“{”，8.5秒后其他合法请求仍429；断开首请求后恢复200。Worker八秒限制未覆盖此阶段。
- **[P2] 坏贴图导入泄漏Blob URL**：原Scene未追踪清理加载器创建的Blob URL。预检接受截断PNG；向真实GLTFLoader注入解码失败后，创建URL一次、撤销零次。加载器吞掉贴图错误，普通场景清理也无法释放该URL；反复导入可累积文件内存。应在加载结束/失败时统一撤销。

判断性smell：

- **Possible Duplicated Code**：原rooms.ts两处重复sentResult=true、recordResult、broadcast(result)，可提取单次结算发布方法。

日志如实保留视觉验收未完成，没有将其计为通过。

## Spec

(a) 要求缺失/部分实现：以下3项为实际行为缺陷；已披露的视觉、触屏及真机待验不另算代码缺陷。

(b) 未请求的范围扩张：未发现。

(c) 看似实现但行为错误：

1. **[P1] 多数终局不会更新网页状态。** 规格第8行：“两客户端能看到相同命中与结果。” 原rooms.ts只在serverTick%3===0广播快照；结束后步数冻结。原App收到result只清按键、不更新显示。真实SDK复现：双方收到步1145的相同结果，最后快照永久停1143/running/result:null/双方HP20。应结算时无条件广播最终快照并验证消费终局。
2. **[P2] 贴身射击全部失效。** 规格第7行：“服务器Rapier计算运动、有限推进、弹丸和靶/机体命中。” 原sim将枪口前0.9m内所有碰撞直接按阻塞返回，包含合法受击机体。真实Rapier复现双方胶囊接触、4发全muzzle-blocked、HP1000。应短射线命中机体/靶标时处理伤害，墙体仍阻挡。
3. **[P2] 单独“升空”控件没有作用。** 规格第19行：“本次界面必须准确显示已接入能力和剩余范围。” README写“E升空”；原App只映射lift，sim仅boost同时真才推进。真实Rapier90步仅lift高度1.020m/能量50000；boost+lift高度6.081m/能量31250。应让独立升空启动有限推进，或修改控件及说明。

首轮总计：Standards 6项（最严重行为P2，含1项硬规范和1项判断性smell）；Spec 3项（最严重P1）。

## 修复与复验

各行为缺陷均先添加失败回归再修复。规则升级为mecha-slice-0.2，避免静默改变物理解释。修复包括独立升空输入映射、近距受击代理与墙体区分、先最终快照再唯一结果、完整请求才占锁与2秒读取期限、加载成功/失败均撤销临时URL，以及独立枚举任务记录。

Standards复验（原独立轴）：首轮6项全部resolved；独立运行HTTP、GLB加载、输入、仿真与SDK测试12/12通过，约26.4秒。整体解析失败并伴随异步贴图的附加探针结束后活跃URL为零；“finally后晚到URL”未复现，不列为缺陷。新增发现：无。

Spec复验（原独立轴）：首轮3项全部resolved；独立运行9项相关测试9/9通过，验证非3倍数终局快照/结果、贴身伤害与掩体、独立升空与释放落地。新增发现：无。

主实施者最终npm run check退出0：23/23行为测试、类型检查与生产构建通过；源码与构建doctor 20pass/3warn/0fail。3D/降级/GLB视觉、触屏与真机仍独立列为未验，不能通过代码审查抹去。

复验结论：Standards 0项未解决（原6项关闭）；Spec 0项未解决（原3项关闭）。

修复提交`1ad37de48c4a287aed6a5e91eda5a1ba43255934`已推送，远端HEAD回读一致；[GitHub Actions 42960801192](https://github.com/aHao030/object-arena/actions/runs/42960801192)完成并通过，包括npm ci、npm run check及对源码目录的doctor。本次文档收尾不改变已验证源码。

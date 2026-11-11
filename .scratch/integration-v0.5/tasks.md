# v0.5 纵向切片任务

规格：[spec.md](spec.md)。本地issue tracker，未向外发布Issue。任务按可观察行为拆分，不按框架目录拆空任务。

| 任务 | 公开行为与失败边界 | 实现 / 验证 | 状态 |
|---|---|---|---|
| I-01 真实训练与同局对战 | 动作改变权威位置；能量有限；服务器命中/结算；伪造坐标、过期/重复/限频动作无效；两客户端同伤害同结果 | packages/sim、apps/server、packages/protocol；simulation/server测试；TDD-LOG.md | 已实现，真实WASM/SDK验证 |
| I-02 有限机械工作台 | 受限负载输入驱动真实MuJoCo；轻载通过/重载失败；拒绝XML/URL/插件、超限与并发过载 | apps/lab；mujoco测试、evidence、VERIFICATION.md；HTTP实测 | 已实现，真实引擎/HTTP验证 |
| I-03 机库到驾驶与本地外壳 | 从大厅进房、可键盘/触屏动作、Three呈现；GLB仅本地外壳并先预检预算；GPU失败可兼容视图，准确披露能力 | apps/web；glb测试；Astryx源码/构建doctor | 已实现/构建通过，视觉/触屏与真机待验 |
| I-04 可追溯交付与复核 | 私有独立仓库、锁文件、许可、来源、部署配方、日志、固定基点双轴独立审查及修复 | integrations、THIRD_PARTY_NOTICES、README、docs/engineering、logs | 来源/仓库已建立，最终复核与推送见日志 |

固定review基点：e77794f3f8f77eb071e5d2df451c47e4250f95fa。正式支持/全产品完成不在本切片的完成声明内。

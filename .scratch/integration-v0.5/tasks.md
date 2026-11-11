# v0.5 纵向切片任务

规格：[spec.md](spec.md)。本表为导航索引；正式任务按一任务一文件保存在下方链接，状态使用项目枚举。未向外发布Issue。

| 任务 | 公开行为与失败边界 | 实现 / 验证 | 状态 |
|---|---|---|---|
| [I-01 真实训练与同局对战](../mecha-arena/issues/10-authoritative-integration.md) | 动作改变权威位置；有限能量；服务器命中/结算；两端一致 | Rapier/SDK行为测试；审查后近距/终局回归 | done |
| [I-02 有限机械工作台](../mecha-arena/issues/11-mujoco-integration.md) | 真实负载诊断与资源/输入边界 | MuJoCo/HTTP测试；审查后慢请求回归 | done |
| [I-03 机库到驾驶与本地外壳](../mecha-arena/issues/12-hangar-integration.md) | 大厅驾驶、GLB本地外壳与降级 | 构建/边界测试；视觉/触屏/真机待验 | in-progress |
| [I-04 可追溯交付与复核](../mecha-arena/issues/13-provenance-delivery.md) | 来源/许可/仓库/部署/日志与双轴审查 | 独立审查后修复与最终推送 | in-progress |

固定review基点：e77794f3f8f77eb071e5d2df451c47e4250f95fa。正式支持/全产品完成不在本切片的完成声明内。

# I-01: 真正进入训练与同局对战

**Status:** done

**Spec:** .scratch/integration-v0.5/spec.md

**Blocked by:** none

**What to build:** 原创标准机体动作进入真实Rapier权威世界；Colyseus支持训练和双人比赛。

- [x] 可演示：两个SDK客户端同场驾驶/射击、相同步的HP和同一终局/HTTP结果。
- [x] 失败场景：拒绝伪造坐标、重复/过期/限频输入、第三人加入；能量非负，重力使机体落地。
- [x] 通过条件补充：修复并回归贴身射击与非快照周期终局，最终全套检查通过。

实现：packages/sim、apps/server、packages/protocol。验证：tests/simulation.test.ts、tests/server.test.ts、packages/sim/TDD-LOG.md。规则mecha-slice-0.2，Spec轴独立9/9复验、全套23/23检查通过；不代表完整M01/M04目标或浏览器手感验收完成。

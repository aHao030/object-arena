# M16：组合驾驶与技能键

**Status:** done

**Spec:** .scratch/mecha-arena/combined-controls-spec.md

**Blocked by:** none

演示：WASD＋鼠标＋Space升空＋Shift并发，左键射击，Q/E/R/T未装备槽，自定义键位/冲突提示/刷新保留/恢复默认。

- [x] 复现旧Shift缓行及Space隐式升空行为，真实红→绿。
- [x] 来源独立释放、组合Rapier运动/射击与资源失败验证。
- [x] 实际网页驾驶及桌面/390px技能槽检查。
- [x] 当前设备键位保存、重绑冲突拒绝与重置验证。
- [x] 固定基点Standards/Spec独立审查、修复、仓库提交及日志。

失败边界：UI焦点时优先控件自身键盘行为；失焦/解锁清理不能残留推进射击；未装备槽不能制造能力；并发不得凭空补能或突破速度/射速。

源码f5a4a24已推送，GitHub Actions 43007200509 completed/success（54项测试/类型/构建/doctor）；双轴原问题全部关闭。交付日志logs/2026-11-11-combined-controls.md保留GUI分组验证与真实键盘/手机/Pointer Lock未验边界。

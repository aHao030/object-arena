# M15: Minecraft式键鼠与EXVS式快速机动

**Status:** in-progress

**Spec:** .scratch/mecha-arena/movement-spec.md

**Blocked by:** none

**What to build:** 鼠标/WASD/Space基础移动，Q有限推进与空中转向，落地恢复；左键/F射击，Shift缓行，触屏保留。

- [x] 真实Rapier相机方向、斜向、公平限力起停、跳跃边沿、空中/过热/落地资源回归。
- [x] 键位/鼠标组合按键、短按采样及清理回归，旧房间/射击一致性通过。
- [x] 状态HUD与实际浏览器驾驶观察，记录未验分支。
- [ ] 完整检查、Standards/Spec独立审查修复、私有仓库提交推送与日志。

失败场景：拒绝伪造jump/slow/资源字段；空中不能无限重跳、回血推进余量或回复电池；空指令/失焦不残留开火与推进；不能让Ctrl+W变成常用操作组合。

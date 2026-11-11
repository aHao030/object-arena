# 移动增量双轴代码审查

按保留的Matt code-review指令，两独立fresh-context代理分别审查Standards与Spec，不共享结论。固定基点373abf3276d5a60b4807051c699f52489be09ec6，首轮HEADafb5587d95ad5c0e1413422e3e88ea8b77968b17，diff `git diff 373abf3276d5a60b4807051c699f52489be09ec6...HEAD`，commit `feat: add camera-relative jumping and bounded EXVS-style boost movement`。基点已解析，diff非空。

## Standards

1项P2行为缺陷，无新增硬规范或值得提出的smell：pilotControls仅按action保存held，释放F会删除仍由左键持有的fire，反向亦然，触屏按钮也会覆盖。公开采样器连接真实Rapier复现：首发1次，松F后持续0.65秒仍1次。关联AGENTS公开行为验证要求，应按物理来源聚合。

独立运行移动/采样/鼠标生命周期18/18通过，说明已有测试未覆盖跨来源组合；没有把通用原则夸成明确实现规范。未操作浏览器、未修改文件。

## Spec

1项P2，无新增范围扩张：规格“左键/F射击”，但持续左键→F按下→F释放的采样true/true/false，左键未释放却停火。应来源独立持有并回归组合释放。

未发现可确认的空中资源恢复、空中重复跳跃、落地回正跳跃/推进绕过、相机方向或Q/Ctrl键位违规。实际浏览器观察由主实施者进行。

## 修复与原轴复验

- 新增真实Rapier公开回归先红：松F后仍按左键但不再产生新射击。将held改为action→source集合，键盘key:code、左键mouse:primary、按钮pointerId/按钮键盘code分别持有；释放一个来源只删除自身。
- 修后两种释放方向均继续真实射击，clear后停止。采样/键位/鼠标针对13/13、类型检查通过。
- 原Standards轴独立12/12通过，确认该项关闭，触及清理无新增回归；原Spec轴独立13/13通过，确认该项关闭且未发现新增问题。

结论：Standards原1项关闭，0项未解决；Spec原1项关闭，0项未解决。最严重均P2。最终构建、CI与远端回读见移动日志，不以此审查替代手机/平板或正向Pointer Lock实测。

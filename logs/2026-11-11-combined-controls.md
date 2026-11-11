# 组合驾驶与技能键修订

用户最终明确WASD移动、鼠标视角、Space升空、Shift加速、左键射击，Q/E/R/T技能槽及玩家可自行改键。本轮基点659e694fc8329d7526c48e54f6f5cc9241d91d45。

## 诊断与实现

- 已复现：旧Shift映射slow，导致预期加速实际缓行。KEY_ACTIONS采用event.code，本身不会因Shift大写而丢W。用户最终选择Space升空，保留短按起跳/持续有限喷射，不把该行为记为缺陷。
- 来源集合已在上一轮支持并行，本轮保留；未发现仿真将移动、跳跃、推进、射击互斥。并发动作仍需支付各自资源。
- Shift左右均boost、Space jump+lift、C缓行；仅左键默认射击。Q/E/R/T全未装备，不发送能力；移除E升空与F射击键位。
- 新增可修改键位、冲突拒绝、当前设备持久化和恢复默认。设置期间发送中性驾驶输入，但不暂停服务器物理或对战。
- 界面按钮、输入框、滑杆持有焦点时驾驶键不抢控件；先点击战场再驾驶。已静态确认这一边界，未称其必然为用户原失效原因。
- 无物理规则、协议或CP变更，规则仍mecha-slice-0.3；无新增依赖。

## 验证

真实红：旧映射下组合回归boost=false；本轮中途Space仅jump提议也曾红绿验证，后被用户最终升空要求覆盖，不计为最终交付结果。现最终Space升空/组合驾驶3项真实Rapier回归通过；完整验证、双轴审查与交付记录在完成后补充。

本轮继续使用项目内固定Matt快照的implement、tdd、code-review；组合输入适配参考官方自制模型/驾驶方向，不导入官方资产。

## 最终行为与浏览器证据

- 完整本地check：54/54测试、类型检查和生产构建通过。新增3项组合真实Rapier回归及5项键位偏好回归，旧46项仍通过。
- 实际网页：Shift+W+左键450ms后能量50→33.7kJ、热量10%、推进92%，移动与射击并发；Shift+Space+左键后腾空高度6.0m。独立Space/键盘组合也观察到升空。不能把这些分组观察夸成一次全键鼠动作覆盖。
- 改键真实路径：待改Space时按W，提示冲突且未覆盖；改J显示已保存；刷新后仍J；关闭设置并进入训练，J按450ms后高度4.3m、能量37.1kJ；最后恢复默认并关闭设置。
- 1280×950桌面、390×844窄屏检查；窄屏scrollWidth375≤viewport390，无横向溢出。截图：[桌面改键](evidence/combined-controls-desktop.jpg)、[窄屏改键](evidence/combined-controls-mobile.jpg)。布局检查不等于手机真机或多点触屏验收。
- 内置浏览器仍拒绝Pointer Lock；右键拖动入口保留。自动化click仅支持一个非修饰键，尝试同时附W+Space被拒绝，没有绕过；全W+D+Shift+Space+mouse aim/fire并发由真实Rapier公开输入路径测试覆盖，不称物理键盘全键无冲突认证。
- 浏览器观察构建index-BuZ66Btl.js；其后审查仅修复焦点捕获、保存失败文案和设置中性aim，类型/9项针对回归/重建通过，最终构建index-BZqaJC_L.js。该小补丁由双轴代理执行实际处理器/函数验证，未再冒称新的浏览器实测。

## 审查与交付

审查基点659e694...，首实现4962fbe，修复f5a4a24。Standards2项、Spec1项P2均已修复，原轴结论见[独立审查](../docs/engineering/CODE-REVIEW-combined-controls.md)。新增ADR0009，保留0008历史决定。未新增引擎或改变比赛协议。

构建doctor：20pass、3warn、0fail；已知字体来源/主题提示和Windows CLI识别警告保留。界面检测无新增项；Vite大块警告仍在。

[GitHub Actions 43007200509](https://github.com/aHao030/object-arena/actions/runs/43007200509)已回读completed/success，head_sha=f5a4a24d57384c10de903a06ed0f88007049a015，包含完整54项测试、类型检查、构建与doctor。代码推送main成功；最后收尾只改任务状态、审查/日志、测试元数据与证据图，不改变已验应用代码。使用进程本地代理推送，无全局代理或Git身份设置变更。当前页刷新即可加载最终构建。

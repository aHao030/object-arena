# 鼠标视角双轴审查

固定基点76b10e51c620eb110ea8b7c36c84dd5ae7b6228f，已解析且diff非空。命令git diff 76b10e51c620eb110ea8b7c36c84dd5ae7b6228f...HEAD。首轮HEAD4b32cdfcd662052db7d9367ad6cf34c206fe2fbb，commit `feat: add mouse camera control with right-drag fallback`。两轴从fresh context独立进行，不交换结论，以下保持分轴。

## Standards

未发现新增物理/协议或Astryx规范违规。鼠标→Rapier测试3/3通过。以下使用实际Scene代码的非浏览器事件探针复现，未操作浏览器：

- **P2 离房/结算不能结束右键拖动。** 原Scene.releaseMouse只退出Pointer Lock，右拖状态与pointer capture藏在effect内。右键按下→公开releaseMouse→移动，仍持有capture并产生onLook(50,20)。App的离房、结算、断线都调用该入口，应同时终止拖动。
- **P2 触屏点击也请求锁定鼠标。** 原click仅检查button===0，触摸产生的click同样进入capture。传pointerType:touch的探针实际调用requestPointerLock一次，可能锁定或覆盖触屏操作提示。应只允许鼠标点击自动捕获，按钮仍可显式启用。
- **P2 取消后晚到成功会重新锁定。** 原changed无条件接受成功，releaseMouse只清请求标志。请求→释放→异步获准产生locked:true且未退出，后续移动继续影响视角。需要区分用户仍想捕获与请求处理中，对取消后的成功立即退出。

关联AGENTS“先验证外部行为；权限失败路径必须覆盖”。无额外硬规范或判断性smell。Standards首轮3项行为发现，最严重P2。

## Spec

- **P2 离房/结算未清理右键捕获。** 规格：“失焦/隐藏/离房/结算/卸载清理鼠标捕获与按住输入”。原releaseMouse未调用effect内stopDrag。非UI复现右键按下→release→移动后仍捕获且回调一次，应统一释放。
- **P2 触屏点击请求锁定鼠标。** 任务：“触屏不误捕获鼠标”。原click没有输入来源过滤，touch主键click发起锁定。应过滤触摸/pen合成click。

未发现范围扩张。鼠标→Rapier3项测试通过；Pointer Lock成功/Esc分支未实测是已披露边界，不当作代码缺陷。Spec首轮2项，最严重P2。

## 修复与复验

代码审查阶段将浏览器输入生命周期抽成公开createMouseControls/capture/release/dispose模块，Scene只绑定画布和最新回调。浏览器外部接口用EventTarget边界替身验证取消/迟到结果，物理测试仍用真实Rapier。

控制器5项公开行为逐条红绿：统一结束右拖、过滤touch/pen、取消后晚到grant立即释放、正常移动/退出/失焦/监听清理、浏览器拒绝与晚到Promise处理。原两轴分别确认Standards3项/Spec2项已解决，Spec独立9/9通过。

Standards复验又发现1项P2：旧控制器dispose先标disposed，释放时不再发送locked:false，新画布控制器也不会纠正App原locked:true，按钮可能一直显示“退出鼠标视角”。新增公开画布替换失败用例，先红states只有[true]，再将dispose顺序改成先release、再禁止后续回调，绿为[true,false]。两mouse与input共10/10通过、TypeScript通过；原Standards轴独立确认该项关闭，未发现修复回归。

复验结论：Standards累计4项全部resolved，0项未解决；Spec2项全部resolved，0项未解决。正向Pointer Lock与原生Esc的真实浏览器检查仍按日志列为未验，边界替身不是该浏览器验收的替代。

修复提交65724570ee034e8ccdbe19a8aa8e953f72aa474b已推送，GitHub Actions [42972217455](https://github.com/aHao030/object-arena/actions/runs/42972217455)通过：npm ci、32项测试/类型/构建、源码及构建doctor。最终本机页面与新hash脚本均HTTP200，规则仍0.2。收尾仅改文档与验证元数据，未改变已验应用代码。

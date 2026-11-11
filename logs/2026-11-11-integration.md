# 2026-11-11 实际集成日志

本日志用于追加证据。记录时间按Asia/Shanghai；不以文档完成代替安装、引擎步进、联网或浏览器验收。

## 治理核查快照

- 设计/源码基线：`e77794f3f8f77eb071e5d2df451c47e4250f95fa`，文档与项目内Matt快照。实现代码在其后开展。
- 已读取实际根package.json、package-lock.json与node_modules包元数据和LICENSE；真实安装版本与源码来源、integrity、许可摘要保存在integrations/registry.json。治理代理未改package或网页。
- 已通过官方GitHub读取Three、Rapier、MuJoCo固定npm gitHead，以及Colyseus版本匹配源码检查点、Astryx/StyleX tag和许可证。Colyseus陈旧gitHead和部分发布包缺LICENSE均在记录中保留，不隐去差异。
- THIRD_PARTY_NOTICES保留上游版权/许可全文；缺失许可从固定源码或不可变Git blob补存。未修改安装物、未复制RobotWarrior。
- 本次快照共23个直接外部依赖、298个本机已安装外部包；23个直接依赖的lock integrity与官方npm元数据一致。保留87组不同完整许可文本（另有固定源码补充），相同文件字节只合并一次。生产依赖根目录缺失许可均有已保留的官方来源补充；这不是对WASM内部所有原生依赖的完整SBOM审计。

## 工作流使用

| 工作流 | 本轮处置 | 已做与未做 |
|---|---|---|
| Matt research | adopted | 一手npm/GitHub/本地安装物交叉核验，形成登记与许可证文档；由独立代理执行 |
| Matt tdd | adopted principles；具体red/green证据单列 | 公开接口行为与独立预期优先；不能由设计已通过推定测试通过。机械lab已有red记录在apps/lab/VERIFICATION.md，green需真实执行后追加 |
| Matt implement | adopted principles | 对照规格/任务接入、类型检查与测试结果由实施者追加；未以读取提示词当作完整实现 |
| Matt code-review | adopted；两轴执行并分别复验 | 固定基点e77794f，首轮23daf41；Standards/Spec fresh-context并行审查及原轴修复复验，见CODE-REVIEW-v0.5.md |
| Astryx | adopted tooling；UI证据待主实施者追加 | core与CLI版本对齐，使用模板/组件/主题文档；不由包存在推定页面已使用正确 |
| RobotWarrior | reference-only | 调研文档参照；未vendor、未运行其游戏、未复制其音乐/整款代码 |
| 生成模型/真实供应商/其他引擎 | deferred | 未下载权重、未提交用户图片、未发起付费模型调用、未将待选项目加入依赖 |

## 运行证据（由主实施者追加）

初始pending状态已由以下范围内的真实结果更新；未验项目仍保留未验。

### 实际命令与结果

- Windows / Node v24.19.0，`npm run check`最终退出0：TypeScript通过；17/17测试通过（6 GLB、5 MuJoCo、5 Rapier、1真实SDK端到端）；Vite7.3.8生产构建通过。测试总时长24.1秒左右；SDK完整互射20.8秒，含真实过热恢复，未缩短物理冷却以让测试通过。
- `npm install` / `npm audit --omit=dev --json`：0已知漏洞。初始Vite7.2.2/并行工具9.2.1有审计告警，已分别升级7.3.8/9.2.5，版本与完整性保存在lock。
- `npx @astryxdesign/cli@0.7.13 doctor --built apps/web`：20 pass、3 warn、0 fail。检查5个源码文件/6个构建文件，确认77处组件用法与源码无可替换裸布局、自画图标、自定义UI样式。警告为外部Figtree字体服务未证明、其汇总项，以及此机器CLI路径识别警告；生产构建有>500kB大chunk提示，均未隐藏。
- `npm start`已以127.0.0.1:2567提供生产构建；GET `/`、`/health`、`/api/catalog`、`/api/integrations`实际200。开发源5173的CORS响应正确，lab POST预检204。
- HTTP `/api/lab/check`：0.1kg→200/passed/error0.047962rad；5kg→200/needs-review/error0.968785rad；额外xml字段→422；17KB请求体→413。全部为实际响应，不是记录重放。
- 真实Colyseus SDK客户端在同一arena以20Hz发送按键输入；相同serverTick的双方HP相同，各收到一次完全相同的matchId/resultId/终局，HTTP查回一致；第三人被拒绝。进程结果缓存上限1000条、重启清空。

### 红绿与实现证据

- MuJoCo：apps/lab/VERIFICATION.md保存原先模块不存在的red、真实WASM green及轻/重载JSON。
- Rapier/Colyseus：packages/sim/TDD-LOG.md保存red/green；真实SDK测试先发现serverTick长期0，修正setFixedTimestep与patchRate的初始化顺序后通过。
- GLB：最小真实GLB2三角形与坏例先红4失败/1通过，再绿5/5；新增重复场景根绕实例预算例先红，再修复为6/6。全仓最终17/17通过。
- 网页使用Astryx shell-top-nav模板框架/间距，替换为机体大厅，neutral内置主题；Three原创几何与运行时canvas为产品内容，未复制高达/其他游戏素材。文件只本地预览；GLB仅替换躯干，不将本地外壳宣称为联机共享资产。

### 浏览器与设备验收边界

- 内置预览实际读到大厅标题、训练/双人按钮、导入、机械验证和驾驶控件；Three WebGLRenderer启动报precision为空，界面正确显示无法启动3D。之后补实现同快照2D兼容模式和上下文丢失处理，重新类型检查/构建通过。
- 普通Chrome视觉验收被Computer Use自动安全检查停止，原因是无法可靠确认当前浏览器URL；没有绕过检查或继续浏览器操作。内置预览截图也未成功获取。
- 因此3D成像、2D降级实际显示、GLB视觉装配、浏览器驾驶手感、390px窄屏与触屏/手机/平板真机均未通过视觉验收，不以编译/逻辑测试冒充。需要用户或下一次允许的浏览器会话复验。
- 本机未检测到Docker，提供Dockerfile/compose配方，但未声称构建运行容器。未发布公网服务，当前默认仅本机监听；GitHub仓库为私有。

### 交付与持续约定

- 按用户选择创建独立私有仓库aHao030/object-arena；基线已推送。game代码与skills资料仓库分开，未改aHao030/ai-skills。
- README、目录分工、部署配方、版本来源、完整第三方许可、任务与用户角度质询均随仓库保存。上游许可中的原始空白保持原样，仅此文件豁免Git空白检查；未修改node_modules或原Matt快照。
- 用户“每次遵守Matt工作流”的要求写入AGENTS.md，并按其明确记住指令新增项目范围记忆便笺；未安装全局技能、未运行link-skills.sh。
- 最终Standards/Spec双轴独立代码审查及修复见下方追加记录。

### 审查后修复与最终本地验证

- 首轮实现提交23daf41已推送；GitHub Actions真实通过：[42958185830](https://github.com/aHao030/object-arena/actions/runs/42958185830)。该成功未代替代码复核，后续仍发现并修复缺陷。
- 两轴fresh-context报告分别保存在docs/engineering/CODE-REVIEW-v0.5.md。Standards首轮6项（1硬规范、4运行缺陷、1判断性重复），Spec首轮3项；报告保持分轴，未合并排名。
- 真实红绿修复：独立升空意图映射到boost+lift；接触距离射击命中受击体、掩体继续阻挡；非20Hz周期终局先发最终快照再发唯一结果，onLeave共用且终局后不重复广播；慢请求体2秒绝对截止、完整输入后才取得引擎槽且仅拥有者释放；真实GLTFLoader贴图解码失败时统一撤销Blob URL并向用户说明缺贴图。
- 规范修正：新增10–13独立任务文件，使用状态枚举；仅文档/代码完成的切片可done，浏览器与真机未验的机库任务保持in-progress。
- 原Standards轴独立复验12/12通过、6项全部resolved；原Spec轴独立9/9通过、3项全部resolved；两轴均无新增发现。整体解析失败/异步贴图的附加探针活跃URL为0，未复现的假设不计缺陷。
- 主实施者最终npm run check退出0：23/23测试（GLB预检6、真实GLTF加载清理1、HTTP慢body1、UI输入到真实仿真1、MuJoCo5、Rapier7、真实SDK2），总时长26.47秒；TypeScript和Vite构建通过。负例中GLTFLoader故意输出贴图解码警告，相关测试验证无贴图回退与URL清理，不是未处理失败。
- 最终源码/构建doctor：20pass/3warn/0fail，7个源码文件/6个构建文件，77处组件用法。CI也改为对apps/web目录进行检查，避免只检查dist时遗漏源码纯度。
- 为物理判定修正升级规则mecha-slice-0.2；模板机参数/CP未改。另明确舞台高度、清除模型恢复状态、键盘转向同步滑杆，局域网HTTP页面复制API不可用时给出手动复制提示。
- Docker配方包含workspace元数据及第三方许可全文；仍未在本机实际运行Docker。GUI/手机/平板未验边界保持不变。
- 已重启生产构建服务127.0.0.1:2567，最终GET网页/health/catalog均200，catalog实际返回mecha-slice-0.2；停止临时5173开发服务。最终推送与远端检查记录在交付追加部分。

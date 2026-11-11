---
name: 物竞场交互展示
description: 石白、灰绿与焦橙构成的物体试用工作台
colors:
  accent: "#c74827"
  accent-bright: "#df5835"
  accent-hover: "#b03d20"
  paper: "#f8f8f4"
  surface: "#fff"
  stage: "#f0f1ea"
  ink: "#282c29"
  muted: "#626b59"
  support-ink: "#59654f"
  line: "#e3e4dd"
  asset-surface: "#fcfcf9"
  asset-selected: "#fff8f1"
  budget-fill: "#78896b"
  budget-track: "#eceee5"
  over-budget-ink: "#b52e27"
  over-budget-fill: "#be3d2e"
typography:
  headline:
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif'
    fontSize: "32px"
    fontWeight: 720
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  title:
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif'
    fontSize: "18px"
    fontWeight: 650
  body:
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif'
    fontSize: "14px"
    lineHeight: 1.6
  action-label:
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif'
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  container: "16px"
  card: "10px"
  button: "7px"
  badge: "6px"
  field: "5px"
spacing:
  compact: "8px"
  control: "12px"
  card: "16px"
  workspace: "24px"
  dialog: "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.action-label}"
    rounded: "{rounded.button}"
    padding: "12px 17px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.action-label}"
    rounded: "{rounded.button}"
    padding: "12px 17px"
  material-select:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.field}"
    padding: "6px 12px"
  asset-card:
    backgroundColor: "{colors.asset-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "14px 16px"
  asset-card-selected:
    backgroundColor: "{colors.asset-selected}"
  arena-container:
    backgroundColor: "{colors.stage}"
    rounded: "{rounded.container}"
  config-container:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.container}"
---

# Design System: 物竞场交互展示

## Overview

**Creative North Star: “工业设计展厅”**

物体是主要视觉内容，界面像安静的试用工作台：石白页面、灰绿舞台、深石墨文字，以焦橙标识自己的物体与主要操作。紧凑参数、细线和系统字体让选择、调整与结果保持在同一视线内。

这份记录从现有展示代码提取，仅适用于浏览器本地交互样机。正式平台的多人、物理与设备能力仍按项目规格验证；此处不把演示动画或视觉完成度当成产品实现证据。扫描依据是 PRODUCT.md、showcase/SURFACE.md，以及 showcase/dist 下的 HTML、CSS 与交互脚本；页面策略保留在 SURFACE.md。

**Key Characteristics:**

- 安静的浅色工作表面，以色调和边界区分层级。
- 焦橙集中于主按钮、玩家标记、选中状态和滑杆。
- 参数变化立即反馈到数值、预算和 Canvas 物体。
- 示例、训练、模型接入状态均使用明确的展示版文案。

## Colors

以暖石白和低饱和灰绿为底，焦橙提供操作重点；上方 frontmatter 是颜色值的规范记录。

### Primary

- **焦橙（accent）**：主按钮、滑杆和焦点轮廓；悬停使用较深的 accent-hover。
- **明焦橙（accent-bright）**：品牌线形标志、玩家圆点、选中物体边框和勾选标记。

### Neutral

- **石白（paper）与白色（surface）**：分别承载整页和参数、导入、弹窗表面。
- **灰绿舞台（stage）**：将物体和底座从普通页面区域中托出。
- **石墨（ink）、灰绿正文（muted / support-ink）与细线（line）**：分别用于主信息、辅助说明和结构分隔。
- **物体卡（asset-surface / asset-selected）**：默认接近纸白，选中时使用浅暖色底。
- **预算（budget-fill / budget-track）**：正常状态为灰绿；超限时使用 over-budget-ink 与 over-budget-fill，并同时改写提示文字，不能只依靠颜色表达。

## Typography

**Display / Body Font:** 同一套系统 UI 字体栈，按操作系统回退；没有外部字体下载，也没有独立的装饰标题字体。

标题比参数更疏朗，数值使用等宽数字特性保持变动时的对齐。正文基准是 body；多数辅助标签在现有页面中为 11–13px，不应误读为全站均采用正文尺寸。

### Hierarchy

- **Headline**：桌面主标题采用 headline；850px 以下为 29px，650px 以下为 26px，手机玩法说明标题另为 23px。
- **Title**：物体集合标题采用 title；选中物体名称为 16px，参数区标题为 14px。
- **Body**：正文采用 body；导语与说明可按现有组件规则缩小。
- **Action label**：主、次按钮采用 action-label；尺寸、功率、质量、体积、CP 与计时器采用 tabular-nums。

## Layout

主内容最大宽度 1640px、水平居中；桌面左右留白为 4.3%。工作区使用自适应舞台与固定宽参数栏，基础栏宽 306px、间隙 24px。物体集合为四列。实际间距采用多个局部值，不存在已建立的统一倍数网格。

- **1150px 及以下**：参数栏变为 280px、工作区间隙 18px，缩紧物体卡与舞台内边距。
- **850px 及以下**：主内容水平留白 25px，参数栏 255px、间隙 15px；物体集合为两列，工坊与说明页转为单列。
- **650px 及以下**：主内容水平留白 18px；舞台和参数栏上下排列、间隙 16px，舞台画布高度 265px；导航换行到标题栏第二排，显示触屏方向键与刹车。
- **851px 及以上**：后置桌面规则压紧首屏，标题栏高度 76px，参数栏内边距为 18px 21px 14px；应按层叠后的最终规则复用。
- **1500px 及以上**：舞台最小高度为 390px；部分早期大屏间距被后置桌面规则覆盖。
- **粗指针且宽度大于 650px**：同样显示触屏控件，不能只用窄屏作为触屏判据。

## Elevation & Depth

常驻舞台、参数栏和物体卡主要通过色调及细线区分，没有通用的卡片悬浮阴影。阴影只用于已选视角按钮、滑杆拇指、弹窗和短暂提示；舞台内部的投影属于 Canvas 绘制内容。精确阴影值保存在 sidecar，不扩充成新的层级体系。

按钮悬停上移 1px，背景及物体卡边界转换为 180ms，预算填色为 200ms，提示显隐为 200ms。现有 reduced-motion 规则关闭 CSS 动画、过渡和按钮位移；这不等于已经关闭所有 Canvas 训练运动。

## Shapes

主要容器使用 container 圆角，按钮使用 button 圆角；物体卡、下拉框和状态徽标分别使用 card、field 与 badge。状态点、选中勾标、滑杆拇指和刹车采用圆形。结构依靠细实线，导入区域使用虚线；没有全站胶囊按钮语言。

## Components

### Buttons

主按钮为焦橙实底、白字，次按钮为白底细边。共享内边距与圆角见 frontmatter，基准最小高度 43px。悬停变色并轻微上移，禁用时透明度为 0.5；键盘焦点是 3px 焦橙外框、偏移 4px。

### Cards / Containers

舞台使用灰绿表面，参数容器使用白色及细边。物体卡是可选择按钮，包含程序绘制缩略图、名称、简短特征与示例质量；选中时浅暖底、明焦橙边框和勾标共同出现。悬停改为白底及较深的灰绿边框。

### Inputs / Fields

材质为原生下拉框。尺寸与功率使用橙色已填段的滑杆，输出值邻近标签；尺寸范围 0.5–1.6×、功率范围 50–200W。训练运行时禁用这三项设置；暂停后允许调整，调整会重置本地训练。超出 CP 或载荷质量限制时，预算提示改为错误状态并禁用开始按钮。

### Navigation

顶部三个导航按钮使用低饱和文字；当前页深色并带底部橙色短线，同时更新 aria-current。650px 以下换到独立一行。视角切换采用小型分段控件，选中项白底，按钮通过 aria-pressed 表达状态。

### Status / Dialog

“交互概念版”徽标保持轻边框，不承担在线状态含义。说明使用原生 dialog，深色半透明背景遮罩与容器圆角；短暂提示在屏幕底部居中。文件预览是本机图片预览，不表示已上传或完成 3D 转换。

### Signature: 参数联动的 Canvas 舞台

四个示例物体有各自程序绘制缩略图和舞台轮廓。选择物体、修改材质或尺寸时，舞台外观、载荷质量、外包络体积、CP 数字和预算条一起更新；功率同时影响 CP 和简化运动响应。舞台支持透视 / 俯视及碰撞轮廓查看，键盘与触屏均可开始、暂停、重置一场 60 秒本地训练。

这是 Canvas 2D 程序绘制和简化圆形碰撞演示；杯口与不规则形状的外观不意味着完整形状碰撞已实现。没有交付静态 raster 品牌或场景资产，因此本次无需 raster provenance 文件；用户选择的本机图片属于输入预览。

## Do's and Don'ts

### Do:

- **Do** 复用现有系统 UI 字体、容器与按钮圆角，按语义使用焦橙。
- **Do** 让参数变化同时反映到舞台、数值与预算反馈，保留超限文字和禁用状态。
- **Do** 对窄屏与宽屏粗指针设备都保留触屏操作，保留键盘焦点和按钮状态语义。
- **Do** 保留本地训练、示例数据和未接入能力的清楚说明。

### Don't:

- **Don't** 把竞技预算 CP 画成充值余额或供应商 token。
- **Don't** 用霓虹、虚构排行榜或在线人数替代现有工作表面语言。
- **Don't** 把程序绘制的立体感标为已接入 3D 生成或服务器物理裁判。
- **Don't** 把本样机的响应式布局记录当成主流设备已经验收的证据。

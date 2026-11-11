# 项目协作约定

先读README.md、GLOSSARY.md、docs/mecha-v0.4/README.md和相关docs/adr/。当前方向是自己的模型机体对战，旧底座推台已退役。所有新增行为应能追溯到产品规格与一个开发任务；用户新指令优先。v0.5已开始真实引擎集成，实际能力以README和logs证据为准，不得将目标写成已经实现或已经测得的事实。

## 用户指定的持续工作流

用户要求本项目每次工作都遵守mattpocock-skills。完整、未全局安装的固定快照在tools/mattpocock-skills/，来源与commit见其UPSTREAM.json；保留版权、许可和支持文件。按任务读取skills/内实际相关SKILL.md，不仅提及名称。开发循环为调研→规格/任务→真实行为红绿验证与实现→固定基点的Standards/Spec双轴独立审查→修复→提交与日志。规格/基点已在会话获得授权的，不重复插入例行确认。不能承诺“完美”，应持续记录实测缺陷和未实现能力。

## Agent skills

### Issue tracker

当前规格与任务保存在本地 .scratch/mecha-arena/。参见 docs/agents/issue-tracker.md。不自动发布外部Issue或消息；网站操作按用户当次请求执行，本轮不修改或部署旧showcase。

### Domain docs

单一领域上下文，术语在根目录 GLOSSARY.md，技术取舍在 docs/adr/；参见 docs/agents/domain.md。

## 实施原则

- 用一条能从界面演示到服务端结果的完整路径拆任务。
- 先验证外部行为；物理、费用、权限的失败路径必须覆盖。
- 同一场比赛只采用服务器冻结的碰撞代理、规则和物理档案。外部模型不进入比赛判定循环。
- 私钥不进入浏览器持久存储、日志、回放、源代码或普通数据库字段。
- 改动物理、CP 公式或协议必须升级版本，并给旧回放保留可解释路径。
- docs/OPEN-QUESTIONS.md 中的设计默认可由用户调整；实测门槛未通过时禁止标记正式支持。

<!-- ASTRYX:START -->
Astryx v0.7.13 · 174 components
CLI: run every command as `npx @astryxdesign/cli@0.7.13 <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then the xstyle prop / StyleX tokens. No raw hex/px.
- Palettes and custom colors go through the theme, never :root overrides. Run `astryx theme add <slug>` to import; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any className=, style={{…}}, raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or the xstyle prop + a token.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->

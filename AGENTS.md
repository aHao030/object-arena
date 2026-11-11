# 项目协作约定

先读README.md、GLOSSARY.md、docs/mecha-v0.4/README.md和相关docs/adr/。当前方向是自己的模型机体对战，旧底座推台已退役。所有新增行为应能追溯到产品规格与一个开发任务；用户新指令优先。当前是设计工程，不得将目标写成已经实现或已经测得的事实。

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

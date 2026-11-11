# 本轮移动参考与实际取舍

2026-11-11核对官方资料；研究与实现是两类证据。

| 官方参考事实 | 一手来源 | 本项目适配 |
|---|---|---|
| Minecraft Education官方控制说明包含WASD、Space跳跃、Ctrl疾跑、Shift潜行/创造飞行下降及鼠标攻击；控制图含鼠标环视 | [Mojang官方说明](https://edusupport.minecraft.net/hc/en-us/articles/360047116832-Minecraft-keyboard-and-mouse-controls)、[官方控制图](https://education.minecraft.net/content/dam/education-edition/software-downloads/MCEDU%20Movement%20Control%20Guide.pdf) | 保留鼠标/WASD/Space骨架。Shift仅缓行，不改变碰撞体；无采矿、方块或创造飞行 |
| MBON官方手册第12页说明快速按两次跳跃按钮可高速boost dash，方向随方向输入，消耗boost；手册提及step和boost归零后的overheat | [Bandai Namco官方手册第12页](https://mbon.channel.or.jp/images/012.jpg)、[第8页](https://mbon.channel.or.jp/images/008.jpg) | 借鉴快速推进、方向控制与有余量限制；网页用Q专用推进键，Space起跳/持续升空，不复刻完整step、诱导切断或攻击取消 |
| Chrome官方快捷键：Ctrl+W关闭当前标签 | [Google官方说明](https://support.google.com/chrome/answer/157179?hl=en) | 推进从初拟Ctrl改Q，不强求全屏/KeyboardLock权限 |

官方MBON图页由研究代理直接内存读取并核对，未保存或分发游戏图页；主网页检索后端无法直接打开该图片URL。未从玩家wiki推断原版精确速度、回正时间或恢复率。Minecraft来源为官方教育版控制说明，不把它当作Java/Bedrock物理数值表。

本项目的6/2.5/16m/s、起跳6.5m/s、推进余量恢复和落地回正时长是原创规则参数。官方资料本轮未明确证明“落地恢复多少秒”或空中转向率，故这些全部按项目受限物理与行为测试选择，不标原版机制精确复刻。

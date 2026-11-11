> 历史v0.3：对应底座推台设计，仅供追溯。当前机体设计见 [v0.4](mecha-v0.4/README.md)，不把旧规则和任务当现行方案。

# 接口合同草案 v0.1

目的：划清服务端信任边界及用户可见结果。尚无实现。JSON 字段采用 camelCase；时间采用 UTC ISO 8601。所有请求先认证、检查 ownerId，使用 HTTPS。写入接口接收 Idempotency-Key；需要并发控制的草稿接口另接收 If-Match revision。

## HTTP 操作

| 操作 | 请求要点 | 成功响应与约束 |
|---|---|---|
| POST /v1/uploads | kind=photo/glb/stl、声明大小、sha256 | uploadId、隔离区短期上传授权；最大 50 MB（照片 10 MB） |
| POST /v1/uploads/{id}/complete | 内容哈希 | 202 + assetDraftId；服务端重新核验内容，不信任扩展名 |
| GET /v1/assets/{id} | 本人资产 | 状态、revision、校验问题、私有短期预览 URL |
| PATCH /v1/assets/{id}/profile | revision、单位、尺寸依据、质量/材质确认 | 新 revision、CP 预估、尚需确认项；冲突 409 |
| POST /v1/assets/{id}/publish | expectedRevision、代理确认、rulesetId | 不可变 assetVersionId；校验不全 422 |
| POST /v1/builds | assetVersionId、powerW、energyJ | 不可变 buildVersionId、精确 CP；只用已烘焙固定装配，超规则422 |
| POST /v1/providers | 已审核 providerType/baseUrl、model、secret | credentialId、mask、probeState；不回传 secret |
| POST /v1/providers/{id}/probe | 能力、允许测试费用范围 | 能力和计费约束等级；测试本身可异步 |
| DELETE /v1/providers/{id} | 凭证所有者 | 204；禁止新调用，处理中任务尽力取消 |
| POST /v1/quotes | assetDraftId/revision、credentialId、质量档位 | quoteId、expiresAt、platformCap、providerCostConstraint |
| POST /v1/generations | quoteId、draftRevision、acceptEstimate（必要时） | 202 + operationId；过期/输入变化 409，超额 422 |
| GET /v1/generations/{id} | 操作所有者 | state、providerRequestId（脱敏）、用量、下一步 |
| POST /v1/generations/{id}/cancel | 操作所有者 | 202 + cancelRequested；不保证供应商退款 |
| POST /v1/matches | buildVersionId、rulesetId、mode=private/practice、能力摘要 | matchId、短期 joinToken、wsUrl；能力摘要须与实际加载核验 |
| POST /v1/matches/{id}/invites | 房主、过期时间 | 短期一次性inviteCode；仅存摘要，不授予原件访问 |
| POST /v1/matches/{id}/join | inviteCode、本人buildVersionId、能力摘要 | 原子消费邀请码并锁定第二席，发本人joinToken；满员/过期409 |
| GET /v1/matches/{id} | 参与者或公开授权 | state、frozenManifest、result 或 aborted 原因 |
| GET /v1/matches/{id}/replay | 参与者或明确分享权限 | 权威位姿、规则、最小代理的短期访问授权 |
| DELETE /v1/assets/{id} | 所有者 | 202 + deletionState、适用的比赛证据保留例外 |

首发不开放随机 URL 模型代理，也不默认开放排位接口。排位须在公平性和真机验收后增加 mode 值和对应权限。

错误格式：`{code, message, operationId?, retryable, details?}`。401 未登录；403 无权限；404 不泄露其他用户私有资源；409 修订/幂等冲突；413 文件超限；422 无法满足规则；429 限流；503 暂不可用。details 仅包含允许暴露的字段。

quote绑定输入哈希、revision、供应商能力版本、质量档位和上限，10分钟过期，maxBillableAttempts=1；与operation一对一，消费报价与预留额度原子完成。已消费报价向所有者返回既有operation，不因新幂等键再次扣费。服务端只执行此报价内的资源计划。

practice为单人服务器训练房，private需要有效邀请。加入后只向本局参与者签发冻结比赛包的短期授权，范围是双方必要的视觉LOD、碰撞代理和档案白名单；不含对手原图、原模型、凭证和提示词。授权绑定matchId、assetVersionId和用途；回放单独检查，知道哈希不构成下载权限。

## 比赛消息

客户端input：`{type:'input', seq, throttle, steer, brake}`。seq从1起、安全整数且递增，拒绝重复和超过maxSeenSeq+1024的跳号；throttle/steer各在[-1,1]、brake在[0,1]，为独立控制轴。有限数值、payload≤256字节、最多30次/秒。身份绑定连接，不接受自称playerId。每tick取最新合法输入，不追放网络积压指令；记录实际应用tick和seq。

服务器snapshot：`{type:'snapshot', serverTick, lastAppliedSeq, appliedAtTick, bodies, energyJ, matchState}`。ACK仅表示已应用到物理步，收到未应用不能ACK；重连返回maxSeenSeq和lastAppliedSeq，客户端从其后继续编号并丢弃旧发送队列。包含权威位姿/速度，客户端无写回权限；客户端时钟仅供诊断。

其他消息：ready（加载冻结版本后）、reconnect（短期凭证）、finished（唯一 resultId）、aborted（原因）。胜负与费用走持久化接口可补查，不能仅依赖一条可能丢失的 WebSocket 消息。

## 产物合同

只接受受控存储中的GLB或规范化网格；须解析通过、有限坐标、大小受限、无外部URI，并生成LOD与代理。首发仅静态刚体：动画、骨骼和morph不执行，要求外部工具先烘焙再导入；多刚性节点烘焙变换后合并为固定载荷，不允许活动关节。预览、代理和比赛姿态一致。Gaussian、NeRF、视频或文字不满足mesh合同。

所有大小/频率/超时属于初始上限，改动必须同步验收与规则版本；不是已实现的服务保证。

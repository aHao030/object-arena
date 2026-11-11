> 历史v0.3：对应底座推台设计，仅供追溯。当前机体设计见 [v0.4](mecha-v0.4/README.md)，不把旧规则和任务当现行方案。

# 数据模型与不变量

全部是拟实现的逻辑实体，尚未创建数据库。涉及费用和终局的写入须事务化。

| 实体 | 关键字段与约束 |
|---|---|
| User | id、会话身份、配额；删除不复用 id |
| SourceAsset | ownerId、类型、隔离对象引用、内容哈希、字节数、清理期限；默认私有 |
| AssetDraft | sourceId、修订号、尺度/材质/质量选择、处理状态；并发更新带 revision |
| AssetVersion | 不可变 id、ownerId、外观与 LOD 哈希、碰撞代理哈希、PhysicsProfile、引擎/清洗器版本、发布状态 |
| PhysicsProfile | SI 尺寸、来源单位、尺度依据、载荷质量、质量依据、代理惯量、材质预设、V_env、可选 V_solid、近似说明、用户确认时间 |
| BuildVersion | 不可变 id、assetVersionId、固定装配引用、底座版本、功率、电量、CP 原始值、rulesetId；无自由几何变换 |
| ProviderCredential | ownerId、供应商允许域、模型、能力、secretRef、密钥掩码、撤销时间；无明文密钥 |
| GenerationOperation | ownerId、幂等键及参数摘要、凭证引用、quoteId、上游 requestId、状态、计费约束等级、每次尝试的用量 |
| CostQuote | ownerId、输入摘要、质量档位、平台预留上限、第三方 hard/estimate/unknown、有效期、消费的operationId、maxBillableAttempts=1、计费币种与价格版本（若涉及） |
| LedgerEntry | operationId、reserve/settle/release、额度数量、唯一业务键；额度使用整数最小单位 |
| Ruleset | 不可变 id、参数哈希、CP 公式、材质表、引擎构建哈希、地图哈希、协议版本 |
| Match | id、两名玩家、两个 BuildVersion、rulesetId、状态、服务器区域、重连截止、唯一终局 |
| ReplayEvidence | matchId、accepted-inputs 引用、权威位姿帧、关键快照哈希、终局事件、构建清单、保留截止 |

## 状态不变量

1. 只有本用户拥有的草稿和凭证可用于生成；只有通过校验并确认的版本可发布。
2. GLB/STL 导入流程：uploaded → quarantined → normalized → needs-confirmation → validated → ready；照片还需在 normalized 前经过生成操作。任一步失败都有具体原因，不出现“失败但可排位”。
3. 确认参数会固定对应草稿 revision；期间若外观/单位/形状变化，原确认失效，必须重新校验。
4. 修改已发布资产创建新版本；正在比赛的 BuildVersion 不可变。删除或编辑操作不能改写一局中的对象。
5. 未知 V_solid 存 null，不填 0，也不以 V_env 冒充。
6. 模型建议与用户确认是两条记录；未经确认的 model-proposed 参数不能流入比赛。
7. 每次费用操作最多一个最终 settle，释放额不超过尚未使用预留额；并发请求不能使可用余额为负。
8. matchId 最多一个 finished 终局。aborted 不生成胜负和排名变更。
9. 重连凭证只绑定原用户、原房间和有效期，不能作为跨房间加入凭证。
10. quoteId 最多原子绑定一个operation，消费报价和预留额度在同一事务完成；不同幂等键不能再次消费报价。首发每个操作最多一次供应商收费提交，查询/取消在报价允许范围内；再次生成要新报价。
11. 删除资产写入 deletion tombstone 并撤销任务输出落地权限；迟到回调不能复活草稿、创建可访问预览或发布版本。迟到产物隔离后清理，已发生的上游费用独立对账。

## 隐私和删除的可兑现边界

原图默认处理完成后保留 7 天供重试，用户可提前删；未发布草稿闲置 30 天清理。保留期属于设计默认，上线前须在界面提供明确说明。

删除操作立即撤销分享与新生成/新匹配权限；线上源文件与未被使用的私有版本目标 24 小时内清理，备份滚动目标 30 天。进行中比赛可继续使用冻结版本；已结束比赛中为裁判需要保留的最小代理和位姿证据默认 30 天，不保留原始照片和密钥；玩家显示名可去标识化。界面在删除前说明这些例外，不能许诺立即抹除所有证据。

供应商收到的照片与其保留规则属于单独的数据流，生成前展示供应商与政策链接；平台删除不自动保证第三方删除。正式发布前验证数据删除、备份清理与供应商协议，不能仅凭文档宣称已经合规。

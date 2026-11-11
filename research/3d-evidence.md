# 图像转 3D 与资产处理：调研证据

核验日期：2026-11-10。读取了下列仓库默认分支 README、许可证及 GitHub 仓库 API。这里的 `pushed_at` 是仓库最近推送时间，不等同于最新版本发布或质量保证。所有候选在核验时均未归档。未下载模型、运行推理或做性能测试；显存要求为作者说明，不能当作本平台实测。以下推荐是工程判断。

## 结论

推荐第一版采用“用户导入 GLB 优先 + 可替换图像转 3D 适配器 + 统一资产清洗 + 独立物理验证”。以 TripoSR 作为可商用评估的低资源基线，TRELLIS.2 作为高质量选配。glTF Transform 直接用于清洗和压缩。COLMAP 留给多视角扫描模式。不要把任何生成模型的视觉输出直接标为真实物理资产。

## 项目对照

| 项目 | 官方能力与输出 | 许可证和权重 | 资源/维护快照 | 本平台采用方式 |
|---|---|---|---|---|
| [TripoSR](https://github.com/VAST-AI-Research/TripoSR) | 单图生成 mesh；`run.py` 支持 OBJ/GLB，可烘焙纹理 | README 明确源码、预训练模型和 demo 为 MIT；仍需保留许可并检查依赖 | 默认单图约 6GB VRAM；最近推送 2026-06-04 | 第一版低资源基线；验证复杂凹面、细杆和背面幻觉，不承诺真实还原 |
| [Stable Fast 3D](https://github.com/Stability-AI/stable-fast-3d) | 单图生成 UV 展开和纹理/材质参数的 GLB；可 remesh | Stability AI Community License，非 MIT；权重需申请访问；商用需按条款注册，有营收门槛及归属要求 | 默认约 6GB VRAM；Windows 支持为实验性；最近推送 2025-01-22 | 条件候选，默认不绑定；许可证和维护响应需在采用前复核 |
| [TRELLIS](https://github.com/microsoft/TRELLIS) / [TRELLIS.2](https://github.com/microsoft/TRELLIS.2) | 原版可输出 radiance fields、3D Gaussians 和 mesh，导出带纹理 GLB；第二版提供 PBR GLB及复杂拓扑 | 原版模型及大部分代码 MIT，第二版代码和模型 MIT；子模块/依赖单独授权 | 原版 ≥16GB、仅 Linux 充分测试；第二版 ≥24GB、Linux；最近推送分别为 2026-10-27、2026-07-10 | 高质量可选适配器；只接收 mesh 分支。第二版能表示开放/非流形表面，因此必须另做封闭性、体积和碰撞验证 |
| [Hunyuan3D-2](https://github.com/Tencent-Hunyuan/Hunyuan3D-2) | 分阶段生成几何与纹理；输出 trimesh，可导出 GLB/OBJ；有本地 API 示例 | Tencent Hunyuan 3D 2.0 Community License，非 MIT；地域限制和规模条款适用于该版本，不能推断其他版本授权 | 作者称几何约 6GB、几何+纹理约 16GB；最近推送 2025-10-28；README 已链接 2.1 | 条件候选；与目标市场及所用权重版本匹配后再接入，避免作为全球部署默认 |
| [COLMAP](https://github.com/colmap/colmap) | 多图 SfM/MVS；稠密点云后可重建表面 mesh | README 内给出 new BSD 许可；第三方依赖单独授权，没有此类生成模型权重门槛 | 提供 Windows、Docker、Python 工具；最近推送 2026-11-10 | 后续多视角扫描路径。比单图提供更多观测，但仍需尺度校准、补洞与物理参数录入 |
| [glTF Transform](https://github.com/donmccurdy/glTF-Transform) | Web/Node TypeScript SDK/CLI；读写 glTF/GLB、去重、裁剪、纹理压缩及 meshopt/Draco | MIT，压缩器等依赖仍各自核对 | 最近推送 2026-10-20 | 推荐直接采用统一优化管线；它不负责密度估计、自动保证水密或生成合格碰撞体 |

## 许可证依据

- [TripoSR README](https://github.com/VAST-AI-Research/TripoSR/blob/main/README.md) 与 [LICENSE](https://github.com/VAST-AI-Research/TripoSR/blob/main/LICENSE)；README blob SHA `b52bfb251b850f13a8b8565b52914f2bc9ede2e3`，LICENSE blob SHA `6c440ca1ef32cedcc2257b99953add129199ed26`。
- [SF3D LICENSE.md](https://github.com/Stability-AI/stable-fast-3d/blob/main/LICENSE.md)，blob SHA `a303d61fdc5b091ff9d21ed0811e83416a163812`。该文本商用条款包括注册、个人及关联方年度营收合计超过 100 万美元时需另行企业许可，产品归属展示等；上线采用时应重新核对具体版本。
- [TRELLIS 许可证段落](https://github.com/microsoft/TRELLIS#%EF%B8%8F-license)、[TRELLIS.2 许可证段落](https://github.com/microsoft/TRELLIS.2#%EF%B8%8F-license)；nvdiffrast、nvdiffrec、FlexiCubes 等单独授权，不能只保存根目录 MIT 就认定整个部署已审核。
- [Hunyuan3D-2 LICENSE](https://github.com/Tencent-Hunyuan/Hunyuan3D-2/blob/main/LICENSE)，blob SHA `a37e08f3a2967aa04fd6b6b514ba9b4a75c836c2`。文本排除欧盟、英国、韩国；第 4 节还对发布日相关产品超过 100 万月活的主体要求另行许可。不要把它笼统描述成“开源即可全球免费商用”，也不要把 2.0 的条件套到 2.1/2.5。
- [COLMAP README 内许可证](https://github.com/colmap/colmap/blob/main/README.md#license)，README blob SHA `57dc4d391420f69d89e1ead14e09b13fa7e2ee76`；该项目 GitHub API 的 SPDX 标记为 NOASSERTION，应以实际许可文本为准。
- [glTF Transform LICENSE.md](https://github.com/donmccurdy/glTF-Transform/blob/main/LICENSE.md)，blob SHA `066192ec0b90d3f593a83fcb0a694c2055269087`。

## 对产品和接口的约束

1. 单照片对不可见背面、内部空腔、绝对尺寸和密度缺少观测。这里是物理与成像的工程判断；生成结果应标记为“外观推测”。尺寸需要用户给一条实测长度/参照物或可信扫描尺度；质量来自称重或材料与几何计算，不能让语言模型给出一个数字便当作测量。
2. 导入单位需要显式确认。GLB 统一为米，OBJ/STL 等缺少可信单位时要求选择单位。形状、物理实体、碰撞代理及渲染 mesh 应分版本保存。
3. 3D Gaussians/NeRF 不是可直接投入刚体碰撞的闭合三角网格。即使供应商给了 GLB，也要检查其实际几何；开放曲面不能凭有符号体积直接计算质量。
4. 标准管线建议：文件检测/资源限额 → 解码与单位校准 → 几何和法线检查 → 修复候选并展示差异 → 简化视觉 mesh → 构造凸体/复合凸体碰撞代理 → 验证质量、惯量及重心 → 固化资产哈希。修复失败的资产可保留预览，不能悄悄用一个盒子替代后直接参加排名赛。
5. 生成服务接口应返回 `job_id`、进度、输出 mesh 的 URL/hash、格式/坐标系、生成器与权重版本、实际用量、许可证标识和失败原因。视觉材质的 metallic/roughness 与物理密度/摩擦/恢复系数是不同字段。
6. 评估数据至少含：实心/空心杯、细杆、凹形物体、透明反光物体、纹理稀少白色物体。评价碰撞代理误差、尺度校准、失败率和端到端费用；论文或 demo 速度不作为对用户的 SLA。

COLMAP 的官方[稠密重建教程](https://colmap.github.io/tutorial.html)说明其从深度/法线到点云再到表面 mesh 的流程；[FAQ 的 geo-registration](https://colmap.github.io/faq.html#geo-registration)说明通过外部相机位置与相似变换对齐坐标；[表面重建说明](https://colmap.github.io/faq.html#surface-mesh-reconstruction)说明噪声和大孔洞会影响 meshing。它们支持将“重建外观”和“可信物理资产”分成两道验收。

## 维护快照的原始入口

各仓库的实时元数据来自 `https://api.github.com/repos/{owner}/{repo}`。不以 star 数排名；`updated_at` 会受非代码活动影响，因此表中使用 `pushed_at`。所有候选都尚未归档，但这不代表维护承诺。上生产前锁定 commit、模型哈希、许可证文本和一份可复现评测报告。

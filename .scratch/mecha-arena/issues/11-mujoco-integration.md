# I-02: 有资源上限的真实机械试验台

**Status:** done

**Spec:** .scratch/integration-v0.5/spec.md

**Blocked by:** none

**What to build:** 受限负载参数驱动原创双关节MuJoCo模型并返回带版本/条件/哈希的报告。

- [x] 可演示：0.1kg通过、5kg扭矩饱和且最终误差过大；均来自真实WASM。
- [x] 失败场景：拒绝XML/URL/插件、越界输入、引擎并发过载；Worker有限时隔离。
- [x] 通过条件补充：慢请求体不能占据全局引擎槽，读取有绝对期限；HTTP回归与最终全套检查通过。

实现：apps/lab及apps/server的工作台端点。验证：tests/mujoco.test.ts、HTTP回归、apps/lab/VERIFICATION.md与evidence。此切片不验证完整用户机体，也不标记M09全部完成。

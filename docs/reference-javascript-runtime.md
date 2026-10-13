# JavaScript 适配器源码证据索引

## 结论

R5 使用“项目 JSON Schema → Ajv 开发期编译 → 静态 ESM 校验器 → 手写领域语义校验”的分层方案。Ajv 不进入浏览器运行依赖；适配器继续依赖动作工坊自己的 v2 协议、播放和几何接口。

## 官方依据

- Ajv 严格模式：<https://ajv.js.org/strict-mode.html>。生成脚本显式使用 `strict: true`，让被忽略或有歧义的 Schema 在开发期失败。
- Ajv 独立校验代码：<https://ajv.js.org/standalone.html>。`standaloneCode` 生成 ESM 文件，运行示例不需要加载 Ajv，也不需要 `eval`。

## 项目落点

- Schema：`integrations/javascript/character-project-v2.schema.json`
- 生成器：`integrations/javascript/generate-validator.mjs`
- 生成产物：`integrations/javascript/project-validator.generated.js`
- 领域校验：`integrations/javascript/character-project.js`
- 包读取：`integrations/javascript/package-files.js`
- 播放运行时：`integrations/javascript/runtime.js`
- 示例宿主：`integrations/javascript/demo.html`、`demo.js`、`demo.css`
- Node 回归：`tests/web/javascript-runtime.test.mjs`
- 真实 ZIP / Chrome 验收：`tests/browser/javascript-runtime.spec.js`

## 已确认行为

- 结构未知字段、类型和必填字段由生成校验器拒绝；路径安全、重复 ID、事件/帧引用、播放模式和画布预算由领域层拒绝。
- 运行时按宿主传入的毫秒增量累计，固定帧率和逐帧时长共用一套推进状态；跨越多个帧时按顺序补发事件。
- 共享画布、原点、角色比例、动作变换和锚点复用现有几何实现，旧角色工作区只保留薄转发模块，不复制规则。
- 浏览器目录读取验证真实引用文件和 PNG 解码；运行时输入深冻结，示例不写回清单和素材。

## 尝试路径记录

第一次把字符串长度规则全部放入 Schema，Ajv 生成文件会引用 CommonJS 运行时辅助模块，不能直接作为浏览器原生 ESM 使用。最终保留 Ajv 的纯结构校验，把名称长度和路径长度等领域语义放回无依赖语义层；这样仍由成熟 Schema 校验结构，同时得到可直接静态托管、无浏览器运行依赖的 ESM 产物。

后续修改协议时必须同步 Python 模型、JSON Schema、领域语义测试和真实导出包验收；不能只改生成文件。

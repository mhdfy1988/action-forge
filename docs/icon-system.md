# 统一图标

## 来源与边界

- 使用lucide-static 1.52.0（锁文件固定），官方说明https://lucide.dev/guide/，ISC及部分Feather来源MIT许可随构建保留在web/licenses/lucide.txt。
- 仅开发依赖；scripts/build-icons.mjs从本机安装包提取24个已选SVG，输出web/icons-data.js。运行时不访问CDN、不安装整个图标运行库。
- web/icons-ui.js是适配层，固定名称对应固定SVG；外部输入不得作为图标或HTML。所有装饰图标aria-hidden，控件仍保留中文名称/提示。

## 设计口径

- 统一24坐标系、圆端点/圆连接、显示16–18像素与1.8线宽。顶部24像素，空状态34像素。
- 导出用下载箭头，历史用向左/向右回转，循环用双向循环，删除用垃圾桶，逐帧用左右尖括号；不再混用文字箭头和手写曲线。
- 精修去除用橡皮、恢复用画笔、选择用魔法棒，配中文短标签；不把同一种画笔加难辨认的小符号作为唯一差别。
- 播放状态变更必须调用setControl，不能textContent覆盖图标。动态卡片垃圾桶也复用同一适配。
- 嵌入精修加载本项目图标/CSS，不修改8896独立编辑器的静态产物和运行服务。
- 选中工具与悬浮状态组合必须保持深底白字；共享悬浮选择器的优先级高于普通选中规则，不能只验证静止状态。回归见tests/browser/icon-hover.spec.js。

## 构建

先npm.cmd ci，再node scripts/build-icons.mjs；共享精修更新后node scripts/build-matting-editor.mjs。无改动模型、RGBA或导出协议。

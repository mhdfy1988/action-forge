# 当前导出协议与实现

## 输入与边界

导出工作区只接当前全部有序且已抠好的帧，不取勾选播放集合。batchId、frameIds、revisions固定来源快照；重复/缺失/修订变化显式拒绝，不静默导出旧结果。

## 画面处理

整组非零Alpha范围并集含软边，统一裁剪框。原尺寸及100%/50%/25%/12.5%按统一框计算，取整且至少1px；固定尺寸或自定义画布保持比例、透明居中填充，默认不放大。不逐帧紧裁，不逐帧移回脚底。裁剪可能截主体时提示，不修改源或精修PNG。

Pillow裁剪/缩放与无mask复制保持RGBA，不能以自身Alpha遮罩重复相乘。预览与下载共用app/export_frames.py的transform，整张图集共用compose_sheet；预览没有烘焙辅助网格。适配只缩小，100%按实际图片像素，可在预览区滚动；不拿高清源冒充低清导出。

## 参数与显示

web/export-core.js负责纯值尺寸/验证、几何、像素缓存键；web/export-ui.js负责DOM、网络、播放、版本与收尾。改文件名、动作fps或文件格式不改变单帧像素；图集列数只影响整图缓存键。

web/preview-cache.js为真正最近使用淘汰，最多64帧且RGBA总量128MiB。超预算单帧可显示但不缓存；内存更新增量计数，不每次遍历计算。源修订/画面参数改变用不同键；迟到响应按版本失效。测试覆盖13帧循环超过45次换帧、预览请求不超过13次，元数据改动不重复生成；大图仍可能受128MiB预算淘汰，不能承诺任何序列全驻内存。

普通换帧加载不是全局独占任务，disabled一次计算最终值，变化才写。导出停止播放、丢弃队列并等待在途预览释放后端忙锁；切页先失效并收尾，再开放新工作区。analyze.exportVersion=6，旧服务明确要求重启，不回旧裸PNG。

## 输出

两种格式均为ZIP：

- 序列：frames/frame_000001.png等＋frame-sequence.json；formatVersion=6、kind=uniform-frame-export，包含画布、变换、playback与帧身份/来源。
- 图集：sheet.png＋sheet.json；formatVersion=1、kind=fixed-grid，包含画布/格子/行列、playback及每帧index/rect/source。按行优先、不旋转，末格透明。

动作fps明确设置为整数1–60，默认12；用于此工作区预览与输出。playback.frameDuration为1/fps、duration为count/fps，按numerator/denominator有理数记录。源帧原时长只作来源记录，不作为最终动作时长；其他工作区预览速度仍仅预览。

此JSON为项目中立协议，不宣称引擎原生导入。旧v2/v3原字节输出仅保留显式兼容/契约测试；用户侧只有统一导出入口。

## 预算与校验

单图最多8192边/1600万像素、序列RGBA估算2GiB；图集同样受单图限制，任务120秒。复用缓存/下载生命周期，ZIP和PNG校验后返回；失败清临时目录，不改源。下载触发不等于文件已保存到用户指定目录。

## 证据与历史

- [Pillow Image API](https://pillow.readthedocs.io/en/stable/reference/Image.html)及[官方源码](https://pillow.readthedocs.io/en/stable/_modules/PIL/Image.html)：RGBA resize采用预乘处理；本项目无mask复制避免Alpha重复相乘。
- [Sprite Video Lab提交01603e8](https://github.com/sparklecatta-lang/sprite-video-lab/tree/01603e87f95039e2bf8760bbaec576c05776548b)：app/app.js导出请求携带播放间隔；server.py的export_job/save_sprite_sheet输出描述。只借鉴交互/描述，不照搬自身Alpha遮罩拼接；未安装或执行参考项目。
- [早期导出设计与变更记录](history/export-design-before-cleanup.md)只作为历史，不再混在当前操作说明中。

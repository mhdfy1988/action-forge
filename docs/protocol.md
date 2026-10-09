# 序列清单v2

本页描述M1原始抽帧结果，M2不会改写它。整理输出使用独立[v3协议](organizer-protocol.md)，不能把删除/排序后的序列冒称仍是原抽帧区间。

v2/v3下载是显式兼容/原字节测试接口；用户页面不提供旧导出入口。当前PNG资产包输出见[导出协议](export-design.md)，其动作播放时长与源时间分开。

PNG序列ZIP只含`frame-sequence.json`与`frames/frame_000001.png`等；缩略图不导出，路径不得包含本机绝对路径。

- `formatVersion: 2`；`id/name/loop/canvas`为序列身份、显示名、播放设置与标准化尺寸。
- `source`含显示名、原视频SHA256、归一化原点`originPts`、有理数`timeBase`及探测元信息。
- `extraction`含有理数`startSeconds/endSeconds/durationSeconds`、整数`fps`、`[start,end)`与选择规则标识。
- 帧含稳定`id/image`；`sampleTimeSeconds`是计划采样点，`sourceTimeSeconds`是实际源展示时间；两者不可混用。`sourceFrameIndex/sourcePts`提供原画面身份。
- `durationSeconds`决定本序列播放时长，全部相加等于区间长度；这些字段使用`分子/分母`字符串，无浮点累计误差。
- `sampleTimeMs/sourceTimeMs/durationMs`是毫秒数值便利字段，不替代精确字段。

v1适配为`GET /api/jobs/{id}/legacy-v1`，仅输出旧格式JSON，图片路径不变；使用累计边界舍入产生整数时长，最后总时长只承担一次毫秒量化。若小于1ms帧无法表达则明确拒绝。适配器不声称任意旧工程格式都已兼容，不在界面增加默认兼容开关。

原图/清单归属独立任务；页面改参数不修改旧结果，任务参数快照以job.request为准。末尾显示小数若恰等于探测返回的显示时长，将其识别为精确时长别名，不采用任意误差容忍延伸区间。

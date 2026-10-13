# 姿势编辑交互参考核对

日期：2026-10-12。本轮只研究和记录，不安装软件、不改姿势求解或用户内容、不提交发布。

## 证据级别

Chrome新标签操作两次失败：Unable to load browser request-header policy。随后只读浏览器清单确认当前编辑器标签仍在，未刷新或操作它。没有完成外部网站实操，以下是官方教程与公开源码核对，不是体验验收或性能结论。

## 现成工具

- [Magic Poser：两种摆姿势方式](https://wombatstudio.zendesk.com/hc/en-us/articles/1500007715741-Two-ways-of-posing)：拖动用于较大范围改变，旋转用于局部精修。[手臂教程](https://wombatstudio.zendesk.com/hc/en-us/articles/1500007850562-Arms)明确手腕拖动包含肩、锁骨联动；但肘拖动保持手腕和肩位置。[腿教程](https://wombatstudio.zendesk.com/hc/en-us/articles/1500007839221-Legs)同样将膝拖动定义为保持两端的方向调整。因此不能把“固定两端一定错误”当成成熟工具共识，缺少锁骨和躯干参与也是当前体验不佳的原因。
- [Cascadeur：全身约束调整](https://cascadeur.com/help//relaxation_in_cascadeur)：移动连接点后调整相连刚体距离和姿态，并尽量少改变原姿势；关键帧采用双向全身联动。[固定工具](https://cascadeur.com/help/tools/animation_tools/fixing_tools)允许用户阻止某些部位跟随。不要将此能力和基于预测的AutoPosing混为一谈；普通联动不必先引入学习模型。[AutoPosing](https://cascadeur.com/help/tools/animation_tools/autoposing)需要专用控制骨架，也有脚踝始终参与等规则，不是所有点默认完全自由。
- [PoseMy.Art](https://posemy.art/blog/features-you-might-be-overlooking/)：灰色方块拖整条肢体，彩色关节点旋转；[JustSketchMe](https://justsketch.me/docs/)同样提供末端拖动和各关节旋转，移动轴/平面可明确控制深度。当前资料不能证明它们具备Cascadeur式全身联动。

## 开源实现

[Fullbody Pose Maker](https://github.com/neka-nat/fullbody-pose-maker)提供浏览器示例，代码为[MIT许可](https://github.com/neka-nat/fullbody-pose-maker/blob/main/LICENSE)。资源许可需另外核对，不由代码许可推出。

- `lib/ik.ts`，核对blob：28304c4c32a8d92dad4999f42cffd4d22ffa6fdf。[源码](https://github.com/neka-nat/fullbody-pose-maker/blob/main/lib/ik.ts)solveIK按每个位置/朝向目标建立关节到根的链，对链内关节累积旋转调整，默认允许根平移；有简化重心偏置。不是只动末端附近两个关节。每次旋转步长的clamp不是肘膝人体角度限位，不能宣称已有完整生理约束或碰撞处理。
- `lib/store.ts`：[源码](https://github.com/neka-nat/fullbody-pose-maker/blob/main/lib/store.ts)分别保存位置目标和朝向目标的开关，初始四个手脚位置目标均启用。不能照抄这一默认状态来实现“未固定部位自由跟随”。
- `components/Scene.tsx`：[源码](https://github.com/neka-nat/fullbody-pose-maker/blob/main/components/Scene.tsx)将全部启用控制点统一送入每帧求解，TransformControls改变目标，而不是直接移动骨节点。只确认调用链，尚未运行或验证与本项目两骨架兼容。

## 对本项目的结论（待实现）

下列是初轮研究推断，尚未成为实现结论。2026-10-12继续深读后，学习对象已扩大为完整控制模型与全身连接图，不再以手脚向上联动作为总体架构。参见[专题源码学习](motion-fullbody-study.md)；不应依据本节直接继续修改现有工具。

优先研究“局部摆姿势＋必要时向上联动＋用户显式固定”，而不是所有部位永远锁住，或让一次拖动无条件改变全身。拖手先手臂/锁骨参与；需要更多范围再让胸腰参与；拖脚同样让髋/骨盆参与。输入是拖动目标、原姿势、固定点集合和关节约束，输出仍为现有姿势快照，不增加另一套素材协议。

用户固定点作为优先保持的目标，未固定部位只在满足目标需要时跟随；冲突时提示或限制拖动，不拉伸骨骼。原始动画和默认姿势不能被自动改写。先做独立试验比较：举手过头、单脚抬膝、从站立摆跑步、固定一脚再移骨盆；核对目标误差、身体联动、骨长、方向、拖动稳定和操作次数，再决定是否替换现有求解器。上述不是已经完成的能力。

const shell = document.querySelector('#canvasShell');
const canvas = document.querySelector('#canvas');
const zoomValue = document.querySelector('#zoomValue');
const frameWorkspace = document.querySelector('#frameWorkspace');
const zoomLevels = [48, 56, 64, 72, 80, 88];
let zoomIndex = 3;
let dragging = false;
let startX = 0;
let startY = 0;
let startScrollLeft = 0;
let startScrollTop = 0;

const nodeDetails = {
  source: ['浣熊战士', '角色基准已确认', [['类型','角色参考图'],['规格','1024 × 1024 PNG'],['用途','所有动作的形象基准']], '保存角色不可变的视觉参考。它可以分出多个动作，但不会被后续抽帧或抠图覆盖。', '更换参考图'],
  runVideo: ['跑步源视频', '素材可以进入下一步', [['来源','图片生成视频'],['时长','4.0 秒'],['画面','1280 × 720']], '原始视频节点只保存素材和来源。重新生成其他版本时，会形成并列分支，不会覆盖当前版本。', '打开视频'],
  extractRun: ['抽取序列帧', '已生成 12 帧', [['采样','12 帧/秒'],['区间','00:00—00:04'],['结果','12 张原始帧']], '处理节点保持紧凑，只展示参数和状态。双击进入专注工具，结果自动流向右侧的新节点。', '调整抽帧'],
  organizeRun: ['跑步序列', '帧整理已完成', [['保留','12 帧'],['循环','01—12'],['流畅度','94%']], '这里保存经过排序、删除和循环选择后的帧集合，同时保留它来自哪个视频和哪次抽帧。', '打开帧整理'],
  mattingRun: ['跑步抠图', '12 帧处理完成', [['方法','模型 + 去绿边'],['完成','12 / 12 帧'],['精修','2 帧已调整']], '批处理作为一个过程节点存在。选中后可以查看状态；进入节点才展开批量抠图和单帧精修工具。', '打开抠图'],
  runAsset: ['跑步动作资产', '可以参与角色编排', [['帧数','12 帧'],['播放','12 帧/秒循环'],['校准','已对齐角色基准']], '动作资产是这条分支的稳定结果。后续校准、事件和引擎连接都引用它，而不是引用临时处理页面。', '预览动作'],
  jumpVideo: ['跳跃源视频', '素材可以进入下一步', [['来源','图片生成视频'],['时长','3.0 秒'],['画面','1280 × 720']], '跳跃和跑步是同一角色的并行分支。画布能够直接比较两个动作的素材来源和完成状态。', '打开视频'],
  extractJump: ['抽取序列帧', '已生成 8 帧', [['采样','12 帧/秒'],['区间','00:00—00:03'],['结果','8 张原始帧']], '系统自动承接上游视频，不需要重新导入。修改采样只产生新的帧结果，不破坏已确认版本。', '调整抽帧'],
  organizeJump: ['跳跃序列', '需要确认首尾循环', [['保留','8 帧'],['候选','2 个循环区间'],['当前','尚未确认']], '黄色表示需要人的判断。打开后只处理跳跃帧，不会离开角色项目，也不会丢失画布上的其他动作。', '检查首尾帧'],
  mattingJump: ['跳跃透明化处理', '尚未开始', [['输入','当前跳跃帧'],['状态','可运行'],['关系','可与帧整理独立进行']], '整理和抠图没有强制先后关系。节点读取当前帧集合；后续帧集合变化时会明确提示哪些结果需要更新。', '开始透明化处理'],
  jumpAsset: ['跳跃动作资产', '等待统一校准', [['帧数','8 帧'],['播放','单次'],['校准','尚未对齐基准']], '透明帧形成动作资产后即可进入角色编排。尺寸、原点和地面线在角色层统一，不要求每条生产分支重复设置。', '开始校准'],
  attackEmpty: ['攻击动作素材', '尚未添加素材', [['可输入','视频 / PNG 序列'],['也可以','从参考图生成视频'],['动作','攻击']], '空节点是明确的下一步入口，而不是另开一个陌生页面。拖入素材后，系统会自动铺出后续处理链。', '选择素材'],
  attackAsset: ['攻击动作资产', '尚未形成', [['状态','等待素材'],['目标','透明动作帧'],['编排','未开始']], '这是攻击分支预留的结果位置，让角色资产缺少什么一眼可见。', '添加素材'],
  characterAsset: ['浣熊战士资产', '2 个动作进入角色资产', [['动作','跑步 / 跳跃 / 攻击'],['统一画布','512 × 512'],['统一原点','256, 448']], '角色资产节点汇聚所有动作，只负责跨动作的一致性、事件和输出协议，不承担抽帧或抠图。', '打开角色编排'],
  engine: ['Godot 项目', '尚未连接', [['方式','本地只读预览'],['输入','角色资产包'],['写入','需要用户确认']], '游戏引擎只连接最终角色资产，不直接读取临时视频、抽帧任务或抠图中间状态。', '连接 Godot']
};

const nodeRelations = {
  source: ['角色源节点', '上游 0 · 下游 3'],
  runVideo: ['动作视频节点', '上游 1 · 下游 1'],
  extractRun: ['处理节点', '上游 1 · 下游 1'],
  organizeRun: ['帧工作区节点', '上游 1 · 下游 1'],
  mattingRun: ['处理节点', '上游 1 · 下游 1'],
  runAsset: ['动作资产节点', '上游 1 · 下游 1'],
  jumpVideo: ['动作视频节点', '上游 1 · 下游 1'],
  extractJump: ['处理节点', '上游 1 · 下游 1'],
  organizeJump: ['帧工作区节点', '上游 1 · 下游 1'],
  mattingJump: ['处理节点', '上游 1 · 下游 1'],
  jumpAsset: ['动作资产节点', '上游 1 · 下游 1'],
  attackEmpty: ['动作入口节点', '上游 1 · 下游 0'],
  characterAsset: ['角色资产节点', '上游 3 · 下游 1'],
  engine: ['游戏引擎节点', '上游 1 · 下游 0']
};

function renderTransform() {
  canvas.className = `canvas zoom-${zoomLevels[zoomIndex]}`;
  zoomValue.textContent = `${zoomLevels[zoomIndex]}%`;
}

function selectNode(node) {
  document.querySelectorAll('.node').forEach((item) => item.classList.toggle('selected', item === node));
  const detail = nodeDetails[node.dataset.node];
  if (!detail) return;
  document.querySelector('#inspectTitle').textContent = detail[0];
  document.querySelector('#inspectStatus').textContent = detail[1];
  document.querySelector('#inspectDetails').innerHTML = detail[2].map(([term,value]) => `<div><dt>${term}</dt><dd>${value}</dd></div>`).join('');
  document.querySelector('#inspectDescription').textContent = detail[3];
  document.querySelector('#inspectAction').textContent = detail[4];
  const relation = nodeRelations[node.dataset.node] || ['工作节点', '上游 1 · 下游 1'];
  document.querySelector('#inspectKind').textContent = relation[0];
  document.querySelector('#inspectLinks').textContent = relation[1];
}

function openFrameWorkspace() {
  frameWorkspace.classList.add('is-open');
  frameWorkspace.setAttribute('aria-hidden', 'false');
}

function closeFrameWorkspace() {
  frameWorkspace.classList.remove('is-open');
  frameWorkspace.setAttribute('aria-hidden', 'true');
}

function buildFocusFrames() {
  const grid = document.querySelector('#focusFrameGrid');
  grid.innerHTML = '';
  for (let index = 0; index < 8; index += 1) {
    const card = document.createElement('button');
    card.className = `focus-frame${index === 3 ? ' is-current' : ''}`;
    card.type = 'button';
    card.innerHTML = `<span class="focus-frame-preview"><span class="character jumping"><i class="ear left"></i><i class="ear right"></i><span class="mask"></span><b>跳</b></span></span><span class="focus-frame-label"><b>${String(index + 1).padStart(3, '0')}</b><span>#${String(18 + index * 4).padStart(3, '0')}</span></span><span class="focus-frame-check">✓</span>`;
    card.addEventListener('click', () => {
      grid.querySelectorAll('.focus-frame').forEach((item) => item.classList.toggle('is-current', item === card));
      document.querySelector('.focus-preview h2').textContent = `第 ${String(index + 1).padStart(2, '0')} 帧`;
      document.querySelector('.focus-player > span').textContent = `${String(index + 1).padStart(2, '0')} / 08`;
      document.querySelector('.frame-inspector h2').textContent = String(index + 1).padStart(2, '0');
    });
    grid.append(card);
  }
}

document.querySelectorAll('.node').forEach((node) => {
  node.addEventListener('pointerdown', (event) => event.stopPropagation());
  node.addEventListener('click', () => selectNode(node));
});

document.querySelectorAll('.frames-node footer button').forEach((button) => {
  button.addEventListener('click', (event) => { event.stopPropagation(); openFrameWorkspace(); });
});

document.querySelectorAll('.inspector-tabs button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.inspector-tabs button').forEach((item) => item.classList.toggle('is-active', item === button));
  });
});

document.querySelector('#inspectAction').addEventListener('click', () => {
  const selected = document.querySelector('.node.selected')?.dataset.node;
  if (selected === 'organizeRun' || selected === 'organizeJump') openFrameWorkspace();
});
document.querySelector('#closeFrameWorkspace').addEventListener('click', closeFrameWorkspace);
document.querySelector('#finishFrameWorkspace').addEventListener('click', closeFrameWorkspace);

shell.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  dragging = true;
  startX = event.clientX;
  startY = event.clientY;
  startScrollLeft = shell.scrollLeft;
  startScrollTop = shell.scrollTop;
  shell.classList.add('dragging');
  shell.setPointerCapture(event.pointerId);
});
shell.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  shell.scrollLeft = startScrollLeft - (event.clientX - startX);
  shell.scrollTop = startScrollTop - (event.clientY - startY);
});
shell.addEventListener('pointerup', () => { dragging = false; shell.classList.remove('dragging'); });
shell.addEventListener('wheel', (event) => {
  event.preventDefault();
  zoomIndex = Math.min(zoomLevels.length - 1, Math.max(0, zoomIndex + (event.deltaY < 0 ? 1 : -1)));
  renderTransform();
}, { passive: false });

document.querySelector('#zoomIn').addEventListener('click', () => { zoomIndex = Math.min(zoomLevels.length - 1, zoomIndex + 1); renderTransform(); });
document.querySelector('#zoomOut').addEventListener('click', () => { zoomIndex = Math.max(0, zoomIndex - 1); renderTransform(); });
document.querySelector('#zoomFit').addEventListener('click', () => { zoomIndex = 3; shell.scrollLeft = 0; shell.scrollTop = 0; renderTransform(); });
document.querySelector('#closeInspector').addEventListener('click', () => document.querySelector('#inspector').classList.toggle('is-muted'));

buildFocusFrames();
renderTransform();

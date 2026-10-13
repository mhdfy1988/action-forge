"""R6 工作流项目协议、内置节点注册表与图语义校验。"""

from __future__ import annotations

import json
from collections import defaultdict, deque
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictInt,
    field_validator,
    model_validator,
)


ID = Annotated[str, Field(pattern=r"^[a-z0-9][a-z0-9._-]{0,63}$")]
NAME = Annotated[str, Field(min_length=1, max_length=80)]
TEXT = Annotated[str, Field(min_length=1, max_length=4000)]
REVISION = Annotated[StrictInt, Field(ge=0)]
SHA256 = Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")]

AssetType = Literal[
    "reference-image",
    "action-video",
    "frame-set/source",
    "frame-set/transparent",
    "action-clip",
    "character-asset",
    "engine-package",
]
ExecutionMode = Literal["source", "automatic", "interactive", "external"]
NodeType = Literal[
    "reference-image",
    "action-video",
    "extract-frames",
    "organize-frames",
    "process-frames",
    "remove-background",
    "build-action-clip",
    "assemble-character",
    "game-preview",
    "export-game-assets",
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


def safe_project_path(value: str) -> str:
    if not isinstance(value, str) or not value or len(value) > 1024:
        raise ValueError("项目相对路径必须是非空字符串且不超过1024字符")
    if ("\\" in value or ":" in value or value.startswith("/")
            or any(part in ("", ".", "..") for part in value.split("/"))
            or any(ord(char) < 32 or ord(char) == 127 for char in value)):
        raise ValueError("项目相对路径包含绝对路径或非法段")
    return value


class Viewport(StrictModel):
    x: float
    y: float
    zoom: Annotated[float, Field(ge=0.1, le=4.0)]


class NodePosition(StrictModel):
    x: float
    y: float


class EmptyParameters(StrictModel):
    pass


class NamedSourceParameters(StrictModel):
    label: NAME | None = None


class ActionVideoParameters(NamedSourceParameters):
    prompt: TEXT | None = None
    direction: Annotated[str, Field(min_length=1, max_length=40)] | None = None
    durationSeconds: Annotated[float, Field(gt=0, le=60)] | None = None
    providerNote: Annotated[str, Field(max_length=1000)] | None = None


class ExtractFramesParameters(StrictModel):
    startSeconds: Annotated[float, Field(ge=0)] | None = None
    endSeconds: Annotated[float, Field(gt=0)] | None = None
    fps: Annotated[StrictInt, Field(ge=1, le=60)] | None = None

    @model_validator(mode="after")
    def valid_range(self) -> ExtractFramesParameters:
        if (self.startSeconds is not None and self.endSeconds is not None
                and self.endSeconds <= self.startSeconds):
            raise ValueError("抽帧结束时间必须晚于开始时间")
        return self


class OrganizeFramesParameters(StrictModel):
    previewFps: Annotated[StrictInt, Field(ge=1, le=60)] | None = None
    loopStart: Annotated[StrictInt, Field(ge=0)] | None = None
    loopEndExclusive: Annotated[StrictInt, Field(gt=0)] | None = None

    @model_validator(mode="after")
    def valid_loop(self) -> OrganizeFramesParameters:
        if ((self.loopStart is None) != (self.loopEndExclusive is None)):
            raise ValueError("循环范围必须同时设置开始和结束")
        if (self.loopStart is not None and self.loopEndExclusive <= self.loopStart):
            raise ValueError("循环结束帧必须晚于开始帧")
        return self


class RemoveBackgroundParameters(StrictModel):
    pipeline: Literal["model-ffmpeg"] = "model-ffmpeg"
    despillStrength: Annotated[float, Field(ge=0, le=1)] | None = None


class ActionClipParameters(StrictModel):
    name: NAME | None = None
    loop: StrictBool | None = None
    fps: Annotated[StrictInt, Field(ge=1, le=60)] | None = None


class CharacterAssemblyParameters(StrictModel):
    characterName: NAME | None = None
    defaultAction: ID | None = None


class PreviewParameters(StrictModel):
    target: Literal["godot", "javascript"] | None = None


class ExportParameters(StrictModel):
    format: Literal["png-sequence", "sprite-sheet"] | None = None
    frameWidth: Annotated[StrictInt, Field(ge=1, le=8192)] | None = None
    frameHeight: Annotated[StrictInt, Field(ge=1, le=8192)] | None = None


@dataclass(frozen=True)
class PortDefinition:
    name: str
    assetTypes: frozenset[str]
    required: bool = True
    maxConnections: int | None = 1
    passthroughInput: str | None = None


@dataclass(frozen=True)
class NodeDefinition:
    type: str
    title: str
    version: int
    executionMode: str
    inputs: tuple[PortDefinition, ...]
    outputs: tuple[PortDefinition, ...]
    parameterModel: type[StrictModel]
    requiredParameters: tuple[str, ...] = ()
    target: bool = False

    def input(self, name: str) -> PortDefinition | None:
        return next((port for port in self.inputs if port.name == name), None)

    def output(self, name: str) -> PortDefinition | None:
        return next((port for port in self.outputs if port.name == name), None)


def _port(name: str, *asset_types: str, required: bool = True,
          max_connections: int | None = 1,
          passthrough_input: str | None = None) -> PortDefinition:
    return PortDefinition(
        name=name,
        assetTypes=frozenset(asset_types),
        required=required,
        maxConnections=max_connections,
        passthroughInput=passthrough_input,
    )


NODE_DEFINITIONS: tuple[NodeDefinition, ...] = (
    NodeDefinition(
        "reference-image", "角色参考图", 1, "source", (),
        (_port("image", "reference-image"),), NamedSourceParameters,
    ),
    NodeDefinition(
        "action-video", "动作视频", 1, "source",
        (_port("reference", "reference-image", required=False),),
        (_port("video", "action-video"),), ActionVideoParameters,
    ),
    NodeDefinition(
        "process-frames", "序列帧处理", 1, "interactive",
        (_port("source", "action-video", "frame-set/source", "frame-set/transparent"),),
        (_port("frames", "frame-set/source", "frame-set/transparent"),),
        ExtractFramesParameters,
    ),
    NodeDefinition(
        "extract-frames", "提取序列帧", 1, "automatic",
        (_port("video", "action-video"),),
        (_port("frames", "frame-set/source"),), ExtractFramesParameters,
        requiredParameters=("startSeconds", "endSeconds", "fps"),
    ),
    NodeDefinition(
        "organize-frames", "整理序列帧", 1, "interactive",
        (_port("frames", "frame-set/source", "frame-set/transparent"),),
        (_port(
            "frames", "frame-set/source", "frame-set/transparent",
            passthrough_input="frames",
        ),), OrganizeFramesParameters,
    ),
    NodeDefinition(
        "remove-background", "移除背景", 1, "automatic",
        (_port("frames", "frame-set/source"),),
        (_port("frames", "frame-set/transparent"),), RemoveBackgroundParameters,
    ),
    NodeDefinition(
        "build-action-clip", "制作动作片段", 1, "interactive",
        (_port("frames", "frame-set/transparent"),),
        (_port("clip", "action-clip"),), ActionClipParameters,
        requiredParameters=("name", "loop", "fps"),
    ),
    NodeDefinition(
        "assemble-character", "组装角色资产", 1, "interactive",
        (
            _port("reference", "reference-image", required=False),
            _port("clips", "action-clip", max_connections=None),
        ),
        (_port("character", "character-asset"),), CharacterAssemblyParameters,
        requiredParameters=("characterName",),
    ),
    NodeDefinition(
        "game-preview", "游戏预览", 1, "interactive",
        (_port("character", "character-asset"),), (), PreviewParameters,
        requiredParameters=("target",), target=True,
    ),
    NodeDefinition(
        "export-game-assets", "导出游戏资产", 1, "automatic",
        (_port("character", "character-asset"),),
        (_port("package", "engine-package"),), ExportParameters,
        requiredParameters=("format",), target=True,
    ),
)

NODE_REGISTRY: dict[str, NodeDefinition] = {
    definition.type: definition for definition in NODE_DEFINITIONS
}

ASSET_TYPES = (
    "reference-image",
    "action-video",
    "frame-set/source",
    "frame-set/transparent",
    "action-clip",
    "character-asset",
    "engine-package",
)
EXECUTION_MODES = ("source", "automatic", "interactive", "external")


class WorkflowNode(StrictModel):
    id: ID
    type: NodeType
    name: NAME | None = None
    definitionVersion: Annotated[StrictInt, Field(ge=1)]
    position: NodePosition
    collapsed: StrictBool = False
    parameters: dict

    @field_validator("parameters")
    @classmethod
    def limited_parameters(cls, value: dict) -> dict:
        if len(json.dumps(value, ensure_ascii=False, allow_nan=False).encode("utf-8")) > 64 * 1024:
            raise ValueError("节点参数超过64KiB")
        return value


class WorkflowConnection(StrictModel):
    id: ID
    fromNode: ID
    fromPort: ID
    toNode: ID
    toPort: ID


class AssetRevision(StrictModel):
    id: ID
    type: AssetType
    revision: REVISION
    path: str
    contentHash: SHA256

    @field_validator("path")
    @classmethod
    def valid_path(cls, value: str) -> str:
        return safe_project_path(value)


class AssetReference(StrictModel):
    id: ID
    revision: REVISION


class OutputBinding(StrictModel):
    port: ID
    asset: AssetReference


class NodeResult(StrictModel):
    nodeId: ID
    definitionVersion: Annotated[StrictInt, Field(ge=1)]
    resultSignature: SHA256
    confirmed: StrictBool
    outputs: list[OutputBinding]


class WorkflowIssue(StrictModel):
    code: Literal[
        "missing-required-input",
        "missing-parameter",
        "waiting-source",
        "waiting-interactive",
        "waiting-external",
    ]
    nodeId: ID
    field: str | None = None
    message: str


class ExecutionInspection(StrictModel):
    targetNodeId: ID
    nodeIds: list[ID]
    issues: list[WorkflowIssue]


class WorkflowProject(StrictModel):
    formatVersion: Literal[1]
    kind: Literal["action-forge-workflow"]
    id: ID
    name: NAME
    revision: REVISION
    viewport: Viewport
    nodes: list[WorkflowNode]
    connections: list[WorkflowConnection]
    assets: list[AssetRevision]
    results: list[NodeResult]

    @model_validator(mode="after")
    def valid_graph(self) -> WorkflowProject:
        _validate_project(self)
        return self


def _unique(values: list[str], label: str) -> None:
    if len(values) != len(set(values)):
        raise ValueError(f"{label}重复")


def _topological_order(project: WorkflowProject) -> list[str]:
    outgoing: dict[str, list[str]] = defaultdict(list)
    indegree = {node.id: 0 for node in project.nodes}
    for connection in project.connections:
        outgoing[connection.fromNode].append(connection.toNode)
        indegree[connection.toNode] += 1
    ready = deque(node_id for node_id, count in indegree.items() if count == 0)
    ordered: list[str] = []
    while ready:
        node_id = ready.popleft()
        ordered.append(node_id)
        for target in outgoing[node_id]:
            indegree[target] -= 1
            if indegree[target] == 0:
                ready.append(target)
    if len(ordered) != len(project.nodes):
        raise ValueError("工作流不能包含依赖环")
    return ordered


def _effective_output_types(
        project: WorkflowProject,
        node_by_id: dict[str, WorkflowNode],
        incoming: dict[tuple[str, str], list[WorkflowConnection]],
        node_id: str,
        port_name: str,
        memo: dict[tuple[str, str], frozenset[str]],
) -> frozenset[str]:
    key = (node_id, port_name)
    if key in memo:
        return memo[key]
    definition = NODE_REGISTRY[node_by_id[node_id].type]
    port = definition.output(port_name)
    if port is None:
        raise ValueError(f"节点{node_id}不存在输出端口{port_name}")
    if node_by_id[node_id].type == "process-frames":
        sources = incoming.get((node_id, "source"), [])
        if sources:
            source = sources[0]
            types = _effective_output_types(project, node_by_id, incoming, source.fromNode, source.fromPort, memo)
            memo[key] = frozenset({"frame-set/source"}) if "action-video" in types else types
            return memo[key]
    if port.passthroughInput is None:
        memo[key] = port.assetTypes
        return port.assetTypes
    sources = incoming.get((node_id, port.passthroughInput), [])
    if not sources:
        memo[key] = port.assetTypes
        return port.assetTypes
    source = sources[0]
    types = _effective_output_types(
        project, node_by_id, incoming, source.fromNode, source.fromPort, memo,
    )
    memo[key] = types
    return types


def _validate_project(project: WorkflowProject) -> None:
    _unique([node.id for node in project.nodes], "节点ID")
    _unique([connection.id for connection in project.connections], "连接ID")
    _unique([result.nodeId for result in project.results], "节点结果")
    asset_keys = [f"{asset.id}@{asset.revision}" for asset in project.assets]
    _unique(asset_keys, "资产修订")

    node_by_id = {node.id: node for node in project.nodes}
    incoming: dict[tuple[str, str], list[WorkflowConnection]] = defaultdict(list)
    endpoints: set[tuple[str, str, str, str]] = set()

    for node in project.nodes:
        definition = NODE_REGISTRY[node.type]
        if node.definitionVersion != definition.version:
            raise ValueError(
                f"节点{node.id}定义版本{node.definitionVersion}不受支持，"
                f"当前版本为{definition.version}"
            )
        try:
            definition.parameterModel.model_validate(node.parameters)
        except ValueError as exc:
            raise ValueError(f"节点{node.id}参数无效：{exc}") from exc

    for connection in project.connections:
        source = node_by_id.get(connection.fromNode)
        target = node_by_id.get(connection.toNode)
        if source is None or target is None:
            raise ValueError(f"连接{connection.id}引用不存在的节点")
        if source.id == target.id:
            raise ValueError(f"连接{connection.id}不能连接节点自身")
        source_port = NODE_REGISTRY[source.type].output(connection.fromPort)
        target_port = NODE_REGISTRY[target.type].input(connection.toPort)
        if source_port is None:
            raise ValueError(f"节点{source.id}不存在输出端口{connection.fromPort}")
        if target_port is None:
            raise ValueError(f"节点{target.id}不存在输入端口{connection.toPort}")
        endpoint = (
            connection.fromNode, connection.fromPort,
            connection.toNode, connection.toPort,
        )
        if endpoint in endpoints:
            raise ValueError("不能保存重复连接")
        endpoints.add(endpoint)
        incoming[(connection.toNode, connection.toPort)].append(connection)

    for (node_id, port_name), connections in incoming.items():
        port = NODE_REGISTRY[node_by_id[node_id].type].input(port_name)
        if port.maxConnections is not None and len(connections) > port.maxConnections:
            raise ValueError(f"节点{node_id}输入端口{port_name}连接数量超过限制")

    _topological_order(project)
    memo: dict[tuple[str, str], frozenset[str]] = {}
    for connection in project.connections:
        source_types = _effective_output_types(
            project, node_by_id, incoming,
            connection.fromNode, connection.fromPort, memo,
        )
        target_port = NODE_REGISTRY[node_by_id[connection.toNode].type].input(
            connection.toPort
        )
        if source_types.isdisjoint(target_port.assetTypes):
            actual = ", ".join(sorted(source_types))
            expected = ", ".join(sorted(target_port.assetTypes))
            raise ValueError(
                f"连接{connection.id}类型不兼容：输出[{actual}]，输入需要[{expected}]"
            )

    asset_by_key = {
        (asset.id, asset.revision): asset for asset in project.assets
    }
    result_by_node = {result.nodeId: result for result in project.results}
    for result in project.results:
        node = node_by_id.get(result.nodeId)
        if node is None:
            raise ValueError(f"节点结果引用不存在的节点{result.nodeId}")
        definition = NODE_REGISTRY[node.type]
        if result.definitionVersion != definition.version:
            raise ValueError(f"节点{node.id}结果定义版本与当前节点不一致")
        _unique([binding.port for binding in result.outputs], f"节点{node.id}输出端口")
        bound_ports = {binding.port for binding in result.outputs}
        if result.confirmed:
            missing_ports = [
                port.name for port in definition.outputs
                if port.required and port.name not in bound_ports
            ]
            if missing_ports:
                raise ValueError(
                    f"节点{node.id}确认结果缺少必填输出端口："
                    f"{', '.join(missing_ports)}"
                )
        for binding in result.outputs:
            port = definition.output(binding.port)
            if port is None:
                raise ValueError(f"节点{node.id}结果引用不存在的输出端口{binding.port}")
            asset = asset_by_key.get((binding.asset.id, binding.asset.revision))
            if asset is None:
                raise ValueError(f"节点{node.id}结果引用不存在的资产修订")
            effective = _effective_output_types(
                project, node_by_id, incoming, node.id, binding.port, memo,
            )
            if asset.type not in effective:
                raise ValueError(f"节点{node.id}输出资产类型与端口不兼容")

    if set(result_by_node) - set(node_by_id):
        raise ValueError("工作流包含孤立节点结果")


def inspect_execution(project: WorkflowProject, target_node_id: str) -> ExecutionInspection:
    """检查目标上游闭包；不运行节点，也不判断结果签名是否过期。"""
    node_by_id = {node.id: node for node in project.nodes}
    if target_node_id not in node_by_id:
        raise ValueError(f"目标节点不存在：{target_node_id}")

    incoming_by_node: dict[str, list[WorkflowConnection]] = defaultdict(list)
    incoming_by_port: dict[tuple[str, str], list[WorkflowConnection]] = defaultdict(list)
    for connection in project.connections:
        incoming_by_node[connection.toNode].append(connection)
        incoming_by_port[(connection.toNode, connection.toPort)].append(connection)

    scope: set[str] = set()
    pending = [target_node_id]
    while pending:
        node_id = pending.pop()
        if node_id in scope:
            continue
        scope.add(node_id)
        pending.extend(connection.fromNode for connection in incoming_by_node[node_id])

    ordered = [node_id for node_id in _topological_order(project) if node_id in scope]
    result_by_node = {result.nodeId: result for result in project.results}
    issues: list[WorkflowIssue] = []

    for node_id in ordered:
        node = node_by_id[node_id]
        definition = NODE_REGISTRY[node.type]
        for port in definition.inputs:
            if port.required and not incoming_by_port.get((node_id, port.name)):
                issues.append(WorkflowIssue(
                    code="missing-required-input", nodeId=node_id, field=port.name,
                    message=f"缺少必填输入：{port.name}",
                ))
        for parameter in definition.requiredParameters:
            value = node.parameters.get(parameter)
            if value is None or value == "":
                issues.append(WorkflowIssue(
                    code="missing-parameter", nodeId=node_id, field=parameter,
                    message=f"缺少必填参数：{parameter}",
                ))

        result = result_by_node.get(node_id)
        if result is not None and result.confirmed:
            continue
        if definition.executionMode == "source":
            code, message = "waiting-source", "等待用户导入素材"
        elif definition.executionMode == "interactive":
            code, message = "waiting-interactive", "等待用户编辑并确认"
        elif definition.executionMode == "external":
            code, message = "waiting-external", "等待用户导入并确认外部结果"
        else:
            continue
        issues.append(WorkflowIssue(
            code=code, nodeId=node_id, message=message,
        ))

    return ExecutionInspection(
        targetNodeId=target_node_id,
        nodeIds=ordered,
        issues=issues,
    )


def write_json_schema(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    schema = WorkflowProject.model_json_schema()
    path.write_text(
        json.dumps(schema, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def node_registry_document() -> dict:
    """生成前端只读节点目录，避免在画布层复制协议定义。"""
    return {
        "formatVersion": 1,
        "assetTypes": list(ASSET_TYPES),
        "executionModes": list(EXECUTION_MODES),
        "nodes": [
            {
                "type": definition.type,
                "title": definition.title,
                "version": definition.version,
                "executionMode": definition.executionMode,
                "target": definition.target,
                "inputs": [
                    {
                        "name": port.name,
                        "assetTypes": sorted(port.assetTypes),
                        "required": port.required,
                        "maxConnections": port.maxConnections,
                    }
                    for port in definition.inputs
                ],
                "outputs": [
                    {
                        "name": port.name,
                        "assetTypes": sorted(port.assetTypes),
                        "required": port.required,
                        "passthroughInput": port.passthroughInput,
                    }
                    for port in definition.outputs
                ],
                "requiredParameters": list(definition.requiredParameters),
                "parameterSchema": definition.parameterModel.model_json_schema(),
            }
            for definition in NODE_DEFINITIONS
        ],
    }


def write_node_registry(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(node_registry_document(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

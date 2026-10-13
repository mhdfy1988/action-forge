"""角色项目持久化：跨进程互斥、修订控制和清单最后提交。"""

from __future__ import annotations

import os
import hashlib
import shutil
import uuid
import json
import tempfile
import zipfile
from pathlib import Path

from filelock import FileLock, Timeout
from pydantic import ValidationError

from .character_project_schema import CharacterProject, upgrade_project, validate_project_assets
from .domain import DomainError


OWNER = "action-forge-projects-v1"


def _semantic(value):
    """比较用户内容时忽略所有仓库持有的修订号。"""
    if isinstance(value, dict):
        return {key: _semantic(item) for key, item in value.items() if key != "revision"}
    if isinstance(value, list):
        return [_semantic(item) for item in value]
    return value


class ProjectRepository:
    def __init__(self, root: Path, lock_timeout: float = 2):
        self.root = root.resolve()
        self.lock_timeout = lock_timeout
        if self.root == Path(self.root.anchor) or self.root == Path.home().resolve():
            raise DomainError("项目目录不能是磁盘根目录或用户根目录")
        self.root.mkdir(parents=True, exist_ok=True)
        marker = self.root / ".action-forge-projects-owner"
        if marker.exists() and marker.read_text(encoding="utf-8") != OWNER:
            raise DomainError("项目目录所有权不匹配")
        if not marker.exists():
            unknown = [path for path in self.root.iterdir() if path.name != ".locks"]
            if unknown:
                raise DomainError("项目目录已有未知文件，拒绝接管")
            marker.write_text(OWNER, encoding="utf-8")
        self.locks = self.root / ".locks"
        self.locks.mkdir(exist_ok=True)

    def _directory(self, project_id: str) -> Path:
        # 先借助领域模型的ID约束做同口径验证，避免API层与仓库层分叉。
        if not isinstance(project_id, str) or not project_id or len(project_id) > 64:
            raise DomainError("项目ID无效")
        if any(char not in "abcdefghijklmnopqrstuvwxyz0123456789._-" for char in project_id):
            raise DomainError("项目ID无效")
        if project_id[0] not in "abcdefghijklmnopqrstuvwxyz0123456789":
            raise DomainError("项目ID无效")
        return self.root / project_id

    def _lock(self, project_id: str) -> FileLock:
        return FileLock(self.locks / f"{project_id}.lock", timeout=self.lock_timeout)

    def list(self) -> list[dict]:
        projects = []
        for child in sorted(self.root.iterdir(), key=lambda path: path.name):
            manifest = child / "project.json"
            if not child.is_dir() or child.name == ".locks" or not manifest.is_file():
                continue
            try:
                project = self._read(manifest)
            except DomainError:
                projects.append({"id": child.name, "status": "invalid"})
                continue
            projects.append({
                "id": project.id, "name": project.name, "revision": project.revision,
                "characterCount": len(project.characters),
                "actionCount": sum(len(character.actions) for character in project.characters),
                "status": "ready",
            })
        return projects

    def load(self, project_id: str, *, inspect_assets: bool = True) -> CharacterProject:
        directory = self._directory(project_id)
        manifest = directory / "project.json"
        if not manifest.is_file():
            raise DomainError("角色项目不存在")
        project = self._read(manifest)
        if project.id != project_id:
            raise DomainError("项目目录与清单ID不一致")
        if inspect_assets:
            try:
                validate_project_assets(project, directory)
            except ValueError as exc:
                raise DomainError(str(exc)) from exc
        return project

    def create(self, draft: CharacterProject,
               assets: dict[str, Path] | None = None,
               preserve_frame_revisions: bool = False) -> CharacterProject:
        directory = self._directory(draft.id)
        try:
            with self._lock(draft.id):
                if directory.exists():
                    raise DomainError("项目ID已存在")
                project = upgrade_project(draft.model_copy(deep=True, update={"revision": 0}))
                for character in project.characters:
                    character.revision = 0
                    for action in character.actions:
                        action.revision = 0
                        if not preserve_frame_revisions:
                            for frame in action.frames:
                                frame.revision = 0
                directory.mkdir()
                try:
                    self._install_assets(directory, assets or {})
                    try:
                        validate_project_assets(project, directory)
                    except ValueError as exc:
                        raise DomainError(str(exc)) from exc
                    self._write(directory, project)
                except BaseException:
                    # 目录由本次调用创建且尚无有效清单，可以完整回收。
                    if not (directory / "project.json").exists():
                        shutil.rmtree(directory)
                    raise
                return project
        except Timeout as exc:
            raise DomainError("项目正在被其他进程保存") from exc

    def save(self, project_id: str, expected_revision: int,
             draft: CharacterProject, *, assets: dict[str, Path] | None = None,
             allow_migration_append: bool = False) -> CharacterProject:
        if draft.id != project_id:
            raise DomainError("项目ID不能修改")
        try:
            with self._lock(project_id):
                directory = self._directory(project_id)
                current = self.load(project_id)
                if expected_revision != current.revision:
                    raise DomainError(
                        f"项目修订冲突：磁盘为{current.revision}，当前编辑基于{expected_revision}"
                    )
                old_action_ids = {action.id for character in current.characters
                                  for action in character.actions}
                new_action_ids = {action.id for character in draft.characters
                                  for action in character.actions}
                removed_action_ids = old_action_ids - new_action_ids
                migrations_after_action_delete = [
                    record for record in current.migrations
                    if record.actionId not in removed_action_ids
                ]
                migration_append = (
                    allow_migration_append and
                    draft.migrations[:len(current.migrations)] == current.migrations and
                    len(draft.migrations) == len(current.migrations) + 1
                )
                migration_action_delete = (
                    bool(removed_action_ids) and
                    draft.migrations == migrations_after_action_delete
                )
                if (draft.migrations != current.migrations and
                        not migration_append and not migration_action_delete):
                    raise DomainError("迁移凭据不能修改或删除")
                next_project = self._revised(current, upgrade_project(draft))
                if next_project is current:
                    return current
                self._install_assets(directory, assets or {})
                try:
                    validate_project_assets(next_project, directory)
                except ValueError as exc:
                    raise DomainError(str(exc)) from exc
                self._write(directory, next_project)
                return next_project
        except Timeout as exc:
            raise DomainError("项目正在被其他进程保存") from exc

    def delete(self, project_id: str, expected_revision: int) -> None:
        """删除完整项目目录；修订不一致时拒绝，避免旧页面误删新版本。"""
        try:
            with self._lock(project_id):
                directory = self._directory(project_id)
                current = self.load(project_id)
                if expected_revision != current.revision:
                    raise DomainError(
                        f"项目修订冲突：磁盘为{current.revision}，当前删除基于{expected_revision}"
                    )
                resolved = directory.resolve(strict=True)
                if resolved.parent != self.root or resolved == self.root:
                    raise DomainError("项目删除路径越界")
                shutil.rmtree(resolved)
        except Timeout as exc:
            raise DomainError("项目正在被其他进程使用，暂时无法删除") from exc

    def export_archive(self, project_id: str) -> Path:
        """生成包含v2中立清单和全部已引用原素材的可移交ZIP，不改写项目目录。"""
        try:
            with self._lock(project_id):
                project = self.load(project_id)
                directory = self._directory(project_id)
                paths: set[str] = set()
                for character in project.characters:
                    if character.referenceImage:
                        paths.add(character.referenceImage)
                    for action in character.actions:
                        if action.source.kind == "video-extraction" and action.source.video:
                            paths.add(action.source.video)
                        for frame in action.frames:
                            paths.add(frame.assets.source)
                            if frame.assets.mattingBase:
                                paths.add(frame.assets.mattingBase)
                            if frame.assets.current:
                                paths.add(frame.assets.current)
                descriptor, filename = tempfile.mkstemp(prefix="action-forge-project-", suffix=".zip")
                os.close(descriptor)
                archive_path = Path(filename)
                try:
                    with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_STORED) as archive:
                        archive.writestr("project.json", project.model_dump_json(indent=2) + "\n")
                        for relative in sorted(paths):
                            archive.write(directory / relative, arcname=relative)
                    with zipfile.ZipFile(archive_path) as archive:
                        if archive.testzip() is not None:
                            raise DomainError("角色资产包校验失败")
                    return archive_path
                except BaseException:
                    archive_path.unlink(missing_ok=True)
                    raise
        except Timeout as exc:
            raise DomainError("项目正在被保存，暂时无法导出") from exc

    def _revised(self, current: CharacterProject,
                 draft: CharacterProject) -> CharacterProject:
        current_data = current.model_dump(mode="python")
        draft_data = draft.model_dump(mode="python")
        if _semantic(current_data) == _semantic(draft_data):
            return current
        old_characters = {item["id"]: item for item in current_data["characters"]}
        for character in draft_data["characters"]:
            old_character = old_characters.get(character["id"])
            if old_character is None:
                character["revision"] = 0
                for action in character["actions"]:
                    action["revision"] = 0
                    for frame in action["frames"]:
                        frame["revision"] = 0
                continue
            old_actions = {item["id"]: item for item in old_character["actions"]}
            for action in character["actions"]:
                old_action = old_actions.get(action["id"])
                if old_action is None:
                    action["revision"] = 0
                    for frame in action["frames"]:
                        frame["revision"] = 0
                    continue
                old_frames = {item["id"]: item for item in old_action["frames"]}
                for frame in action["frames"]:
                    old_frame = old_frames.get(frame["id"])
                    frame["revision"] = (0 if old_frame is None else
                                         old_frame["revision"] + int(
                                             _semantic(frame) != _semantic(old_frame)))
                action["revision"] = old_action["revision"] + int(
                    _semantic(action) != _semantic(old_action))
            character["revision"] = old_character["revision"] + int(
                _semantic(character) != _semantic(old_character))
        draft_data["revision"] = current.revision + 1
        try:
            return CharacterProject.model_validate(draft_data)
        except ValidationError as exc:
            raise DomainError(str(exc)) from exc

    @staticmethod
    def _read(path: Path) -> CharacterProject:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return upgrade_project(CharacterProject.model_validate(data))
        except (OSError, UnicodeError, json.JSONDecodeError, ValidationError) as exc:
            raise DomainError(f"项目清单无效：{exc}") from exc

    @staticmethod
    def _write(directory: Path, project: CharacterProject) -> None:
        manifest = directory / "project.json"
        temp = directory / f"project.json.{uuid.uuid4().hex}.new"
        data = project.model_dump_json(indent=2).encode("utf-8") + b"\n"
        try:
            with temp.open("xb") as target:
                target.write(data)
                target.flush()
                os.fsync(target.fileno())
            os.replace(temp, manifest)
        except BaseException:
            temp.unlink(missing_ok=True)
            raise

    @staticmethod
    def _install_assets(directory: Path, assets: dict[str, Path]) -> None:
        for relative, source in assets.items():
            source = source.resolve(strict=True)
            target = directory / relative
            resolved_parent = target.parent.resolve(strict=False)
            if not resolved_parent.is_relative_to(directory.resolve()) or target.exists():
                if target.is_file() and hashlib.sha256(target.read_bytes()).digest() == hashlib.sha256(source.read_bytes()).digest():
                    continue
                raise DomainError(f"项目素材目标冲突：{relative}")
            target.parent.mkdir(parents=True, exist_ok=True)
            temp = target.with_name(f"{target.name}.{uuid.uuid4().hex}.new")
            try:
                with source.open("rb") as reader, temp.open("xb") as writer:
                    shutil.copyfileobj(reader, writer)
                    writer.flush()
                    os.fsync(writer.fileno())
                os.replace(temp, target)
            finally:
                temp.unlink(missing_ok=True)

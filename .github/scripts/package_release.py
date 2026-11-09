from __future__ import annotations

import json
import shutil
import zipfile
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
RELEASE_DIR = ROOT_DIR / ".release"
PACKAGE_DIR = RELEASE_DIR / "package"
ARTIFACT_DIR = RELEASE_DIR / "artifacts"
LOVELACE_DIR = RELEASE_DIR / "lovelace"


def read_version() -> str:
    manifest_path = ROOT_DIR / "custom_components" / "velair" / "manifest.json"
    with manifest_path.open(encoding="utf-8") as manifest_file:
        return json.load(manifest_file)["version"]


def zip_directory(source_dir: Path, archive_path: Path) -> None:
    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in source_dir.rglob("*"):
            if path.is_file():
                archive.write(path, path.relative_to(source_dir.parent))


def zip_files(files: list[Path], archive_path: Path) -> None:
    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            archive.write(path, path.name)


def ignore_generated_files(_directory: str, names: list[str]) -> set[str]:
    return {
        name
        for name in names
        if name == "__pycache__"
        or name.endswith(".pyc")
        or name in {".DS_Store", "Thumbs.db"}
    }


def prepare_output_directories() -> None:
    """Refresh only owned packaging outputs, preserving other release work."""
    def redirected(path: Path) -> bool:
        return path.is_symlink() or getattr(path, "is_junction", lambda: False)()

    if redirected(RELEASE_DIR) or (RELEASE_DIR.exists() and not RELEASE_DIR.is_dir()):
        raise ValueError("Release output root must be a real directory")
    root = RELEASE_DIR.resolve()
    outputs = ((PACKAGE_DIR, "package"), (ARTIFACT_DIR, "artifacts"), (LOVELACE_DIR, "lovelace"))
    # Validate every target before deleting any output, including on Windows.
    for directory, name in outputs:
        if (redirected(directory) or directory.resolve() != root / name
                or (directory.exists() and not directory.is_dir())):
            raise ValueError(f"Unsafe release packaging output: {directory}")
    for directory, _name in outputs:
        if directory.exists():
            shutil.rmtree(directory)
        directory.mkdir(parents=True)


def main() -> None:
    version = read_version()
    prepare_output_directories()

    component_source = ROOT_DIR / "custom_components" / "velair"
    component_package = PACKAGE_DIR / "velair"
    shutil.copytree(
        component_source,
        component_package,
        ignore=ignore_generated_files,
    )

    zip_directory(
        component_package,
        ARTIFACT_DIR / f"velair-custom-component-{version}.zip",
    )

    lovelace_files = [
        component_source / "frontend" / "velair-card.js",
        component_source / "frontend" / "velair-card.js.map",
    ]
    for path in lovelace_files:
        shutil.copy2(path, LOVELACE_DIR / path.name)

    zip_files(
        [LOVELACE_DIR / path.name for path in lovelace_files],
        ARTIFACT_DIR / f"velair-lovelace-resource-{version}.zip",
    )

    print(f"Created release artifacts in {ARTIFACT_DIR}")


if __name__ == "__main__":
    main()

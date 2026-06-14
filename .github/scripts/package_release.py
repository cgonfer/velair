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


def main() -> None:
    version = read_version()
    if RELEASE_DIR.exists():
        shutil.rmtree(RELEASE_DIR)

    PACKAGE_DIR.mkdir(parents=True)
    ARTIFACT_DIR.mkdir(parents=True)
    LOVELACE_DIR.mkdir(parents=True)

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

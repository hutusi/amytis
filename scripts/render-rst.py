#!/usr/bin/env python3

import argparse
import html
import json
import posixpath
import re
import sys
from pathlib import Path
from typing import Any


CSV_FIELDS = {"tags", "authors", "posts", "redirectfrom"}
BOOLEAN_FIELDS = {"featured", "pinned", "draft", "latex", "toc", "commentable"}
SCALAR_FIELDS = {
    "date",
    "subtitle",
    "excerpt",
    "category",
    "author",
    "layout",
    "series",
    "coverimage",
    "sort",
    "type",
}


class RstRenderError(Exception):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render a single rST file to JSON via docutils.")
    parser.add_argument("--file", required=True, help="Absolute or relative path to the .rst file")
    parser.add_argument(
        "--image-base-slug",
        required=True,
        help="Public-relative base slug for local assets, for example posts/my-post",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Fail on missing local assets instead of reporting them in the output",
    )
    return parser.parse_args()


def normalize_metadata_value(key: str, value: str) -> Any:
    lowered = key.lower()
    stripped = value.strip()

    if lowered in CSV_FIELDS:
        return [part.strip() for part in stripped.split(",") if part.strip()]

    if lowered in BOOLEAN_FIELDS:
        normalized = stripped.lower()
        if normalized == "true":
            return True
        if normalized == "false":
            return False
        raise RstRenderError(f'Invalid boolean for "{key}": {value}')

    if lowered in SCALAR_FIELDS:
        return stripped

    return stripped


def extract_metadata(document: Any) -> dict[str, Any]:
    from docutils import nodes

    metadata: dict[str, Any] = {}

    for child in document.children:
        if isinstance(child, nodes.docinfo):
            for entry in child.children:
                if isinstance(entry, nodes.authors):
                    metadata["authors"] = [author.astext().strip() for author in entry.children if author.astext().strip()]
                    continue
                if isinstance(entry, nodes.author):
                    metadata["author"] = entry.astext().strip()
                    continue

                key = entry.tagname.lower()
                value = entry.astext().strip()
                if value:
                    metadata[key] = normalize_metadata_value(key, value)
            continue

        if isinstance(child, nodes.field_list):
            for field in child.children:
                if not isinstance(field, nodes.field):
                    continue
                name = field.children[0].astext().strip()
                value = field.children[1].astext().strip()
                if not name or not value:
                    continue
                metadata[name] = normalize_metadata_value(name, value)
            continue

        if isinstance(child, nodes.title):
            continue

        break

    if "author" in metadata and "authors" not in metadata:
        metadata["authors"] = [metadata["author"]]

    normalized: dict[str, Any] = {}
    for key, value in metadata.items():
        lowered = key.lower()
        if lowered == "coverimage":
            normalized["coverImage"] = value
        elif lowered == "redirectfrom":
            normalized["redirectFrom"] = value
        else:
            normalized[lowered] = value

    return normalized


def resolve_asset_uri(uri: str, source_file: Path, image_base_slug: str) -> tuple[str, bool]:
    stripped = uri.strip()
    if not stripped:
        return stripped, False

    if stripped.startswith(("http://", "https://", "data:", "mailto:", "#", "/")):
        return stripped, True

    candidate = (source_file.parent / stripped).resolve()
    exists = candidate.exists()

    normalized_base = image_base_slug.strip("/")
    relative_uri = stripped.replace("\\", "/")
    resolved = "/" + posixpath.normpath(posixpath.join(normalized_base, relative_uri)).lstrip("/")
    return resolved, exists


def extract_assets(document: Any, source_file: Path, image_base_slug: str) -> list[dict[str, Any]]:
    from docutils import nodes

    assets: list[dict[str, Any]] = []
    for image in document.findall(nodes.image):
        original = image.get("uri", "").strip()
        if not original:
            continue
        resolved, exists = resolve_asset_uri(original, source_file, image_base_slug)
        assets.append({
            "original": original,
            "resolved": resolved,
            "exists": exists,
        })

    return assets


def rewrite_html_assets(rendered_html: str, assets: list[dict[str, Any]]) -> str:
    rewritten = rendered_html

    for asset in assets:
        original = asset["original"]
        resolved = asset["resolved"]
        escaped_original = re.escape(html.escape(original, quote=True))

        rewritten = re.sub(
            rf'(\s(?:src|href)=["\']){escaped_original}(["\'])',
            rf'\1{html.escape(resolved, quote=True)}\2',
            rewritten,
        )

    return rewritten


def extract_headings(document: Any) -> list[dict[str, Any]]:
    from docutils import nodes

    headings: list[dict[str, Any]] = []
    for section in document.findall(nodes.section):
        title = next((child for child in section.children if isinstance(child, nodes.title)), None)
        if title is None:
            continue

        ids = section.get("ids", [])
        depth = 0
        parent = section.parent
        while parent is not None:
            if isinstance(parent, nodes.section):
                depth += 1
            parent = parent.parent

        headings.append({
            "id": ids[0] if ids else "",
            "text": title.astext().strip(),
            "level": depth + 2,
        })

    return headings


def build_output(document: Any, source: str, source_file: Path, image_base_slug: str) -> dict[str, Any]:
    from docutils import nodes
    from docutils.core import publish_parts

    title_node = next(document.findall(nodes.title), None)
    if title_node is None:
        raise RstRenderError("Missing document title.")

    parts = publish_parts(
        source=source,
        writer_name="html5",
        settings_overrides={
            "embed_stylesheet": False,
            "stylesheet_path": None,
            "initial_header_level": 2,
            "report_level": 2,
            "halt_level": 5,
        },
    )

    assets = extract_assets(document, source_file, image_base_slug)
    html_body = parts.get("html_body", "").strip() or parts.get("fragment", "").strip()

    return {
        "title": title_node.astext().strip(),
        "html": rewrite_html_assets(html_body, assets),
        "text": document.astext().strip(),
        "headings": extract_headings(document),
        "metadata": extract_metadata(document),
        "assets": assets,
        "warnings": [],
    }


def main() -> int:
    args = parse_args()
    source_file = Path(args.file).expanduser()
    if not source_file.is_absolute():
        source_file = (Path.cwd() / source_file).resolve()

    if not source_file.exists():
        print(f"rST file not found: {source_file}", file=sys.stderr)
        return 1

    try:
        from docutils.core import publish_doctree
    except ImportError:
        print(
            "Missing Python dependency: docutils. Install it with `python3 -m pip install docutils`.",
            file=sys.stderr,
        )
        return 1

    try:
        source = source_file.read_text(encoding="utf-8")
        document = publish_doctree(
            source=source,
            settings_overrides={
                "report_level": 2,
                "halt_level": 5,
                "file_insertion_enabled": False,
                "raw_enabled": False,
            },
        )
        output = build_output(document, source, source_file, args.image_base_slug)

        if args.strict:
            missing = [asset for asset in output["assets"] if not asset["exists"]]
            if missing:
                first = missing[0]
                raise RstRenderError(
                    f'Missing local asset "{first["original"]}" in {source_file}'
                )

        print(json.dumps(output, ensure_ascii=False))
        return 0
    except RstRenderError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Failed to render {source_file}: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3

from __future__ import annotations

import argparse
import copy
import html
import json
import posixpath
import re
import sys
from contextlib import contextmanager
from html.parser import HTMLParser
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
LEGACY_DOC_ROLE_BOUNDARY = "__AMYTIS_RST_DOC_ROLE_BOUNDARY__"
LEGACY_DOC_ROLE_BOUNDARY_WITH_SPACE = f"{LEGACY_DOC_ROLE_BOUNDARY} "


class RstRenderError(Exception):
    pass


class BodyFragmentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self._target: str | None = None
        self._depth = 0
        self._fragments: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self._target is None and tag in {"main", "body"}:
            self._target = tag
            self._depth = 1
            return

        if self._target is not None:
            self._depth += 1
            starttag_text = self.get_starttag_text()
            if starttag_text is not None:
                self._fragments.append(starttag_text)

    def handle_endtag(self, tag: str) -> None:
        if self._target is None:
            return

        if self._depth == 1 and tag == self._target:
            self._target = None
            self._depth = 0
            return

        self._depth -= 1
        self._fragments.append(f"</{tag}>")

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self._target is not None:
            starttag_text = self.get_starttag_text()
            if starttag_text is not None:
                self._fragments.append(starttag_text)

    def handle_data(self, data: str) -> None:
        if self._target is not None:
            self._fragments.append(data)

    def handle_comment(self, data: str) -> None:
        if self._target is not None:
            self._fragments.append(f"<!--{data}-->")

    def handle_entityref(self, name: str) -> None:
        if self._target is not None:
            self._fragments.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        if self._target is not None:
            self._fragments.append(f"&#{name};")

    def handle_decl(self, decl: str) -> None:
        if self._target is not None:
            self._fragments.append(f"<!{decl}>")

    def get_fragment(self) -> str:
        return "".join(self._fragments).strip()


def detect_series_root(source_file: Path) -> Path | None:
    parts = source_file.resolve().parts
    try:
        series_index = parts.index("series")
    except ValueError:
        return None

    if series_index + 1 >= len(parts):
        return None

    return Path(*parts[: series_index + 2])


def slug_from_doc_path(doc_path: Path) -> str:
    if doc_path.name in {"index.rst", "README.rst"}:
        return doc_path.parent.name
    return doc_path.stem


def resolve_doc_target_path(source_file: Path, target: str) -> Path | None:
    candidate_base = (source_file.parent / target).resolve()
    candidate_rst = candidate_base if candidate_base.suffix == ".rst" else candidate_base.parent / f"{candidate_base.name}.rst"
    candidate_paths = [
        candidate_rst,
        candidate_base / "index.rst",
        candidate_base / "README.rst",
    ]

    for candidate in candidate_paths:
        if candidate.exists():
            return candidate

    return None


def resolve_doc_target_uri(source_file: Path, target: str) -> str | None:
    target_path = resolve_doc_target_path(source_file, target)
    if target_path is None:
        return None

    series_root = detect_series_root(target_path)
    if series_root is None:
        return None

    series_slug = series_root.name
    slug = slug_from_doc_path(target_path)
    return f"/{series_slug}/{slug}"


def register_doc_role(source_file: Path, warnings: list[str]) -> None:
    from docutils import nodes
    from docutils.parsers.rst import roles

    def doc_role(  # type: ignore[override]
        _name: str,
        rawtext: str,
        text: str,
        _lineno: int,
        _inliner: Any,
        _options: dict[str, Any] | None = None,
        _content: list[str] | None = None,
    ) -> tuple[list[Any], list[Any]]:
        label = None
        target = text.strip()
        match = re.match(r"(.+?)\s*<(.+)>$", target)
        if match:
            label = match.group(1).strip()
            target = match.group(2).strip()

        refuri = resolve_doc_target_uri(source_file, target)
        if refuri is None:
            warnings.append(f'Unresolved :doc: target "{target}" in {source_file}')
            display_text = label or target.split("/")[-1]
            return [nodes.literal(rawtext, display_text)], []

        display_text = label or target.split("/")[-1]
        return [nodes.reference(rawtext, display_text, refuri=refuri)], []

    roles.register_canonical_role("doc", doc_role)


def register_passthrough_roles(warnings: list[str]) -> None:
    from docutils import nodes
    from docutils.parsers.rst import roles

    def parse_role_target(text: str) -> tuple[str | None, str]:
        target = text.strip()
        match = re.match(r"(.+?)\s*<(.+)>$", target)
        if match:
            return match.group(1).strip(), match.group(2).strip()
        return None, target

    def normalize_internal_ref(target: str) -> str:
        cleaned = target.strip().strip("`")
        cleaned = cleaned.replace("_", "-")
        cleaned = re.sub(r"\s+", "-", cleaned)
        return cleaned

    def resolve_named_refid(inliner: Any, target: str) -> str | None:
        document = getattr(inliner, "document", None)
        if document is None:
            return None

        nameids = getattr(document, "nameids", {})
        refid = nameids.get(target)
        if isinstance(refid, str) and refid:
            return refid
        return None

    def make_passthrough_role(role_name: str):
        def passthrough_role(  # type: ignore[override]
            _name: str,
            rawtext: str,
            text: str,
            _lineno: int,
            _inliner: Any,
            _options: dict[str, Any] | None = None,
            _content: list[str] | None = None,
        ) -> tuple[list[Any], list[Any]]:
            warnings.append(f'Unsupported interpreted text role ":{role_name}:" rendered as plain inline text.')
            return [nodes.inline(rawtext, text, classes=[role_name])], []

        return passthrough_role

    def ref_role(  # type: ignore[override]
        _name: str,
        rawtext: str,
        text: str,
        _lineno: int,
        _inliner: Any,
        _options: dict[str, Any] | None = None,
        _content: list[str] | None = None,
    ) -> tuple[list[Any], list[Any]]:
        label, target = parse_role_target(text)
        display_text = label or target
        refid = resolve_named_refid(_inliner, target) or normalize_internal_ref(target)
        return [nodes.reference(rawtext, display_text, refuri=f"#{refid}")], []

    def numref_role(  # type: ignore[override]
        _name: str,
        rawtext: str,
        text: str,
        _lineno: int,
        _inliner: Any,
        _options: dict[str, Any] | None = None,
        _content: list[str] | None = None,
    ) -> tuple[list[Any], list[Any]]:
        label, target = parse_role_target(text)
        display_text = target if label and "%s" in label else (label or target)
        refid = resolve_named_refid(_inliner, target)
        if refid is not None:
            return [nodes.reference(rawtext, display_text, refuri=f"#{refid}", classes=["numref"])], []

        warnings.append('Unsupported interpreted text role ":numref:" rendered as plain inline text.')
        return [nodes.inline(rawtext, display_text, classes=["numref"])], []

    for role_name in ("dtag",):
        roles.register_canonical_role(role_name, make_passthrough_role(role_name))
    roles.register_canonical_role("ref", ref_role)
    roles.register_canonical_role("numref", numref_role)


@contextmanager
def temporary_role_overrides(source_file: Path, warnings: list[str]):
    from docutils.parsers.rst import roles

    if not hasattr(roles, "_role_registry") or not hasattr(roles, "_roles"):
        raise RstRenderError(
            "Incompatible docutils roles registry layout. Expected _role_registry and _roles "
            "attributes for temporary role overrides."
        )

    tracked_names = ("doc", "dtag", "ref", "numref")
    previous_registry = {name: roles._role_registry.get(name) for name in tracked_names}
    previous_local = {name: roles._roles.get(name) for name in tracked_names}

    register_doc_role(source_file, warnings)
    register_passthrough_roles(warnings)

    try:
        yield
    finally:
        for name, role_fn in previous_registry.items():
            if role_fn is None:
                roles._role_registry.pop(name, None)
            else:
                roles._role_registry[name] = role_fn

        for name, role_fn in previous_local.items():
            if role_fn is None:
                roles._roles.pop(name, None)
            else:
                roles._roles[name] = role_fn


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render a single rST file to JSON via docutils.")
    parser.add_argument("--file", help="Absolute or relative path to the .rst file")
    parser.add_argument(
        "--image-base-slug",
        help="Public-relative base slug for local assets, for example posts/my-post",
    )
    parser.add_argument(
        "--batch-stdin",
        action="store_true",
        help="Read a JSON array of batch render entries from stdin",
    )
    parser.add_argument(
        "--batch-file",
        help="Read a JSON array of batch render entries from a file",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Fail on missing local assets instead of reporting them in the output",
    )
    args = parser.parse_args()

    if args.batch_stdin or args.batch_file:
        if args.batch_stdin and args.batch_file:
            parser.error("--batch-stdin and --batch-file cannot be combined")
        if args.file or args.image_base_slug:
            parser.error("--batch-stdin/--batch-file cannot be combined with --file or --image-base-slug")
        return args

    if not args.file or not args.image_base_slug:
        parser.error("--file and --image-base-slug are required unless --batch-stdin is used")

    return args


def resolve_source_file(raw_file: str) -> Path:
    source_file = Path(raw_file).expanduser()
    if not source_file.is_absolute():
        source_file = Path.cwd() / source_file
    return source_file.resolve()


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


def normalize_legacy_doc_role_syntax(source: str) -> str:
    if LEGACY_DOC_ROLE_BOUNDARY in source or LEGACY_DOC_ROLE_BOUNDARY_WITH_SPACE in source:
        raise RstRenderError(
            f'Source already contains reserved legacy :doc: boundary marker "{LEGACY_DOC_ROLE_BOUNDARY}".'
        )

    return re.sub(
        r"(?<![\s\\(\[{<])(:doc:`[^`\n]+`)",
        LEGACY_DOC_ROLE_BOUNDARY_WITH_SPACE + r"\1",
        source,
    )


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
                if isinstance(entry, nodes.field) and len(entry.children) >= 2:
                    name = entry.children[0].astext().strip()
                    value = entry.children[1].astext().strip()
                    if name and value:
                        metadata[name] = normalize_metadata_value(name, value)
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


def extract_body_text(document: Any) -> str:
    from docutils import nodes

    body_tree = copy.deepcopy(document)
    for node in list(body_tree.findall(nodes.system_message)):
        parent = node.parent
        if parent is not None:
            parent.remove(node)

    for node in list(body_tree.findall(nodes.footnote)):
        parent = node.parent
        if parent is not None:
            parent.remove(node)

    for node in list(body_tree.findall(nodes.footnote_reference)):
        parent = node.parent
        if parent is not None:
            parent.remove(node)

    body_parts: list[str] = []
    for child in body_tree.children:
        if isinstance(child, (nodes.docinfo, nodes.field_list, nodes.comment, nodes.title, nodes.system_message, nodes.footnote)):
            continue
        if child.tagname == "footnote_list":
            continue
        text = child.astext().strip()
        if text:
            body_parts.append(text)

    return "\n\n".join(body_parts).replace(LEGACY_DOC_ROLE_BOUNDARY_WITH_SPACE, "").replace(LEGACY_DOC_ROLE_BOUNDARY, "").strip()


def remove_system_messages(document: Any) -> None:
    from docutils import nodes

    for node in list(document.findall(nodes.system_message)):
        parent = node.parent
        if parent is not None:
            parent.remove(node)


def strip_preamble_nodes(document: Any) -> Any:
    from docutils import nodes

    stripped = copy.deepcopy(document)
    for child in list(stripped.children):
        if isinstance(child, (nodes.docinfo, nodes.field_list, nodes.comment)):
            stripped.remove(child)
            continue
        if isinstance(child, nodes.title):
            continue
        break

    return stripped


def extract_html_body_from_doctree(document: Any) -> str:
    from docutils.core import publish_from_doctree

    rendered = publish_from_doctree(
        document,
        writer_name="html5",
        settings_overrides={
            "embed_stylesheet": False,
            "stylesheet_path": None,
            "output_encoding": "unicode",
            "initial_header_level": 2,
            "report_level": 2,
            "halt_level": 5,
            "file_insertion_enabled": False,
            "raw_enabled": False,
        },
    )

    parser = BodyFragmentParser()
    parser.feed(rendered)
    html_fragment = parser.get_fragment()
    if not html_fragment:
        raise RstRenderError("Docutils HTML output did not contain a <main> or <body> fragment.")

    return html_fragment.replace(LEGACY_DOC_ROLE_BOUNDARY_WITH_SPACE, "").replace(LEGACY_DOC_ROLE_BOUNDARY, "")


def build_output(document: Any, source_file: Path, image_base_slug: str, warnings: list[str]) -> dict[str, Any]:
    from docutils import nodes

    title_node = next(document.findall(nodes.title), None)
    if title_node is None:
        raise RstRenderError("Missing document title.")

    assets = extract_assets(document, source_file, image_base_slug)
    html_body = extract_html_body_from_doctree(strip_preamble_nodes(document))

    return {
        "title": title_node.astext().strip(),
        "html": rewrite_html_assets(html_body, assets),
        "text": extract_body_text(document),
        "headings": extract_headings(document),
        "metadata": extract_metadata(document),
        "assets": assets,
        "warnings": list(dict.fromkeys(warnings)),
    }


def render_single_file(source_file: Path, image_base_slug: str, strict: bool) -> dict[str, Any]:
    from docutils.core import publish_doctree

    warnings: list[str] = []
    source = normalize_legacy_doc_role_syntax(source_file.read_text(encoding="utf-8"))
    with temporary_role_overrides(source_file, warnings):
        document = publish_doctree(
            source=source,
            settings_overrides={
                "report_level": 2,
                "halt_level": 5,
                "file_insertion_enabled": False,
                "raw_enabled": False,
            },
        )
    remove_system_messages(document)
    output = build_output(document, source_file, image_base_slug, warnings)

    if strict:
        missing = [asset for asset in output["assets"] if not asset["exists"]]
        if missing:
            first = missing[0]
            raise RstRenderError(
                f'Missing local asset "{first["original"]}" in {source_file}'
            )

    return output


def render_batch(raw_input: str, strict: bool) -> list[dict[str, Any]]:
    try:
        entries = json.loads(raw_input)
    except json.JSONDecodeError as exc:
        raise RstRenderError(f"Invalid batch JSON: {exc.msg}") from exc

    if not isinstance(entries, list):
        raise RstRenderError("Invalid batch JSON: expected an array.")

    results: list[dict[str, Any]] = []
    for entry in entries:
        if not isinstance(entry, dict):
            raise RstRenderError("Invalid batch entry: expected an object.")

        raw_file = entry.get("file")
        image_base_slug = entry.get("imageBaseSlug")
        if not isinstance(raw_file, str) or not isinstance(image_base_slug, str):
            raise RstRenderError("Invalid batch entry: missing file or imageBaseSlug.")

        source_file = resolve_source_file(raw_file)
        if not source_file.exists():
            raise RstRenderError(f"rST file not found: {source_file}")

        output = render_single_file(source_file, image_base_slug, strict)
        results.append({
            "file": str(source_file),
            "ok": True,
            "result": output,
        })

    return results


def main() -> int:
    args = parse_args()
    source_file: Path | None = None

    try:
        from docutils.core import publish_doctree  # noqa: F401
    except ImportError:
        print(
            "Missing Python dependency: docutils. Install it with `python3 -m pip install docutils`.",
            file=sys.stderr,
        )
        return 1

    try:
        if args.batch_stdin or args.batch_file:
            if args.batch_file:
                raw_batch_input = Path(args.batch_file).read_text(encoding="utf-8")
            else:
                raw_batch_input = sys.stdin.read()
            print(json.dumps(render_batch(raw_batch_input, args.strict), ensure_ascii=False))
            return 0

        source_file = resolve_source_file(args.file)
        if not source_file.exists():
            print(f"rST file not found: {source_file}", file=sys.stderr)
            return 1

        print(json.dumps(render_single_file(source_file, args.image_base_slug, args.strict), ensure_ascii=False))
        return 0
    except RstRenderError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except (OSError, ValueError, KeyError, AttributeError) as exc:
        if source_file is not None:
            print(f"Failed to render {source_file}: {exc}", file=sys.stderr)
        else:
            print(f"Failed to render: {exc}", file=sys.stderr)
        return 1
    except Exception:
        raise


if __name__ == "__main__":
    sys.exit(main())

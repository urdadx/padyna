import argparse
import sys

from markitdown import MarkItDown


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert a local document to Markdown.")
    parser.add_argument("path", help="Path to the local file to convert")
    args = parser.parse_args()

    converter = MarkItDown(enable_plugins=False)
    result = converter.convert_local(args.path)
    content = (result.text_content or "").strip()

    if not content:
        print("MarkItDown returned no content", file=sys.stderr)
        return 2

    print(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

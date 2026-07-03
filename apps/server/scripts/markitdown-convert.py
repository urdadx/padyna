import argparse
import sys

from markitdown import MarkItDown


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert a local document or URL to Markdown.")
    parser.add_argument("input", help="Path or URL to convert")
    parser.add_argument(
        "--url",
        action="store_true",
        help="Treat input as a URL. Only call this with trusted, prevalidated URLs.",
    )
    args = parser.parse_args()

    converter = MarkItDown(enable_plugins=False)
    result = converter.convert_url(args.input) if args.url else converter.convert_local(args.input)
    content = (result.text_content or "").strip()

    if not content:
        print("MarkItDown returned no content", file=sys.stderr)
        return 2

    print(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

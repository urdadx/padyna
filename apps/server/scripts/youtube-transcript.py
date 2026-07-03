import argparse
import html
import re
import sys
import tempfile
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from yt_dlp import YoutubeDL


class QuietLogger:
    def debug(self, message: str) -> None:
        return None

    def warning(self, message: str) -> None:
        print(message, file=sys.stderr)

    def error(self, message: str) -> None:
        print(message, file=sys.stderr)


def get_video_id(value: str) -> str | None:
    parsed = urlparse(value)
    host = parsed.hostname or ""
    host = host.lower().removeprefix("www.")

    if host == "youtu.be":
        video_id = parsed.path.strip("/").split("/")[0]
        return video_id or None

    if host in {"youtube.com", "m.youtube.com"}:
        if parsed.path == "/watch":
            video_id = parse_qs(parsed.query).get("v", [None])[0]
            return video_id or None

        match = re.match(r"^/(embed|shorts)/([^/?#]+)", parsed.path)
        if match:
            return match.group(2)

    return None


def clean_vtt_line(line: str) -> str:
    line = re.sub(r"<\d{2}:\d{2}:\d{2}\.\d{3}>", "", line)
    line = re.sub(r"</?c(?:\.[^>]*)?>", "", line)
    line = re.sub(r"<[^>]+>", "", line)
    return html.unescape(line).strip()


def vtt_to_markdown(path: Path) -> str:
    lines: list[str] = []
    previous = ""

    for raw_line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw_line.strip()

        if (
            not line
            or line == "WEBVTT"
            or line.startswith("Kind:")
            or line.startswith("Language:")
            or "-->" in line
            or line.startswith("NOTE")
        ):
            continue

        cleaned = clean_vtt_line(line)
        if cleaned and cleaned != previous:
            lines.append(cleaned)
            previous = cleaned

    return "\n\n".join(lines).strip()


def fetch_subtitle_markdown(url: str, language: str) -> str | None:
    with tempfile.TemporaryDirectory(prefix="padyna-youtube-") as temp_dir:
        temp_path = Path(temp_dir)
        options = {
            "quiet": True,
            "no_warnings": True,
            "noprogress": True,
            "logger": QuietLogger(),
            "skip_download": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": [language],
            "subtitlesformat": "vtt",
            "outtmpl": str(temp_path / "%(id)s.%(ext)s"),
        }

        with YoutubeDL(options) as ydl:
            ydl.download([url])

        subtitle_files = sorted(temp_path.glob(f"*.{language}.vtt"))
        if not subtitle_files:
            subtitle_files = sorted(temp_path.glob("*.vtt"))

        if not subtitle_files:
            return None

        return vtt_to_markdown(subtitle_files[0])


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch YouTube subtitles as Markdown.")
    parser.add_argument("url", help="YouTube URL")
    args = parser.parse_args()

    if not get_video_id(args.url):
        print("Invalid YouTube URL", file=sys.stderr)
        return 2

    languages = ["en"]
    content = ""

    try:
        for language in languages:
            content = fetch_subtitle_markdown(args.url, language) or ""
            if content:
                break

        if not content:
            print("No English subtitles found for this YouTube video", file=sys.stderr)
            return 3
    except Exception as error:
        print(f"Failed to fetch YouTube subtitles with yt-dlp: {error}", file=sys.stderr)
        return 4

    if not content:
        print("YouTube subtitles returned no content", file=sys.stderr)
        return 5

    print(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

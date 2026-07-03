import argparse
import os
import re
import sys
from urllib.parse import parse_qs, urlparse

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig


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


def get_proxy_config():
    http_proxy = os.getenv("YOUTUBE_PROXY_HTTP")
    https_proxy = os.getenv("YOUTUBE_PROXY_HTTPS")

    if http_proxy or https_proxy:
        return GenericProxyConfig(http_url=http_proxy, https_url=https_proxy)

    return None


def get_languages() -> tuple[str, ...]:
    value = os.getenv("YOUTUBE_TRANSCRIPT_LANGUAGES", "en")
    languages = tuple(language.strip() for language in value.split(",") if language.strip())
    return languages or ("en",)


def fetch_transcript(video_id: str) -> list[str]:
    api = YouTubeTranscriptApi(proxy_config=get_proxy_config())
    languages = get_languages()

    try:
        transcript = api.fetch(video_id, languages=languages)
    except Exception:
        transcript_list = api.list(video_id)
        transcript = transcript_list.find_transcript(list(languages)).fetch()

    lines: list[str] = []
    for snippet in transcript:
        text = snippet.text.strip()
        if text:
            lines.append(text)
    return lines


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch a YouTube transcript as Markdown.")
    parser.add_argument("url", help="YouTube URL")
    args = parser.parse_args()

    video_id = get_video_id(args.url)
    if not video_id:
        print("Invalid YouTube URL", file=sys.stderr)
        return 2

    try:
        lines = fetch_transcript(video_id)
    except Exception as error:
        print(f"Failed to fetch YouTube transcript: {error}", file=sys.stderr)
        return 3

    content = "\n\n".join(lines).strip()
    if not content:
        print("YouTube transcript returned no content", file=sys.stderr)
        return 4

    print(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

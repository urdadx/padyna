# Feature Video Posters

Real first frames from the existing feature demos, extracted with FFmpeg. Only
the optimized WebP posters are shipped; downloaded MP4s remain outside the repo.

| Poster                   | Source                                                  |
| ------------------------ | ------------------------------------------------------- |
| `playground-poster.webp` | `https://assets.padyna.com/assets/playground_long.mp4`  |
| `actions-poster.webp`    | `https://assets.padyna.com/assets/padyna_action.mp4`    |
| `analytics-poster.webp`  | `https://assets.padyna.com/assets/padyna-analytics.mp4` |
| `activity-poster.webp`   | `https://assets.padyna.com/assets/padyna-activity.mp4`  |

Extraction settings (1440px wide, WebP quality 82):

```sh
ffmpeg -ss 0 -i /tmp/opencode/feature-playground.mp4 -frames:v 1 \
  -vf "scale=1440:-2" -c:v libwebp -quality 82 -compression_level 6 \
  apps/marketing/src/assets/features/playground-poster.webp
```

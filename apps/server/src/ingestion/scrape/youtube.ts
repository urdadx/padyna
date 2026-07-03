import { join } from "node:path";

const YOUTUBE_TRANSCRIPT_TIMEOUT_MS = 30_000;
const YOUTUBE_METADATA_TIMEOUT_MS = 5_000;
const DEFAULT_MARKITDOWN_PYTHON = join(process.cwd(), ".venv", "bin", "python");

function normalizeHost(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function isYouTubeUrl(value: string) {
  try {
    const url = new URL(value);
    const host = normalizeHost(url.hostname);
    return host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be";
  } catch {
    return false;
  }
}

export async function fetchYouTubeTitle(url: string): Promise<string | null> {
  if (!isYouTubeUrl(url)) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), YOUTUBE_METADATA_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { title?: unknown };
    return typeof data.title === "string" && data.title.trim() ? data.title.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForProcess(
  proc: ReturnType<typeof Bun.spawn>,
  timeoutMs: number,
): Promise<number> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      proc.exited,
      new Promise<number>((_, reject) => {
        timeout = setTimeout(() => {
          proc.kill();
          reject(new Error(`YouTube transcript fetch timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function convertYouTubeWithMarkItDown(url: string): Promise<string | null> {
  if (!isYouTubeUrl(url)) {
    return null;
  }

  const pythonPath = process.env.MARKITDOWN_PYTHON || DEFAULT_MARKITDOWN_PYTHON;
  const scriptPath = join(process.cwd(), "scripts", "youtube-transcript.py");

  try {
    const proc = Bun.spawn([pythonPath, scriptPath, url], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [exitCode, stdout, stderr] = await Promise.all([
      waitForProcess(proc, YOUTUBE_TRANSCRIPT_TIMEOUT_MS),
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const content = stdout.trim();

    if (exitCode !== 0 || !content) {
      console.warn(
        `YouTube transcript fetch failed for ${url}: ${stderr.trim() || `exit code ${exitCode}`}`,
      );
      return null;
    }

    console.info(`Fetched YouTube transcript for ${url} (${content.length} chars)`);
    console.info(
      `--- YouTube transcript markdown start: ${url} ---\n${content}\n--- YouTube transcript markdown end: ${url} ---`,
    );
    return content;
  } catch (error) {
    console.warn(
      `YouTube transcript fetch failed for ${url}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

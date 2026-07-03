import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { extname, join } from "node:path";
import { tmpdir } from "node:os";

const MARKITDOWN_TIMEOUT_MS = 30_000;

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
          reject(new Error(`MarkItDown conversion timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function convertFileWithMarkItDown(file: File): Promise<string | null> {
  const extension = extname(file.name).toLowerCase();
  const tempDir = join(tmpdir(), "padyna-markitdown");
  const tempPath = join(tempDir, `${randomUUID()}${extension}`);
  const scriptPath = join(process.cwd(), "scripts", "markitdown-convert.py");

  await mkdir(tempDir, { recursive: true });

  try {
    await Bun.write(tempPath, file);

    const proc = Bun.spawn(["uv", "run", "python", scriptPath, tempPath], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [exitCode, stdout, stderr] = await Promise.all([
      waitForProcess(proc, MARKITDOWN_TIMEOUT_MS),
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const content = stdout.trim();

    if (exitCode !== 0 || !content) {
      console.warn(
        `MarkItDown failed for ${file.name}: ${stderr.trim() || `exit code ${exitCode}`}`,
      );
      return null;
    }

    console.info(`MarkItDown converted ${file.name} (${content.length} chars)`);
    return content;
  } catch (error) {
    console.warn(
      `MarkItDown failed for ${file.name}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  } finally {
    await rm(tempPath, { force: true });
  }
}

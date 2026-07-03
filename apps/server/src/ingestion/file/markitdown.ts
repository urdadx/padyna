import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { extname, join } from "node:path";
import { tmpdir } from "node:os";

const MARKITDOWN_TIMEOUT_MS = 30_000;
const DEFAULT_MARKITDOWN_PYTHON = join(process.cwd(), ".venv", "bin", "python");

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

async function runConverter(pythonPath: string, scriptPath: string, tempPath: string) {
  const proc = Bun.spawn([pythonPath, scriptPath, tempPath], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
  });

  const [exitCode, stdout, stderr] = await Promise.all([
    waitForProcess(proc, MARKITDOWN_TIMEOUT_MS),
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  return {
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  };
}

export async function convertFileWithMarkItDown(file: File): Promise<string | null> {
  const extension = extname(file.name).toLowerCase();
  const tempDir = join(tmpdir(), "padyna-markitdown");
  const tempPath = join(tempDir, `${randomUUID()}${extension}`);
  const scriptPath = join(process.cwd(), "scripts", "markitdown-convert.py");

  await mkdir(tempDir, { recursive: true });

  try {
    await Bun.write(tempPath, file);
    const pythonPath = process.env.MARKITDOWN_PYTHON || DEFAULT_MARKITDOWN_PYTHON;
    const result = await runConverter(pythonPath, scriptPath, tempPath);

    if (result.exitCode === 0 && result.stdout) {
      console.info(
        `MarkItDown converted ${file.name} using ${pythonPath} (${result.stdout.length} chars)`,
      );
      return result.stdout;
    }

    console.warn(
      `MarkItDown failed for ${file.name}: ${result.stderr || `exit code ${result.exitCode}`}`,
    );
    return null;
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

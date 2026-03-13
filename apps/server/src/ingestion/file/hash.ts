import { createHash } from "node:crypto";

function bufferToHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashFile(file: File) {
  const buffer = await file.arrayBuffer();
  const digestBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return bufferToHex(digestBuffer);
}

export function hashText(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

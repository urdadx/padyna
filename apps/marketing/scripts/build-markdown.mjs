// Writes a Markdown copy of each built page (dist/**/index.html -> index.md), which nginx serves
// to requests with `Accept: text/markdown` (see docker/nginx/marketing.conf). Agents read it more
// cheaply and reliably than the HTML.
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NodeHtmlMarkdown } from "node-html-markdown";

const DIST = new URL("../dist/", import.meta.url).pathname;

// Markup with no readable text for an agent.
const NOISE =
  /<(script|style|svg|video|noscript|iframe|template|button|header)\b[\s\S]*?<\/\1>|<a class="skip-link"[\s\S]*?<\/a>/gi;

async function pages(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await pages(path)));
    else if (entry.name === "index.html") found.push(path);
  }
  return found;
}

const markdown = new NodeHtmlMarkdown({
  ignore: ["nav", "form"],
  maxConsecutiveNewlines: 2,
});

for (const file of await pages(DIST)) {
  const html = await readFile(file, "utf8");
  const title =
    html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "Padyna";
  const description =
    html.match(/<meta name="description" content="([^"]*)"/i)?.[1] ?? "";
  const body = (
    html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html
  ).replace(NOISE, "");
  const text = markdown
    .translate(body)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const header = `# ${title}\n\n${description ? `> ${description}\n\n` : ""}`;
  await writeFile(file.replace(/\.html$/, ".md"), `${header}${text}\n`);
  console.log(`markdown: ${file.slice(DIST.length)} -> ${text.length} chars`);
}

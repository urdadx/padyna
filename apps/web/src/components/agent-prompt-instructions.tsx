import { useState } from "react";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { env } from "@padyna/env/web";
import { RobotIcon } from "@/assets/icons/robot";
import { Button } from "./ui/button";
import {
  CodeBlock,
  CodeBlockBody,
  CodeBlockContent,
  CodeBlockFilename,
  CodeBlockFiles,
  CodeBlockHeader,
  CodeBlockItem,
  type BundledLanguage,
} from "./ai-elements/code-block";

export const AgentPromptInstructions = ({
  chatbot,
  onClose,
}: {
  chatbot: { embedToken: string | null };
  onClose?: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const sdkUrl = `${env.VITE_FRONTEND_ORIGIN}/sdk.js`;
  const snippet = chatbot.embedToken
    ? `<script>
(function(w,d){if(w.self!==w.top) return;
if(w.location.pathname==="/widget") return;
if(typeof w.Padyna!=="function"){
  var q=[];
  var stub=function(){q.push(arguments)};
  stub.q=q;
  w.Padyna=stub;
}
var s=d.createElement("script");
s.src="${sdkUrl}";
s.async=true;
d.head.appendChild(s);
})(window,document);
</script>
<script>
if(window.self===window.top&&window.location.pathname!=="/widget"){
  window.Padyna("init",{widgetId:"${chatbot.embedToken}"});
}
</script>`
    : "";
  const prompt = chatbot.embedToken
    ? `You are installing the Padyna customer support agent widget in this codebase.

Goal: Make the Padyna agent available on public website pages using the SDK snippet below. Adapt its placement to the framework and routing structure.

Requirements:
1. Inspect the existing app and mount the integration once in the public app shell, root layout, or document footer. If Padyna is already installed, update that integration rather than adding another.
2. Do not initialize inside an iframe or on the /widget route.
3. Load ${sdkUrl} asynchronously, only once, and initialize window.Padyna("init", { widgetId: "${chatbot.embedToken}" }). Do not change the widget ID or SDK URL.
4. In server-rendered apps, access window and document only in the browser. Use a small client-side component or hook where appropriate.
5. Preserve existing routing, hydration, styling, and analytics. In frameworks with component unmounting, clean up the integration appropriately if the SDK supports it.
6. Verify the SDK loads and the Padyna widget appears on public pages without duplicate scripts or initialization.

SDK snippet for static HTML (place before the closing </body> tag):

\`\`\`html
${snippet}
\`\`\`

For React, Next.js, Vue, Nuxt, Svelte, Astro, or similar frameworks, adapt the snippet to the smallest appropriate client-side integration. Keep the iframe and /widget guards.`
    : "Select an agent with a widget ID before copying this prompt.";

  const handleCopy = async () => {
    if (!chatbot.embedToken) return;
    await navigator.clipboard.writeText(prompt);
    toast.success("Copied to clipboard");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-w-0 flex-1 p-2 onboarding-height overflow-hidden">
      <div className="h-full min-w-0 rounded-xl bg-white dark:bg-gray-950 overflow-hidden shadow-xs border dark:border-gray-800">
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto p-8 scrollbar-hide">
          <div className="flex items-start justify-between">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Instructions for AI agent
            </h3>
            <Button
              size="icon"
              variant="outline"
              className="text-gray-400 hidden sm:flex hover:text-gray-500 rounded-full"
              onClick={onClose}
            >
              <XIcon />
            </Button>
          </div>
          <p className="max-w-md text-pretty text-sm text-gray-600 dark:text-gray-400">
            Copy this prompt into your coding agent to install Padyna on your website.
          </p>
          <div className="flex items-center justify-between gap-3 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <RobotIcon className="size-5 text-red-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                AI coding agent prompt
              </span>
            </div>
            <Button variant="outline" size="sm" disabled={!chatbot.embedToken} onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="grid w-full min-w-0 overflow-hidden">
            <CodeBlock
              data={[{ code: prompt, language: "markdown", filename: "prompt.md" }]}
              defaultValue="markdown"
            >
              <CodeBlockHeader>
                <CodeBlockFiles>
                  {(item) => (
                    <CodeBlockFilename key={item.language} value={item.language}>
                      {item.filename}
                    </CodeBlockFilename>
                  )}
                </CodeBlockFiles>
              </CodeBlockHeader>
              <CodeBlockBody className="h-80 overflow-y-auto hide-scrollbar">
                {(item) => (
                  <CodeBlockItem key={item.language} value={item.language}>
                    <CodeBlockContent language={item.language as BundledLanguage}>
                      {item.code}
                    </CodeBlockContent>
                  </CodeBlockItem>
                )}
              </CodeBlockBody>
            </CodeBlock>
          </div>
        </div>
      </div>
    </div>
  );
};

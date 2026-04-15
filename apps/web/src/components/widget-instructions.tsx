import { XIcon } from "lucide-react";
import { Button } from "./ui/button";
import { WidgetIcon } from "@/assets/icons/widget-icon";
import { env } from "@padyna/env/web";
import { toast } from "sonner";
import { useState } from "react";
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
import { ReactIcon } from "@/assets/icons/react-icon";

interface Chatbot {
	embedToken: string | null;
}

interface WidgetInstructionsProps {
	chatbot: Chatbot;
	onClose?: () => void;
}

export const WidgetInstructions = ({ chatbot, onClose }: WidgetInstructionsProps) => {
	const sdkUrl = `${env.VITE_FRONTEND_ORIGIN}/sdk.js`;
	const serverUrl = `${env.VITE_SERVER_URL}/api`;
	const [isHtmlCopied, setIsHtmlCopied] = useState(false);
	const [isReactCopied, setIsReactCopied] = useState(false);

	const embedCode = chatbot.embedToken
		? `<script>
(function(w,d){if(w.self!==w.top) return;
if(w.location.pathname==="/widget") return;
if(typeof w.Padyna!=="function"){
  var q=[];
  var stub = function(){
    q.push(arguments)
  };
  stub.q=q;
  w.Padyna=stub
}
var s=d.createElement("script");
s.src="${sdkUrl}";
s.async=true;
d.head.appendChild(s)
})(window,document);
</script>
<script>
  if(window.self===window.top&&window.location.pathname!=="/widget"){
  window.Padyna("init",{
    widgetId:"${chatbot.embedToken}",
    serverUrl:"${env.VITE_FRONTEND_ORIGIN}",
    apiUrl:"${serverUrl}"
  });
}
  </script>`
		: "";

	const reactEmbedCode = chatbot.embedToken
		? `import { useEffect } from "react";
    
export const PadynaWidget = () => {
useEffect(() => {
// Initializing the snippet for Padyna
(function(w,d,s,u){
  if(w.self!==w.top||w.location.pathname==="/widget")return;
  if(typeof w.Padyna!=="function"){
    var q=[];var stub=function(){q.push(arguments)};stub.q=q;w.Padyna=stub;
  }
  var script=d.createElement(s);
  script.src=u;
  script.async=true;
  
  // Initialize only after the SDK has loaded
  script.onload = () => {
    if(window.Padyna) {
      window.Padyna("init", {
        widgetId: "${chatbot.embedToken}",
        serverUrl: "${env.VITE_FRONTEND_ORIGIN}",
        apiUrl: "${serverUrl}"
      });
    }
  };

  d.head.appendChild(script);
})(window, document, "script", "${sdkUrl}");
}, []);

return null;
};`
		: "";

	const handleCopyHtml = () => {
		if (embedCode) {
			navigator.clipboard.writeText(embedCode);
			toast.success("Copied to clipboard");
			setIsHtmlCopied(true);
			setTimeout(() => setIsHtmlCopied(false), 2000);
		}
	};

	const handleCopyReact = () => {
		if (reactEmbedCode) {
			navigator.clipboard.writeText(reactEmbedCode);
			toast.success("Copied to clipboard");
			setIsReactCopied(true);
			setTimeout(() => setIsReactCopied(false), 2000);
		}
	};

	return (
		<>
			<div className="min-w-0 flex-1 p-2 onboarding-height overflow-hidden">
				<div className="relative h-full min-w-0 rounded-xl bg-white dark:bg-gray-950 overflow-hidden  shadow-xs border dark:border-gray-800">
					<div className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto p-8 scrollbar-hide">
						<div className=" min-w-0 shrink-0">
							<div className=" flex items-start justify-between">
								<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
									Install the widget
								</h3>
								<Button
									size="icon"
									variant="outline"
									className="text-gray-400 hidden sm:flex hover:text-gray-500 rounded-full"
									onClick={onClose}>
									<XIcon />
								</Button>
							</div>
							<p className="max-w-md text-pretty text-sm text-gray-600 dark:text-gray-400">
								Get the Padyna widget running on your website in
								under a minute
							</p>
						</div>
						<div className="pt-5 pb-2">
							<div className="mb-2 flex items-center justify-between">
								<div className="flex items-center gap-3">
									<WidgetIcon color="purple" />
									<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
										Standard HTML website
									</p>
								</div>
								<Button
									className="text-sm font-medium text-gray-600 dark:text-gray-100"
									variant="outline"
									size="sm"
									onClick={handleCopyHtml}>
									{isHtmlCopied ? "Copied" : "Copy"}
								</Button>
							</div>
							<p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
								Add this code to your HTML, just before the closing{" "}
								<code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px] dark:bg-gray-800">
									&lt;/body&gt;
								</code>{" "}
								tag
							</p>
						</div>
						<div className="grid w-full min-w-0 overflow-hidden">
							<CodeBlock
								data={[
									{
										code: embedCode,
										language: "html",
										filename: "widget.html",
									},
								]}
								defaultValue="html">
								<CodeBlockHeader>
									<CodeBlockFiles>
										{(item) => (
											<CodeBlockFilename
												key={item.language}
												value={item.language}>
												{item.filename}
											</CodeBlockFilename>
										)}
									</CodeBlockFiles>
								</CodeBlockHeader>
								<CodeBlockBody className="h-32 overflow-y-auto hide-scrollbar">
									{(item) => (
										<CodeBlockItem
											key={item.language}
											value={item.language}>
											<CodeBlockContent
												language={
													item.language as BundledLanguage
												}>
												{item.code}
											</CodeBlockContent>
										</CodeBlockItem>
									)}
								</CodeBlockBody>
							</CodeBlock>
						</div>
						<div className="pt-8 pb-2">
							<div className="mb-2 flex items-center justify-between">
								<div className="flex items-center gap-3">
									<ReactIcon />
									<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
										React application
									</p>
								</div>
								<Button
									className="text-sm font-medium text-gray-600 dark:text-gray-100"
									variant="outline"
									size="sm"
									onClick={handleCopyReact}>
									{isReactCopied ? "Copied" : "Copy"}
								</Button>
							</div>
							<p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
								Add this code to your layout file,{" "}
								<code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px] dark:bg-gray-800">
									main.tsx
								</code>{" "}
								or
								<code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px] dark:bg-gray-800">
									page.tsx
								</code>{" "}
								in your React app
							</p>
						</div>
						<div className="grid w-full min-w-0 overflow-hidden">
							<CodeBlock
								data={[
									{
										code: reactEmbedCode,
										language: "tsx",
										filename: "widget.tsx",
									},
								]}
								defaultValue="tsx">
								<CodeBlockHeader>
									<CodeBlockFiles>
										{(item) => (
											<CodeBlockFilename
												key={item.language}
												value={item.language}>
												{item.filename}
											</CodeBlockFilename>
										)}
									</CodeBlockFiles>
								</CodeBlockHeader>
								<CodeBlockBody className="h-32 overflow-y-auto hide-scrollbar">
									{(item) => (
										<CodeBlockItem
											key={item.language}
											value={item.language}>
											<CodeBlockContent
												language={
													item.language as BundledLanguage
												}>
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
		</>
	);
};

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import katex from "katex";
import { cn } from "@/lib/utils";

export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("prose-margin", className)}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { throwOnError: false }]]} skipHtml>
        {text}
      </ReactMarkdown>
    </div>
  );
}

function stripDelims(t: string) {
  let s = t.trim();
  for (let i = 0; i < 2; i++) {
    const m = s.match(/^\$\$([\s\S]*)\$\$$/) || s.match(/^\$([\s\S]*)\$$/) || s.match(/^\\\(([\s\S]*)\\\)$/) || s.match(/^\\\[([\s\S]*)\\\]$/);
    if (!m) break;
    s = m[1].trim();
  }
  return s;
}

export function Equation({ tex, className }: { tex: string; className?: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(stripDelims(tex), { displayMode: true, throwOnError: false });
    } catch {
      return null;
    }
  }, [tex]);
  if (!html) return <code className={className}>{tex}</code>;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

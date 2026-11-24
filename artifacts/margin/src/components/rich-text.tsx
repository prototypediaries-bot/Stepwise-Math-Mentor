import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import katex from "katex";
import { cn } from "@/lib/utils";
import { splitEquationRows } from "@/lib/equation-layout";

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
  const rows = useMemo(() => {
    return splitEquationRows(stripDelims(tex)).map((row) => {
      try {
        return { tex: row, html: katex.renderToString(row, { displayMode: true, throwOnError: false }) };
      } catch {
        return { tex: row, html: null };
      }
    });
  }, [tex]);
  return (
    <div className={className}>
      {rows.map((row, i) => row.html
        ? <div key={i} dangerouslySetInnerHTML={{ __html: row.html }} />
        : <code key={i} className="block whitespace-pre-wrap">{row.tex}</code>)}
    </div>
  );
}

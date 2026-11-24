import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, RotateCw, Lightbulb, AlertCircle } from "lucide-react";
import type { MathExplanation, ExplanationInputMode } from "@workspace/api-client-react";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { RichText } from "@/components/rich-text";

export type ExplainState = {
  open: boolean;
  quote: string;
  status: "loading" | "error" | "done";
  error?: string;
  result?: MathExplanation;
  mode: ExplanationInputMode;
};

const MODES: { v: ExplanationInputMode; label: string }[] = [
  { v: "auto", label: "Auto" }, { v: "step", label: "Step" }, { v: "concept", label: "Concept" },
];
const KIND_LABEL = { step: "How this step works", concept: "Why this is true", mixed: "Step and the idea behind it" } as const;

function useIsDesktop() {
  const q = "(min-width: 1024px)";
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return m;
}

type P = { s: ExplainState; onRetry: () => void; onClose: () => void; onMode: (m: ExplanationInputMode) => void };

function Body({ s, onRetry, onClose, onMode }: P) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">In the margin</p>
          <p className="font-display text-lg leading-tight">Explanation</p>
        </div>
        <button onClick={onClose} data-testid="button-close-panel" aria-label="Close explanation"
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5" aria-live="polite">
        <figure className="relative rounded-lg bg-highlight px-4 py-3 pl-5" data-testid="text-selected-quote">
          <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" />
          <figcaption className="mb-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">You asked about</figcaption>
          <blockquote className="line-clamp-6 whitespace-pre-wrap font-display text-[15px] leading-relaxed">{s.quote}</blockquote>
        </figure>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground" id="mode-label">Explain as</span>
          <div role="radiogroup" aria-labelledby="mode-label" className="inline-flex rounded-full border border-border bg-background p-0.5">
            {MODES.map((m) => (
              <button key={m.v} role="radio" aria-checked={s.mode === m.v} onClick={() => s.mode !== m.v && onMode(m.v)}
                data-testid={`button-mode-${m.v}`}
                className={`rounded-full px-3 py-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${s.mode === m.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">Auto reads your selection and decides. Switch if it explained the wrong thing.</p>

        {s.status === "loading" && (
          <div className="mt-6 space-y-3" data-testid="status-explain-loading">
            <div className="shimmer h-5 w-2/3 rounded bg-muted" />
            <div className="shimmer h-3.5 w-full rounded bg-muted" />
            <div className="shimmer h-3.5 w-11/12 rounded bg-muted" />
            <div className="shimmer h-3.5 w-4/5 rounded bg-muted" />
            <p className="pt-2 text-sm text-muted-foreground">Reading that line closely…</p>
          </div>
        )}

        {s.status === "error" && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4" data-testid="status-explain-error">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{s.error ?? "The explanation could not be loaded."}</span>
            </div>
            <button onClick={onRetry} data-testid="button-retry-explain"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground transition hover:opacity-90">
              <RotateCw className="h-3.5 w-3.5" /> Try again
            </button>
          </div>
        )}

        {s.status === "done" && s.result && (
          <div className="rise mt-6" data-testid="text-explanation">
            {s.result.kind && (
              <p className="mb-2 inline-flex rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-accent" data-testid="text-explanation-kind">
                {KIND_LABEL[s.result.kind]}
              </p>
            )}
            <h3 className="font-display text-xl font-semibold leading-snug">{s.result.title}</h3>
            <RichText text={s.result.explanation} className="mt-2 text-[15px]" />
            <div className="mt-6 rounded-lg border border-primary/15 bg-primary/[0.04] p-4" data-testid="text-takeaway">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                <Lightbulb className="h-3.5 w-3.5" /> Takeaway
              </p>
              <RichText text={s.result.takeaway} className="text-[15px]" />
            </div>
          </div>
        )}
      </div>
      <p className="border-t border-border/70 px-6 py-3 text-xs text-muted-foreground">
        Your solution stays exactly where you left it. Close this to keep reading.
      </p>
    </div>
  );
}

export function ExplainPanel({ s, onRetry, onClose, onMode }: P) {
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!s.open || !desktop) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [s.open, desktop, onClose]);

  if (!desktop) {
    return (
      <Drawer open={s.open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[85dvh] bg-card">
          <DrawerTitle className="sr-only">Explanation</DrawerTitle>
          <DrawerDescription className="sr-only">Explanation of your selected text</DrawerDescription>
          <div className="h-[75dvh]"><Body s={s} onRetry={onRetry} onClose={onClose} onMode={onMode} /></div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AnimatePresence>
      {s.open && (
        <motion.aside
          role="complementary" aria-label="Explanation panel" data-testid="panel-explain"
          initial={reduce ? { opacity: 0 } : { x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { x: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="fixed bottom-4 right-4 top-20 z-40 w-[400px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-20px_hsl(226_42%_17%/0.35)]"
        >
          <Body s={s} onRetry={onRetry} onClose={onClose} onMode={onMode} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

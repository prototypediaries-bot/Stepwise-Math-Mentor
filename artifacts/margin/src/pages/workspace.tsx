import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Check, Copy, History, MessageSquareQuote, Plus, Trash2, AlertCircle, RotateCw, BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useExplainMath, useSolveMath, type MathSolution } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { RichText, Equation } from "@/components/rich-text";
import { ExplainPanel, type ExplainState } from "@/components/explain-panel";
import {
  EXAMPLE_QUESTION, EXAMPLE_SOLUTION, loadHistory, saveHistory, serializeSolution, type SavedProblem,
} from "@/lib/margin";

type Current = { id: string | null; question: string; solution: MathSolution; example: boolean };

function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string") return (e as Error).message;
  return "Something went wrong. Please try again.";
}

function HistoryList({ items, activeId, onOpen, onDelete, onNew, onExample }: {
  items: SavedProblem[]; activeId: string | null; onOpen: (p: SavedProblem) => void; onDelete: (id: string) => void;
  onNew: () => void; onExample: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-6">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold tracking-tight">Margin</span>
          <span className="h-2 w-2 rounded-full bg-accent" />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Math, one step at a time.</p>
        <button onClick={onNew} data-testid="button-new-problem"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:-translate-y-px hover:shadow-md active:translate-y-0">
          <Plus className="h-4 w-4" /> New problem
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Notebook</p>
        <button onClick={onExample} data-testid="button-open-example"
          className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground">
          <BookOpen className="h-3.5 w-3.5 text-accent" /> Worked example
        </button>
        {items.length === 0 ? (
          <div className="mx-2 mt-3 rounded-lg border border-dashed border-border p-4 text-xs leading-relaxed text-muted-foreground" data-testid="text-history-empty">
            Problems you solve are kept here, on this device only.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {items.map((p) => (
              <li key={p.id} className="group relative">
                <button onClick={() => onOpen(p)} data-testid={`button-open-history-${p.id}`}
                  className={`w-full rounded-lg px-2 py-2 pr-9 text-left transition ${activeId === p.id ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"}`}>
                  <span className="block truncate text-sm">{p.solution.title || p.question}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {p.solution.subject} · {formatDistanceToNow(p.createdAt, { addSuffix: true })}
                  </span>
                </button>
                <button onClick={() => onDelete(p.id)} aria-label={`Delete ${p.solution.title}`} data-testid={`button-delete-history-${p.id}`}
                  className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground opacity-60 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function Workspace() {
  const { toast } = useToast();
  const solve = useSolveMath();
  const explain = useExplainMath();
  const solveRef = useRef(solve.mutateAsync); solveRef.current = solve.mutateAsync;
  const explainRef = useRef(explain.mutateAsync); explainRef.current = explain.mutateAsync;

  const [history, setHistory] = useState<SavedProblem[]>(() => loadHistory());
  const [current, setCurrent] = useState<Current | null>({ id: null, question: EXAMPLE_QUESTION, solution: EXAMPLE_SOLUTION, example: true });
  const [draft, setDraft] = useState("");
  const [solving, setSolving] = useState<{ question: string; error?: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [panel, setPanel] = useState<ExplainState>({ open: false, quote: "", status: "loading" });
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [floating, setFloating] = useState<{ top: number; left: number; text: string } | null>(null);
  const reqId = useRef(0);
  const solutionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const persist = (items: SavedProblem[]) => {
    setHistory(items);
    if (!saveHistory(items)) toast({ title: "Could not save to this browser", description: "Local storage is full or unavailable." });
  };

  const closePanel = useCallback(() => {
    reqId.current++;
    setPanel((p) => ({ ...p, open: false }));
    setActiveStep(null);
  }, []);

  const runExplain = useCallback((quote: string) => {
    if (!current) return;
    const id = ++reqId.current;
    setFloating(null);
    setPanel({ open: true, quote, status: "loading" });
    explainRef.current({ data: {
      question: current.question.slice(0, 4000),
      solution: serializeSolution(current.question, current.solution).slice(0, 30000),
      selectedText: quote.slice(0, 8000),
    } })
      .then((r) => { if (id === reqId.current) setPanel({ open: true, quote, status: "done", result: r }); })
      .catch((e) => { if (id === reqId.current) setPanel({ open: true, quote, status: "error", error: errMsg(e) }); });
  }, [current]);

  // floating Explain button on selection
  useEffect(() => {
    const check = () => {
      const sel = window.getSelection();
      const root = solutionRef.current;
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !root) { setFloating(null); return; }
      const range = sel.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) { setFloating(null); return; }
      const text = sel.toString().replace(/\s+\n/g, "\n").trim();
      if (!text) { setFloating(null); return; }
      const rect = range.getBoundingClientRect();
      const top = rect.top > 64 ? rect.top - 48 : rect.bottom + 10;
      const left = Math.min(Math.max(rect.left + rect.width / 2, 70), window.innerWidth - 70);
      setFloating({ top, left, text });
    };
    let t: number | undefined;
    const deferred = () => { window.clearTimeout(t); t = window.setTimeout(check, 10); };
    document.addEventListener("selectionchange", deferred);
    window.addEventListener("scroll", deferred, true);
    window.addEventListener("resize", deferred);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("selectionchange", deferred);
      window.removeEventListener("scroll", deferred, true);
      window.removeEventListener("resize", deferred);
    };
  }, []);

  const submit = async (q?: string) => {
    const question = (q ?? draft).trim();
    if (!question || solving?.error === undefined && solving) return;
    closePanel();
    setSolving({ question });
    setCurrent(null);
    try {
      const solution = await solveRef.current({ data: { question: question.slice(0, 4000) } });
      const item: SavedProblem = { id: crypto.randomUUID?.() ?? String(Date.now()), question, solution, createdAt: Date.now() };
      persist([item, ...history]);
      setCurrent({ id: item.id, question, solution, example: false });
      setSolving(null);
      setDraft("");
      window.scrollTo({ top: 0 });
    } catch (e) {
      setSolving({ question, error: errMsg(e) });
    }
  };

  const openItem = (p: SavedProblem) => {
    closePanel(); setSolving(null); setHistoryOpen(false);
    setCurrent({ id: p.id, question: p.question, solution: p.solution, example: false });
    window.scrollTo({ top: 0 });
  };
  const openExample = () => {
    closePanel(); setSolving(null); setHistoryOpen(false);
    setCurrent({ id: null, question: EXAMPLE_QUESTION, solution: EXAMPLE_SOLUTION, example: true });
  };
  const newProblem = () => {
    closePanel(); setSolving(null); setHistoryOpen(false); setCurrent(null); setDraft("");
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };
  const deleteItem = (id: string) => {
    persist(history.filter((h) => h.id !== id));
    if (current?.id === id) newProblem();
    toast({ title: "Removed from notebook" });
  };
  const copy = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(serializeSolution(current.question, current.solution));
      setCopied(true); window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access." });
    }
  };

  const listProps = { items: history, activeId: current?.id ?? null, onOpen: openItem, onDelete: deleteItem, onNew: newProblem, onExample: openExample };
  const s = current?.solution;

  return (
    <div className="grain min-h-[100dvh]">
      <aside className="fixed inset-y-0 left-0 hidden w-[268px] border-r border-sidebar-border bg-sidebar/80 backdrop-blur lg:block">
        <HistoryList {...listProps} />
      </aside>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-[290px] bg-sidebar p-0">
          <SheetTitle className="sr-only">Notebook</SheetTitle>
          <SheetDescription className="sr-only">Saved problems</SheetDescription>
          <HistoryList {...listProps} />
        </SheetContent>
      </Sheet>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setHistoryOpen(true)} data-testid="button-open-history" className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm hover:bg-muted">
          <History className="h-4 w-4" /> Notebook
        </button>
        <span className="font-display text-lg font-semibold">Margin<span className="text-accent">.</span></span>
        <button onClick={newProblem} aria-label="New problem" data-testid="button-new-problem-mobile" className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
          <Plus className="h-4 w-4" />
        </button>
      </header>

      <main className="lg:pl-[268px]">
        <div className="mx-auto max-w-[720px] px-5 pb-40 pt-8 sm:px-8 lg:pt-14 xl:mr-[max(2rem,calc((100vw-268px-720px-420px)/2+420px))] xl:ml-auto 2xl:mx-auto">
          {!current && !solving && (
            <section className="rise pt-6 sm:pt-16">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">New problem</p>
              <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
                Write it down.<br /><span className="italic text-muted-foreground">We’ll work it out.</span>
              </h1>
              <p className="mt-4 max-w-md text-muted-foreground">One clear solution. Highlight any line you don’t follow, and the explanation appears in the margin, never in the way.</p>
            </section>
          )}

          {solving && (
            <section className="rise" data-testid="status-solving">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Your question</p>
              <p className="mt-2 whitespace-pre-wrap font-display text-xl">{solving.question}</p>
              {solving.error ? (
                <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-5" data-testid="status-solve-error">
                  <p className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {solving.error}</p>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => submit(solving.question)} data-testid="button-retry-solve" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"><RotateCw className="h-3.5 w-3.5" /> Try again</button>
                    <button onClick={() => { setDraft(solving.question); setSolving(null); }} data-testid="button-edit-question" className="rounded-full px-4 py-2 text-sm hover:bg-muted">Edit question</button>
                  </div>
                </div>
              ) : (
                <div className="mt-10 space-y-8">
                  <div className="shimmer h-9 w-3/4 rounded-md bg-muted" />
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-5"><div className="shimmer h-8 w-8 rounded-full bg-muted" /><div className="flex-1 space-y-2.5"><div className="shimmer h-4 w-1/3 rounded bg-muted" /><div className="shimmer h-3.5 w-full rounded bg-muted" /><div className="shimmer h-12 w-2/3 rounded bg-muted" /></div></div>
                  ))}
                  <p className="text-sm text-muted-foreground">Working through it, step by step…</p>
                </div>
              )}
            </section>
          )}

          {current && s && (
            <article key={current.id ?? "example"} className="rise">
              {current.example && (
                <div className="mb-8 flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3 text-sm" data-testid="banner-example">
                  <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <p><span className="font-semibold text-accent">Worked example.</span> Highlight any phrase or equation below, then press <b>Explain</b>. Or use <b>Explain step</b> on any step.</p>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-primary/[0.07] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary" data-testid="text-subject">{s.subject}</span>
                <button onClick={copy} data-testid="button-copy-solution" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground">
                  {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy solution"}
                </button>
              </div>
              <p className="mt-5 text-sm text-muted-foreground" data-testid="text-question"><span className="mr-2 font-mono text-[11px] uppercase tracking-wider">Q</span>{current.question}</p>

              <div ref={solutionRef} data-testid="solution-body">
                <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-[40px]" data-testid="text-solution-title">{s.title}</h1>
                <RichText text={s.introduction} className="mt-4 text-[17px] text-foreground/90" />

                <ol className="relative mt-10 space-y-3">
                  <span aria-hidden className="absolute bottom-6 left-[15px] top-6 w-px bg-accent/30" />
                  {s.steps.map((st, i) => (
                    <li key={i} data-testid={`step-${i}`}
                      className={`relative rounded-2xl py-4 pl-12 pr-3 transition-colors duration-300 sm:pr-5 ${activeStep === i && panel.open ? "bg-[hsl(48_95%_62%/0.2)]" : ""}`}>
                      <span className="absolute left-0 top-4 grid h-8 w-8 place-items-center rounded-full border border-accent/40 bg-background font-mono text-xs text-accent">{i + 1}</span>
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                        <h2 className="font-display text-xl font-semibold leading-snug">{st.title}</h2>
                        <button onClick={() => { setActiveStep(i); runExplain(`Step ${i + 1}: ${st.title}\n${st.content}${st.equation ? `\n${st.equation}` : ""}`); }}
                          data-testid={`button-explain-step-${i}`} aria-label={`Explain step ${i + 1}: ${st.title}`}
                          className="select-none rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          Explain step
                        </button>
                      </div>
                      <RichText text={st.content} className="mt-1 text-[16px] text-foreground/85" />
                      {st.equation && <Equation tex={st.equation} className="mt-3 rounded-xl border border-border/80 bg-card/80 px-4 py-2 text-[1.05rem]" />}
                    </li>
                  ))}
                </ol>

                <div className="mt-8 rounded-2xl bg-primary px-6 py-5 text-primary-foreground" data-testid="text-answer">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[hsl(48_95%_70%)]">Answer</p>
                  <RichText text={s.answer} className="mt-1 font-display text-xl" />
                </div>
              </div>
            </article>
          )}
        </div>

        {/* composer */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background/90 to-transparent pb-4 pt-10 lg:pl-[268px]">
          <form onSubmit={(e) => { e.preventDefault(); void submit(); }}
            className="pointer-events-auto mx-auto flex max-w-[720px] items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-[0_18px_40px_-24px_hsl(226_42%_17%/0.45)] focus-within:border-accent/60 sm:mx-8 lg:mx-auto xl:mr-[max(2rem,calc((100vw-268px-720px-420px)/2+420px))] xl:ml-auto 2xl:mx-auto mx-4">
            <label htmlFor="q" className="sr-only">Math question</label>
            <textarea id="q" ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={4000} rows={1}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }}
              placeholder="Type a textbook problem, e.g. integrate x·e^x dx"
              data-testid="input-question"
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] outline-none placeholder:text-muted-foreground/70" />
            <button type="submit" disabled={!draft.trim() || (!!solving && !solving.error)} aria-label="Solve" data-testid="button-solve"
              className="mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition hover:scale-105 disabled:scale-100 disabled:opacity-35">
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
        </div>
      </main>

      <AnimatePresence>
        {floating && (
          <motion.button key="float" initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.16 }}
            onMouseDown={(e) => e.preventDefault()} onClick={() => { setActiveStep(null); runExplain(floating.text); }}
            data-testid="button-explain-selection"
            style={{ top: floating.top, left: floating.left, x: "-50%" }}
            className="fixed z-50 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
            <MessageSquareQuote className="h-4 w-4 text-[hsl(48_95%_70%)]" /> Explain
          </motion.button>
        )}
      </AnimatePresence>

      <ExplainPanel s={panel} onClose={closePanel} onRetry={() => runExplain(panel.quote)} />
    </div>
  );
}

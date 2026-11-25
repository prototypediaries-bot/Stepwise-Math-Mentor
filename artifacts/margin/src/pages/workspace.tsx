import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Check, Copy, History, MessageSquareQuote, Plus, Trash2, AlertCircle, RotateCw, BookOpen, ImagePlus, X, LogIn, LogOut, ScanText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useExplainMath, useSolveMath, useRequestUploadUrl, type MathSolution, type ExplanationInputMode } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { RichText, Equation } from "@/components/rich-text";
import { FinalAnswer } from "@/components/final-answer";
import { ExplainPanel, type ExplainState } from "@/components/explain-panel";
import {
  EXAMPLE_QUESTION, EXAMPLE_SOLUTION, loadHistory, saveHistory, serializeSolution, type SavedProblem,
} from "@/lib/margin";

type Current = { id: string | null; question: string; solution: MathSolution; example: boolean };

type Attachment = { file: File; url: string; objectPath?: string };
const IMG_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const MAX_BYTES = 8 * 1024 * 1024;
const DRAFT_KEY = "margin.pending-draft";

function statusOf(e: unknown): number | undefined {
  return e && typeof e === "object" && "status" in e && typeof (e as { status: unknown }).status === "number" ? (e as { status: number }).status : undefined;
}
function uploadErr(e: unknown) {
  const st = statusOf(e);
  if (st === 503) return "Picture uploads are not available right now (storage is not set up). Type the problem instead, or try again later.";
  if (st === 401) return "Your session ended. Log in again to send a picture.";
  return errMsg(e);
}

function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string") return (e as Error).message;
  return "Something went wrong. Please try again.";
}

type AuthBits = { authed: boolean; authLoading: boolean; name: string | null; onLogin: () => void; onLogout: () => void };

function HistoryList({ items, activeId, onOpen, onDelete, onNew, onExample, auth }: {
  items: SavedProblem[]; activeId: string | null; onOpen: (p: SavedProblem) => void; onDelete: (id: string) => void;
  onNew: () => void; onExample: () => void; auth: AuthBits;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-6">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold tracking-tight">Margin</span>
          <span className="h-2 w-2 rounded-full bg-accent" />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Math, science and engineering, one step at a time.</p>
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
      <div className="border-t border-sidebar-border px-5 py-4 text-xs">
        {auth.authLoading ? <div className="shimmer h-4 w-2/3 rounded bg-muted" /> : auth.authed ? (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-muted-foreground" data-testid="text-user">Signed in{auth.name ? ` as ${auth.name}` : ""}</span>
            <button onClick={auth.onLogout} data-testid="button-logout" className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 hover:bg-sidebar-accent"><LogOut className="h-3.5 w-3.5" /> Log out</button>
          </div>
        ) : (
          <div>
            <p className="leading-relaxed text-muted-foreground">Typed questions need no account. Log in to send pictures.</p>
            <button onClick={auth.onLogin} data-testid="button-login" className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 hover:border-accent hover:text-accent"><LogIn className="h-3.5 w-3.5" /> Log in</button>
          </div>
        )}
        <p className="mt-3 leading-relaxed text-muted-foreground/80">AI can misread or make mistakes. Check key results.</p>
      </div>
    </div>
  );
}

export default function Workspace() {
  const { toast } = useToast();
  const solve = useSolveMath();
  const explain = useExplainMath();
  const upload = useRequestUploadUrl();
  const auth = useAuth();
  const uploadRef = useRef(upload.mutateAsync); uploadRef.current = upload.mutateAsync;
  const solveRef = useRef(solve.mutateAsync); solveRef.current = solve.mutateAsync;
  const explainRef = useRef(explain.mutateAsync); explainRef.current = explain.mutateAsync;

  const [history, setHistory] = useState<SavedProblem[]>(() => loadHistory());
  const [current, setCurrent] = useState<Current | null>({ id: null, question: EXAMPLE_QUESTION, solution: EXAMPLE_SOLUTION, example: true });
  const [draft, setDraft] = useState(() => {
    try { const d = sessionStorage.getItem(DRAFT_KEY); if (d) { sessionStorage.removeItem(DRAFT_KEY); return d; } } catch { /* ignore */ }
    return "";
  });
  const [solving, setSolving] = useState<{ question: string; picture?: string; error?: string } | null>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [pickerHint, setPickerHint] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const solveReq = useRef(0);
  const busy = useRef(false);
  const attachUrlRef = useRef<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [panel, setPanel] = useState<ExplainState>({ open: false, quote: "", status: "loading", mode: "auto" });
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [floating, setFloating] = useState<{ top: number; left: number; text: string } | null>(null);
  const reqId = useRef(0);
  const solutionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => { if (attachUrlRef.current) URL.revokeObjectURL(attachUrlRef.current); }, []);

  const removeAttachment = () => {
    if (attachUrlRef.current) URL.revokeObjectURL(attachUrlRef.current);
    attachUrlRef.current = null;
    setAttachment(null); setAttachError(null);
    if (fileRef.current) fileRef.current.value = "";
  };
  const pickFile = (f: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!f) return;
    if (!(IMG_TYPES as readonly string[]).includes(f.type)) { setAttachError("Use a PNG, JPEG or WebP picture."); return; }
    if (f.size > MAX_BYTES) { setAttachError(`That picture is ${(f.size / 1048576).toFixed(1)} MB. The limit is 8 MB.`); return; }
    if (attachUrlRef.current) URL.revokeObjectURL(attachUrlRef.current);
    const url = URL.createObjectURL(f);
    attachUrlRef.current = url;
    setAttachment({ file: f, url }); setAttachError(null);
  };
  const onAttachClick = () => {
    if (auth.isLoading) return;
    if (!auth.isAuthenticated) { setPickerHint(true); return; }
    fileRef.current?.click();
  };
  const login = () => {
    try { if (draft.trim()) sessionStorage.setItem(DRAFT_KEY, draft); } catch { /* ignore */ }
    auth.login();
  };

  const persist = (items: SavedProblem[]) => {
    setHistory(items);
    if (!saveHistory(items)) toast({ title: "Could not save to this browser", description: "Local storage is full or unavailable." });
  };

  const closePanel = useCallback(() => {
    reqId.current++;
    setPanel((p) => ({ ...p, open: false }));
    setActiveStep(null);
  }, []);

  const runExplain = useCallback((quote: string, mode: ExplanationInputMode = "auto") => {
    if (!current) return;
    const id = ++reqId.current;
    setFloating(null);
    setPanel({ open: true, quote, status: "loading", mode });
    explainRef.current({ data: {
      question: (current.question || current.solution.title).slice(0, 12000),
      solution: serializeSolution(current.question, current.solution).slice(0, 50000),
      selectedText: quote.slice(0, 8000),
      mode,
    } })
      .then((r) => { if (id === reqId.current) setPanel({ open: true, quote, status: "done", result: r, mode }); })
      .catch((e) => { if (id === reqId.current) setPanel({ open: true, quote, status: "error", error: errMsg(e), mode }); });
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
    const att = attachment;
    if ((!question && !att) || busy.current) return;
    busy.current = true;
    const myReq = ++solveReq.current;
    closePanel();
    setSolving({ question, picture: att?.url });
    setCurrent(null);
    try {
      let imagePath: string | undefined;
      if (att) {
        imagePath = att.objectPath;
        if (!imagePath) {
          try {
            const { uploadURL, objectPath } = await uploadRef.current({ data: { name: att.file.name.slice(0, 255) || "picture", size: att.file.size, contentType: att.file.type as (typeof IMG_TYPES)[number] } });
            const put = await fetch(uploadURL, { method: "PUT", body: att.file, headers: { "Content-Type": att.file.type } });
            if (!put.ok) throw new Error(`The picture upload failed (${put.status}). Please try again.`);
            imagePath = objectPath;
            setAttachment((cur) => (cur && cur.file === att.file ? { ...cur, objectPath } : cur));
          } catch (e) {
            throw new Error(uploadErr(e));
          }
        }
        if (myReq !== solveReq.current) return;
      }
      const solution = await solveRef.current({ data: imagePath ? { question: question.slice(0, 12000), imagePath } : { question: question.slice(0, 12000) } });
      if (myReq !== solveReq.current) return;
      const used = imagePath && solution.interpretedQuestion
        ? (question ? `${solution.interpretedQuestion}\n\nNote: ${question}` : solution.interpretedQuestion)
        : question || solution.interpretedQuestion || solution.title;
      const item: SavedProblem = { id: crypto.randomUUID?.() ?? String(Date.now()), question: used, solution, createdAt: Date.now() };
      persist([item, ...history]);
      setCurrent({ id: item.id, question: used, solution, example: false });
      setSolving(null);
      setDraft("");
      if (att) removeAttachment();
      window.scrollTo({ top: 0 });
    } catch (e) {
      if (myReq === solveReq.current) setSolving({ question, picture: att?.url, error: errMsg(e) });
    } finally {
      if (myReq === solveReq.current) busy.current = false;
    }
  };

  const cancelSolve = () => { solveReq.current++; busy.current = false; setSolving(null); };

  const openItem = (p: SavedProblem) => {
    closePanel(); cancelSolve(); setHistoryOpen(false);
    setCurrent({ id: p.id, question: p.question, solution: p.solution, example: false });
    window.scrollTo({ top: 0 });
  };
  const openExample = () => {
    closePanel(); cancelSolve(); setHistoryOpen(false);
    setCurrent({ id: null, question: EXAMPLE_QUESTION, solution: EXAMPLE_SOLUTION, example: true });
  };
  const newProblem = () => {
    closePanel(); cancelSolve(); setHistoryOpen(false); setCurrent(null); setDraft(""); removeAttachment();
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

  const listProps = { items: history, activeId: current?.id ?? null, onOpen: openItem, onDelete: deleteItem, onNew: newProblem, onExample: openExample,
    auth: { authed: auth.isAuthenticated, authLoading: auth.isLoading, name: auth.user?.firstName ?? auth.user?.email ?? null, onLogin: login, onLogout: auth.logout } };
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
              <p className="mt-4 max-w-md text-muted-foreground">Math, physics, chemistry, circuits, statics, proofs and theory. Type it or attach a picture of the page. Highlight any line you don’t follow, and the explanation appears in the margin, never in the way.</p>
            </section>
          )}

          {solving && (
            <section className="rise" data-testid="status-solving">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Your question</p>
              {solving.picture && <img src={solving.picture} alt="Your attached problem" className="mt-3 max-h-48 rounded-xl border border-border object-contain" data-testid="img-solving-picture" />}
              {solving.question && <p className="mt-2 whitespace-pre-wrap font-display text-xl">{solving.question}</p>}
              {solving.error ? (
                <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-5" data-testid="status-solve-error">
                  <p className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {solving.error}</p>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => submit(solving.question)} data-testid="button-retry-solve" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"><RotateCw className="h-3.5 w-3.5" /> Try again</button>
                    <button onClick={() => { setDraft(solving.question); cancelSolve(); }} data-testid="button-edit-question" className="rounded-full px-4 py-2 text-sm hover:bg-muted">Edit question</button>
                  </div>
                </div>
              ) : (
                <div className="mt-10 space-y-8">
                  <div className="shimmer h-9 w-3/4 rounded-md bg-muted" />
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-5"><div className="shimmer h-8 w-8 rounded-full bg-muted" /><div className="flex-1 space-y-2.5"><div className="shimmer h-4 w-1/3 rounded bg-muted" /><div className="shimmer h-3.5 w-full rounded bg-muted" /><div className="shimmer h-12 w-2/3 rounded bg-muted" /></div></div>
                  ))}
                  <p className="text-sm text-muted-foreground">{solving.picture ? "Reading your picture, then working through it…" : "Working through it, step by step…"}</p>
                </div>
              )}
            </section>
          )}

          {current && s && (
            <article key={current.id ?? "example"} className="rise">
              {current.example && (
                <div className="mb-8 flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3 text-sm" data-testid="banner-example">
                  <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <p><span className="font-semibold text-accent">Worked example.</span> Highlight any phrase or equation below, then press <b>Explain</b>. Or use <b>Explain step</b> or <b>Explain concept</b> on any block.</p>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-primary/[0.07] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary" data-testid="text-subject">{s.subject}{s.problemType === "conceptual" ? " · Concept" : s.problemType === "mixed" ? " · Concept + working" : ""}</span>
                <button onClick={copy} data-testid="button-copy-solution" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground">
                  {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy solution"}
                </button>
              </div>
              {s.interpretedQuestion ? (
                <div className="mt-5 rounded-xl border border-border/80 bg-card/70 px-4 py-3" data-testid="text-interpreted-question">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-accent"><ScanText className="h-3.5 w-3.5" /> Read from your picture</p>
                  <RichText text={s.interpretedQuestion} className="mt-1 text-sm text-foreground/85" />
                  <p className="mt-2 text-xs text-muted-foreground">Misread something? <button onClick={() => { setDraft(s.interpretedQuestion ?? ""); inputRef.current?.focus(); }} data-testid="button-correct-reading" className="underline decoration-accent/50 underline-offset-2 hover:text-accent">Copy this into the box</button>, fix it, and ask again.</p>
                </div>
              ) : (
                <p className="mt-5 whitespace-pre-wrap text-sm text-muted-foreground" data-testid="text-question"><span className="mr-2 text-[11px] uppercase tracking-wider">Q</span>{current.question}</p>
              )}

              <div ref={solutionRef} data-testid="solution-body">
                <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-[40px]" data-testid="text-solution-title">{s.title}</h1>
                <RichText text={s.introduction} className="mt-4 text-[17px] text-foreground/90" />

                <ol className="relative mt-10 space-y-6">
                  <span aria-hidden className="absolute bottom-6 left-[15px] top-6 w-px bg-accent/30" />
                  {s.steps.map((st, i) => (
                    <li key={i} data-testid={`step-${i}`}
                      className={`relative rounded-2xl py-4 pl-12 pr-3 transition-colors duration-300 sm:pr-5 ${activeStep === i && panel.open ? "bg-highlight/90" : ""}`}>
                      <span className="absolute left-0 top-4 grid h-8 w-8 place-items-center rounded-full border border-accent/40 bg-background text-xs text-accent">{i + 1}</span>
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                        <h2 className="font-display text-xl font-semibold leading-snug">{st.title}</h2>
                        <button onClick={() => { setActiveStep(i); runExplain(`${st.kind === "concept" ? "Idea" : "Step"} ${i + 1}: ${st.title}\n${st.content}${st.equation ? `\n${st.equation}` : ""}`); }}
                          data-testid={`button-explain-step-${i}`} aria-label={`${st.kind === "concept" ? "Explain concept" : "Explain step"} ${i + 1}: ${st.title}`}
                          className="select-none rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          {st.kind === "concept" ? "Explain concept" : "Explain step"}
                        </button>
                      </div>
                      <RichText text={st.content} className="mt-1 text-[16px] text-foreground/85" />
                      {st.equation && <Equation tex={st.equation} className="equation-flow mt-4 min-w-0 text-[1.05rem] sm:text-lg" />}
                    </li>
                  ))}
                </ol>

                <FinalAnswer answer={s.answer} />
              </div>
            </article>
          )}
        </div>

        {/* composer */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background/90 to-transparent pb-4 pt-10 lg:pl-[268px]">
          <div className="pointer-events-auto mx-4 max-w-[720px] sm:mx-8 lg:mx-auto xl:ml-auto xl:mr-[max(2rem,calc((100vw-268px-720px-420px)/2+420px))] 2xl:mx-auto">
            {(attachment || attachError || pickerHint) && (
              <div className="mb-2 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm" data-testid="panel-attachment" aria-live="polite">
                {attachment ? (
                  <>
                    <img src={attachment.url} alt="Attached problem preview" className="h-12 w-12 rounded-md border border-border object-cover" data-testid="img-attachment-preview" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{attachment.file.name}</p>
                      <p className="text-xs text-muted-foreground">{(attachment.file.size / 1048576).toFixed(1)} MB · {solving && !solving.error && solving.picture ? "Uploading and reading…" : "Add a note below if you like, then send."}</p>
                    </div>
                    <button type="button" onClick={removeAttachment} disabled={!!solving && !solving.error} aria-label="Remove picture" data-testid="button-remove-attachment" className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"><X className="h-4 w-4" /></button>
                  </>
                ) : attachError ? (
                  <>
                    <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                    <p className="flex-1 text-destructive" data-testid="status-attach-error">{attachError}</p>
                    <button type="button" onClick={() => { setAttachError(null); fileRef.current?.click(); }} data-testid="button-choose-again" className="rounded-full px-3 py-1 text-xs hover:bg-muted">Choose another</button>
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4 shrink-0 text-accent" />
                    <p className="flex-1 text-muted-foreground" data-testid="text-login-needed">Log in to send a picture. Typed questions work without an account, and your draft is kept.</p>
                    <button type="button" onClick={login} data-testid="button-login-picker" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground"><LogIn className="h-3.5 w-3.5" /> Log in</button>
                    <button type="button" onClick={() => setPickerHint(false)} aria-label="Dismiss" data-testid="button-dismiss-login" className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
                  </>
                )}
              </div>
            )}
          <form onSubmit={(e) => { e.preventDefault(); void submit(); }}
            className="flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-[0_18px_40px_-24px_hsl(226_42%_17%/0.45)] focus-within:border-accent/60">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden
              onChange={(e) => pickFile(e.target.files?.[0])} data-testid="input-picture" />
            <button type="button" onClick={onAttachClick} disabled={auth.isLoading || (!!solving && !solving.error)}
              aria-label={auth.isAuthenticated ? "Attach a picture of the problem" : "Attach a picture (log in required)"} data-testid="button-attach-picture"
              className="mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-accent disabled:opacity-40">
              <ImagePlus className="h-4 w-4" />
            </button>
            <label htmlFor="q" className="sr-only">Question</label>
            <textarea id="q" ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={12000} rows={1}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }}
              placeholder={attachment ? "Optional: which part should I solve?" : "A problem, derivation or theory question, e.g. why is entropy a state function?"}
              data-testid="input-question"
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2.5 text-[15px] outline-none placeholder:text-muted-foreground/70" />
            <button type="submit" disabled={(!draft.trim() && !attachment) || (!!solving && !solving.error)} aria-label="Solve" data-testid="button-solve"
              className="mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition hover:scale-105 disabled:scale-100 disabled:opacity-35">
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
          </div>
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
            <MessageSquareQuote className="h-4 w-4 text-primary-label" /> Explain
          </motion.button>
        )}
      </AnimatePresence>

      <ExplainPanel s={panel} onClose={closePanel} onRetry={() => runExplain(panel.quote, panel.mode)} onMode={(m) => runExplain(panel.quote, m)} />
    </div>
  );
}

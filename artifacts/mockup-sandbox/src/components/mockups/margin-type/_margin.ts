import type { MathSolution } from "./_stubs";

export type SavedProblem = { id: string; question: string; solution: MathSolution; createdAt: number };

const KEY = "margin.design-preview.history.v1";

function isSolution(s: unknown): s is MathSolution {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o.title === "string" && typeof o.subject === "string" && typeof o.introduction === "string" &&
    typeof o.answer === "string" && Array.isArray(o.steps) &&
    o.steps.every((st) => st && typeof st === "object" && typeof (st as Record<string, unknown>).title === "string" &&
      typeof (st as Record<string, unknown>).content === "string" && typeof (st as Record<string, unknown>).equation === "string")
  );
}

export function loadHistory(): SavedProblem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is SavedProblem =>
      !!p && typeof p === "object" && typeof (p as SavedProblem).id === "string" &&
      typeof (p as SavedProblem).question === "string" && typeof (p as SavedProblem).createdAt === "number" &&
      isSolution((p as SavedProblem).solution));
  } catch {
    return [];
  }
}

export function saveHistory(items: SavedProblem[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, 50)));
    return true;
  } catch {
    return false;
  }
}

export function serializeSolution(q: string, s: MathSolution): string {
  const steps = s.steps
    .map((st, i) => `Step ${i + 1}: ${st.title}\n${st.content}${st.equation ? `\n$$${st.equation}$$` : ""}`)
    .join("\n\n");
  return `Question: ${q}\n\n${s.title} (${s.subject})\n\n${s.introduction}\n\n${steps}\n\nAnswer: ${s.answer}`;
}

export const EXAMPLE_QUESTION = "Solve for x: 2x^2 - 5x - 3 = 0";

export const EXAMPLE_SOLUTION: MathSolution = {
  title: "Solving a quadratic by factoring",
  subject: "Algebra",
  introduction:
    "We want the values of $x$ that make $2x^2 - 5x - 3$ equal to zero. Because the leading coefficient is not 1, we use the **AC method** to split the middle term, then factor by grouping.",
  steps: [
    {
      title: "Find the product a·c",
      content: "Identify $a = 2$, $b = -5$, $c = -3$. Multiply the first and last coefficients.",
      equation: "a \\cdot c = 2 \\cdot (-3) = -6",
    },
    {
      title: "Split the middle term",
      content: "Look for two numbers that multiply to $-6$ and add to $b = -5$. Those are $-6$ and $1$, so rewrite $-5x$ as $-6x + x$.",
      equation: "2x^2 - 6x + x - 3 = 0",
    },
    {
      title: "Factor by grouping",
      content: "Pull the common factor out of each pair. Both groups share $(x - 3)$, which we then factor out.",
      equation: "2x(x - 3) + 1(x - 3) = (2x + 1)(x - 3) = 0",
    },
    {
      title: "Apply the zero-product property",
      content: "A product is zero only when at least one factor is zero, so set each factor equal to zero and solve.",
      equation: "2x + 1 = 0 \\Rightarrow x = -\\tfrac{1}{2} \\qquad x - 3 = 0 \\Rightarrow x = 3",
    },
  ],
  answer: "$x = -\\tfrac{1}{2}$ or $x = 3$",
};

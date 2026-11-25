import type { MathSolution } from "@workspace/api-client-react";

export type SavedProblem = { id: string; question: string; solution: MathSolution; createdAt: number };

const KEY = "margin.history.v1";

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
  title: "Solving a Quadratic by Factoring",
  subject: "Algebra",
  introduction:
    "Use the **AC method** to split the middle term, then factor by grouping.",
  steps: [
    {
      title: "Find the Product a·c",
      content: "With $a = 2$ and $c = -3$, find $ac$.",
      equation: "a \\cdot c = 2 \\cdot (-3) = -6",
    },
    {
      title: "Split the Middle Term",
      content: "Use $-6$ and $1$: their product is $-6$ and their sum is $-5$.",
      equation: "2x^2 - 6x + x - 3 = 0",
    },
    {
      title: "Factor Each Group",
      content: "Factor the first two terms and the last two terms separately.",
      equation: "2x(x - 3) + 1(x - 3) = 0",
    },
    {
      title: "Pull Out the Shared Factor",
      content: "Both groups contain $(x - 3)$.",
      equation: "(2x + 1)(x - 3) = 0",
    },
    {
      title: "Solve the First Factor",
      content: "Apply the **zero-product property** to $2x + 1$.",
      equation: "2x + 1 = 0 \\Rightarrow x = -\\tfrac{1}{2}",
    },
    {
      title: "Solve the Second Factor",
      content: "Set the other factor to zero.",
      equation: "x - 3 = 0 \\Rightarrow x = 3",
    },
  ],
  answer: "$x = -\\tfrac{1}{2}$ or $x = 3$",
};

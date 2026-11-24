export type ExplanationInputMode = "auto" | "step" | "concept";
export type MathExplanation = {
  title: string; explanation: string; takeaway: string; kind?: "step" | "concept" | "mixed";
};
export type MathSolution = {
  title: string; subject: string; introduction: string; answer: string;
  steps: { title: string; content: string; equation: string; kind?: "calculation" | "concept" }[];
  interpretedQuestion?: string; problemType?: "worked" | "conceptual" | "mixed";
};
export const PREVIEW_EXPLANATION: MathExplanation = {
  title: "Why split the middle term?",
  explanation: "We’re rewriting the same expression in a way that makes its factors easier to see.\n\nThe two numbers need to multiply to $a\\cdot c=-6$ and add to $b=-5$. The pair $-6$ and $1$ satisfies both conditions.\n\nSo $-5x$ becomes $-6x+x$. Nothing has changed mathematically—we’ve just made it possible to factor the terms in two groups.",
  takeaway: "An equivalent expression can reveal structure that was difficult to see before.",
  kind: "concept",
};
export function useExplainMath() {
  return { mutateAsync: async (_input: { data: { question: string; solution: string; selectedText: string; mode?: ExplanationInputMode } }) => PREVIEW_EXPLANATION };
}
export function useSolveMath() {
  return { mutateAsync: async (_input: { data: { question: string; imagePath?: string } }): Promise<MathSolution> => {
    throw new Error("This is a visual preview. Your working app is unchanged.");
  } };
}
export function useRequestUploadUrl() {
  return { mutateAsync: async (_input: { data: { name: string; size: number; contentType: string } }): Promise<{ uploadURL: string; objectPath: string }> => {
    throw new Error("Uploads are available in the working app, not this visual preview.");
  } };
}
export function useAuth() {
  return {
    user: null as { firstName?: string; email?: string } | null,
    isLoading: false, isAuthenticated: false,
    login: () => {}, logout: () => {},
  };
}

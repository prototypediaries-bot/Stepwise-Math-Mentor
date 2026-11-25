import { RichText } from "@/components/rich-text";

export function FinalAnswer({ answer }: { answer: string }) {
  return (
    <section
      id="final-answer"
      aria-labelledby="final-answer-heading"
      className="mt-10 rounded-2xl bg-primary px-6 py-6 text-primary-foreground sm:px-7"
      data-testid="text-answer"
    >
      <h2
        id="final-answer-heading"
        className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-label"
      >
        Final Answer
      </h2>
      <RichText text={answer} className="answer-summary mt-4" />
    </section>
  );
}
